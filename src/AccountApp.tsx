import {useEffect,useState} from 'react';
import type {SupabaseClient,User} from '@supabase/supabase-js';
import {ArrowRight,LockKeyhole,Mail} from 'lucide-react';
import {WorksheetView} from './worksheet';
import {useCloudWorksheet} from './useCloudWorksheet';
import {appUrl} from './cloud-client';
import s from './account.module.css';

function AccountWorkbook({client,user}:{client:SupabaseClient;user:User}){
 const workbook=useCloudWorksheet(client,user);
 return <WorksheetView workbook={workbook} account={user.email||'Мой аккаунт'} signOut={async()=>{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error}}/>;
}
function authMessage(error:unknown){
 const message=(error as {message?:string})?.message||'';
 if(/invalid.login.credentials/i.test(message))return 'Проверь почту и пароль.';
 if(/email.not.confirmed/i.test(message))return 'Подтверди почту по ссылке из письма, затем войди.';
 if(/rate.limit|too.many|security.purposes/i.test(message))return 'Слишком много попыток. Подожди несколько минут и попробуй снова.';
 if(/password.*least|weak.password/i.test(message))return 'Используй пароль длиной не менее 12 символов.';
 if(/fetch|network/i.test(message))return 'Нет соединения. Проверь интернет и попробуй снова.';
 return 'Не удалось выполнить действие. Попробуй ещё раз или обратись к организатору.';
}
export default function AccountApp({client}:{client:SupabaseClient}){
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true);
 const [mode,setMode]=useState<'login'|'signup'|'reset'|'recovery'>('login');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{
  const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
   setUser(session?.user??null);setLoading(false);
   if(event==='PASSWORD_RECOVERY')setMode('recovery');
   if(event==='SIGNED_OUT'){setMode('login');setPassword('');setRepeat('')}
  });
  return()=>subscription.unsubscribe();
 },[client]);
 function change(next:typeof mode){setMode(next);setError('');setNotice('');setPassword('');setRepeat('')}
 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   if(mode==='login'){
    const {error}=await client.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;
   }else if(mode==='signup'){
    if(password!==repeat)throw new Error('PASSWORD_MISMATCH');
    const {data,error}=await client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:appUrl()}});if(error)throw error;
    if(!data.session)setNotice('Открой письмо и подтверди почту по ссылке. После этого войди в тетрадь.');
   }else if(mode==='reset'){
    const {error}=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:appUrl()});if(error)throw error;
    setNotice('Если аккаунт с этой почтой существует, придёт письмо со ссылкой для восстановления. Сохранённые ответы останутся в аккаунте.');
   }else{
    if(password!==repeat)throw new Error('PASSWORD_MISMATCH');
    const {error}=await client.auth.updateUser({password});if(error)throw error;setPassword('');setRepeat('');setMode('login');
   }
  }catch(e){setError((e as Error).message==='PASSWORD_MISMATCH'?'Пароли не совпадают.':authMessage(e))}finally{setBusy(false)}
 }
 if(!loading&&user&&mode!=='recovery')return <AccountWorkbook key={user.id} client={client} user={user}/>;
 return <div className={s.page}><header><img src="./brand/ai-factory-logo.jpg" alt="AI Factory"/></header><main className={s.card}>
  <div className={s.icon}><LockKeyhole size={24}/></div>
  <p className={s.label}>AI-инженер · Вступительный модуль</p>
  <h1>{loading?'Открываем аккаунт…':mode==='signup'?'Создать аккаунт':mode==='reset'?'Восстановить доступ':mode==='recovery'?'Новый пароль':'Моя рабочая тетрадь'}</h1>
  <p>{mode==='reset'?'Укажи почту своего аккаунта. Пришлём ссылку для смены пароля.':'Сохранённые ответы останутся в аккаунте после очистки браузера. Можно продолжить с другого устройства.'}</p>
  {!loading&&<><div className={s.tabs}>{mode!=='recovery'&&<><button type="button" onClick={()=>change('login')} aria-pressed={mode==='login'}>Войти</button><button type="button" onClick={()=>change('signup')} aria-pressed={mode==='signup'}>Создать аккаунт</button></>}</div>
  <form onSubmit={submit}>
   {mode!=='recovery'&&<label>Почта<input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>}
   {mode!=='reset'&&<label>{mode==='recovery'?'Новый пароль':'Пароль'}<input autoComplete={mode==='login'?'current-password':'new-password'} type="password" required minLength={mode==='login'?1:12} maxLength={200} value={password} onChange={e=>setPassword(e.target.value)}/>{mode!=='login'&&<small>Не менее 12 символов.</small>}</label>}
   {(mode==='signup'||mode==='recovery')&&<label>Повтори пароль<input autoComplete="new-password" type="password" required value={repeat} onChange={e=>setRepeat(e.target.value)}/></label>}
   {error&&<p role="alert" className={s.error}>{error}</p>}
   {notice&&<p role="status" className={s.notice}><Mail size={18}/>{notice}</p>}
   <button className={s.submit} disabled={busy}>{busy?'Подожди…':mode==='signup'?'Создать аккаунт':mode==='reset'?'Отправить ссылку':mode==='recovery'?'Сохранить новый пароль':'Открыть тетрадь'}<ArrowRight size={19}/></button>
  </form>
  {mode==='login'&&<button className={s.reset} type="button" onClick={()=>change('reset')}>Не помню пароль</button>}
  {mode==='signup'&&<small className={s.help}>Если ты уже заполнял тетрадь в этом браузере, после входа можно перенести ответы в аккаунт.</small>}
  </>}
 </main></div>;
}
