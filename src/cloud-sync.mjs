import {validate} from './storage.mjs';
const message = error => /ACCESS_CLOSED/.test(String(error?.message)) ? 'Доступ к тетради закрыт. Записи сохранены. Обратись к организатору, чтобы восстановить доступ.' : /JWT|SIGN_IN_REQUIRED|refresh.token|session/i.test(String(error?.message)) ? 'Нужно снова войти в аккаунт. Твои сохранённые ответы останутся в нём.' : 'Не удалось связаться с хранилищем. Новые ответы пока не сохранены в аккаунте. Проверь соединение и повтори попытку.';
export function createCloudWorkbook({api,storage,userId,onChange=()=>{}}) {
  const draftKey='ai-factory:intro-draft:v2:'+userId;
  let state={answers:{},ready:false,status:'loading',error:''},pending={},timer=null,inFlight=null,closed=false;
  const emit=patch=>{if(closed)return;state={...state,...patch};onChange(state)};
  const backup=()=>{try{if(Object.keys(pending).length)storage?.setItem(draftKey,JSON.stringify(pending));else storage?.removeItem(draftKey)}catch{/* Server remains authoritative; the UI still shows unsaved state. */}};
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>{void flush()},450)}
  async function load(){
    if(closed)return;
    emit({status:'loading',error:''});
    try{
      const result=await api.load();if(closed)return;
      try{const draft=JSON.parse(storage?.getItem(draftKey)||'{}');for(const [key,value]of Object.entries(draft)){validate(key,value);if(!(key in pending))pending[key]=value}}catch{/* Unreadable drafts do not replace server answers. */}
      emit({answers:{...result.data,...pending},ready:true,status:Object.keys(pending).length?'saving':'saved',error:''});
      if(Object.keys(pending).length)schedule();
    }catch(error){emit({status:'error',error:message(error)})}
  }
  function update(key,value){
    if(closed||!state.ready)return;validate(key,value);pending[key]=value;backup();
    emit({answers:{...state.answers,[key]:value},status:'saving',error:''});schedule();
  }
  function flush(){
    clearTimeout(timer);
    if(closed)return Promise.resolve(false);
    if(inFlight)return inFlight;
    if(!Object.keys(pending).length)return Promise.resolve(state.ready);
    const sent={...pending};emit({status:'saving',error:''});
    inFlight=(async()=>{
      try{
        const result=await api.save(sent);if(closed)return false;
        for(const key of Object.keys(sent))if(pending[key]===sent[key])delete pending[key];
        backup();emit({answers:{...result.data,...pending},status:Object.keys(pending).length?'saving':'saved',error:''});
        if(Object.keys(pending).length)schedule();return true;
      }catch(error){emit({status:'error',error:message(error)});return false}
      finally{inFlight=null}
    })();return inFlight;
  }
  return{get state(){return state},get dirty(){return Object.keys(pending).length>0},load,update,flush,retry:()=>state.ready?flush():load(),destroy(){closed=true;clearTimeout(timer)}};
}
