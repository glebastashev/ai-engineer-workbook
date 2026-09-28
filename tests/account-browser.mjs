import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/glebastasev/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/Users/glebastasev/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const url='http://127.0.0.1:4192/outputs/cloud-preview/';
const users=new Map([
 ['alice@example.test',{id:'11111111-1111-4111-8111-111111111111',email:'alice@example.test',data:{},active:true}],
 ['bob@example.test',{id:'22222222-2222-4222-8222-222222222222',email:'bob@example.test',data:{},active:true}],
]);
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=user=>encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',email:user.email})+'.testsignature';
const context=await browser.newContext({viewport:{width:1440,height:1000}});let failWrites=false;
await context.route('https://workbook.supabase.invalid/**',async route=>{
 const r=route.request(),path=new URL(r.url()).pathname,body=r.postDataJSON();
 const respond=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(path.endsWith('/token')){
  const user=users.get(body.email);if(!user||body.password!=='test-password-12345')return respond({msg:'Invalid login credentials'},400);
  return respond({access_token:token(user),refresh_token:'test-refresh-'+user.id,expires_in:3600,token_type:'bearer',user:{id:user.id,email:user.email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}});
 }
 if(path.endsWith('/logout')||path.endsWith('/recover'))return respond({});
 const jwt=(r.headers().authorization||'').slice(7);let uid;try{uid=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url')).sub}catch{}
 const user=[...users.values()].find(x=>x.id===uid);
 if(!user)return respond({message:'SIGN_IN_REQUIRED'},401);
 if(!user.active)return respond({message:'ACCESS_CLOSED',code:'42501'},403);
 if(path.endsWith('/save_intro_workbook')){
  if(failWrites)return respond({message:'Network temporarily unavailable'},503);
  user.data={...user.data,...body.p_patch};return respond({data:user.data,updatedAt:new Date().toISOString()});
 }
 if(path.endsWith('/open_intro_workbook'))return respond({data:user.data,updatedAt:new Date().toISOString()});
 return respond({message:'Unexpected test endpoint '+path},500);
});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const login=async email=>{await page.getByLabel('Почта',{exact:true}).fill(email);await page.getByLabel('Пароль',{exact:true}).fill('test-password-12345');await page.getByRole('button',{name:'Открыть тетрадь'}).click();await page.locator('#reason').waitFor()};
const saved=()=>page.getByRole('status').filter({hasText:'Сохранено в аккаунте'}).waitFor();
try{
 await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Моя рабочая тетрадь'}).waitFor();
 await page.screenshot({path:'outputs/account-login.png'});
 await login('alice@example.test');
 await page.locator('#reason').fill('Научиться создавать сайты');await page.getByRole('checkbox',{name:'Первый вступительный урок просмотрен'}).check();await saved();
 await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await login('alice@example.test');
 assert.equal(await page.locator('#reason').inputValue(),'Научиться создавать сайты');assert.equal(await page.getByRole('checkbox',{name:'Первый вступительный урок просмотрен'}).isChecked(),true);
 console.log('PASS: sign in restores saved answers after browser storage is cleared (test API).');
 await page.getByRole('button',{name:'Выйти',exact:true}).click();await page.getByLabel('Почта',{exact:true}).waitFor();await login('bob@example.test');assert.equal(await page.locator('#reason').inputValue(),'');
 console.log('PASS: another account sees its own blank worksheet.');
 await page.getByRole('button',{name:'Выйти',exact:true}).click();await page.getByLabel('Почта',{exact:true}).waitFor();
 await page.evaluate(()=>{localStorage.setItem('ai-factory:intro-workbook:v1:courseGoal',JSON.stringify('Ответ из прежней версии'));localStorage.setItem('ai-factory:intro-workbook:v1:reason',JSON.stringify('Старый текст'))});
 await login('alice@example.test');await page.getByRole('button',{name:'Перенести мои ответы'}).click();await saved();
 assert.equal(await page.locator('#courseGoal').inputValue(),'Ответ из прежней версии');assert.equal(await page.locator('#reason').inputValue(),'Научиться создавать сайты');
 assert.equal(await page.evaluate(()=>localStorage.getItem('ai-factory:intro-workbook:v1:reason')),JSON.stringify('Старый текст'),'Import must not delete conflicting old answers');
 console.log('PASS: importing old browser answers fills missing fields without overwriting account answers.');
 failWrites=true;await page.locator('#firstStep').fill('Новый шаг при сбое связи');await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('status').innerText(),'Не сохранено');
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#firstStep').inputValue(),'Новый шаг при сбое связи');await page.getByRole('alert').waitFor();failWrites=false;
 await page.getByRole('button',{name:'Попробовать ещё раз'}).click();await saved();assert.equal(users.get('alice@example.test').data.firstStep,'Новый шаг при сбое связи');
 console.log('PASS: failure keeps account-specific draft and retry saves it.');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/account-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 users.get('alice@example.test').active=false;await page.reload({waitUntil:'networkidle'});await page.getByRole('alert').waitFor();assert.equal(await page.locator('#reason').count(),0);assert.match(await page.getByRole('alert').innerText(),/Доступ к тетради закрыт/);
 assert.deepEqual(errors,[]);console.log('PASS: mobile layout and blocked-access state.');
}finally{await browser.close()}
