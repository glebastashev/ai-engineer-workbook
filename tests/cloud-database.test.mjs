import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const file='supabase/migrations/202609280001_intro_workbooks.sql';
test('database migrations define protected personal workbooks',()=>assert.ok(existsSync(file),'Account-backed storage migration is missing'));
if(existsSync(file)) {
 const db=new PGlite();
 await db.exec(`create schema auth; create role anon; create role authenticated;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 insert into auth.users values ('${alice}'),('${bob}');`);
 await db.exec(readFileSync(file,'utf8'));
 async function as(user,query,params=[]){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec(`set role ${user?'authenticated':'anon'}`);return db.query(query,params)}
 test('only the signed-in learner can open a workbook',async()=>{
  await assert.rejects(as(null,'select public.open_intro_workbook()'));
  assert.deepEqual((await as(alice,'select public.open_intro_workbook() as book')).rows[0].book.data,{});
 });
 test('answers survive a new session, and another learner cannot read them',async()=>{
  await as(alice,'select public.save_intro_workbook($1::jsonb)',[JSON.stringify({reason:'Моя личная цель',programRead:true})]);
  assert.deepEqual((await as(bob,'select public.open_intro_workbook() as book')).rows[0].book.data,{});
  assert.deepEqual((await as(alice,'select public.open_intro_workbook() as book')).rows[0].book.data,{reason:'Моя личная цель',programRead:true});
  assert.equal((await as(bob,'select * from public.intro_workbooks where user_id=$1',[alice])).rows.length,0);
 });
 test('patches preserve independent edits; empty text and false are real answers',async()=>{
  await as(alice,'select public.save_intro_workbook($1::jsonb)',[JSON.stringify({courseGoal:'Учебный сайт'})]);
  await as(alice,'select public.save_intro_workbook($1::jsonb)',[JSON.stringify({reason:'',programRead:false})]);
  const data=(await as(alice,'select public.open_intro_workbook() as book')).rows[0].book.data;
  assert.deepEqual(data,{reason:'',programRead:false,courseGoal:'Учебный сайт'});
 });
 test('one learner cannot overwrite another learner or enable their own access',async()=>{
  const r=await as(bob,"update public.intro_workbooks set data='{}' where user_id=$1 returning *",[alice]);assert.equal(r.rows.length,0);
  await assert.rejects(as(bob,'update public.intro_workbooks set user_id=$1 where user_id=$2',[alice,bob]));
  await assert.rejects(as(bob,'update public.intro_workbooks set active=true'));
  await assert.rejects(as(bob,'delete from public.intro_workbooks'));
 });
 test('bad data cannot enter through RPC or a direct table update',async()=>{
  for(const patch of [{unknown:'x'},{programRead:'yes'},{reason:null},{reason:'x'.repeat(4001)},[]]) await assert.rejects(as(alice,'select public.save_intro_workbook($1::jsonb)',[JSON.stringify(patch)]));
  await assert.rejects(as(alice,"update public.intro_workbooks set data='[1]'"));
 });
 test('closing access blocks reading and writing without deleting answers',async()=>{
  await db.exec('reset role');await db.query('update public.intro_workbooks set active=false where user_id=$1',[alice]);
  await assert.rejects(as(alice,'select public.open_intro_workbook()'),/ACCESS_CLOSED/);
  await assert.rejects(as(alice,'select public.save_intro_workbook($1::jsonb)',[JSON.stringify({reason:'Overwrite'})]),/ACCESS_CLOSED/);
  await db.exec('reset role');await db.query('update public.intro_workbooks set active=true where user_id=$1',[alice]);
  const data=(await as(alice,'select public.open_intro_workbook() as book')).rows[0].book.data;
  assert.equal(data.courseGoal,'Учебный сайт');
 });
 test.after(async()=>db.close());
}
