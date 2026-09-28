import {useEffect,useRef,useState} from 'react';
import type {SupabaseClient,User} from '@supabase/supabase-js';
import {createCloudWorkbook} from './cloud-sync.mjs';
import {loadAnswers} from './storage.mjs';
export function useCloudWorksheet(client:SupabaseClient,user:User){
 const [state,setState]=useState({answers:{} as Record<string,string|boolean>,ready:false,status:'loading',error:''});
 const [legacy,setLegacy]=useState<Record<string,string|boolean>>({});
 const [importBusy,setImportBusy]=useState(false);
 const book=useRef<ReturnType<typeof createCloudWorkbook>|null>(null);
 useEffect(()=>{
  let storage:Storage|undefined;try{storage=window.localStorage}catch{}
  const instance=createCloudWorkbook({userId:user.id,storage,onChange:setState,api:{
   load:async()=>{const {data,error}=await client.rpc('open_intro_workbook');if(error)throw error;return data},
   save:async(patch:Record<string,string|boolean>)=>{const {data,error}=await client.rpc('save_intro_workbook',{p_patch:patch});if(error)throw error;return data},
  }});
  book.current=instance;void instance.load();
  try{if(storage){const old=loadAnswers(storage);const imported=storage.getItem('ai-factory:intro-imported:v2');if(imported!==JSON.stringify(old))setLegacy(old)}}catch{}
  const retry=()=>{void instance.retry()};
  const leave=(event:BeforeUnloadEvent)=>{if(instance.dirty){event.preventDefault();event.returnValue=''}};
  window.addEventListener('online',retry);window.addEventListener('beforeunload',leave);
  return()=>{instance.destroy();book.current=null;window.removeEventListener('online',retry);window.removeEventListener('beforeunload',leave)};
 },[client,user.id]);
 const importLegacy=async()=>{
  const current=book.current;if(!current?.state.ready)return;setImportBusy(true);
  // Import only missing fields; never replace answers already present in the account.
  for(const [key,value]of Object.entries(legacy))if(!(key in current.state.answers))current.update(key,value);
  const success=await current.flush();
  if(success&&!current.dirty){
   try{localStorage.setItem('ai-factory:intro-imported:v2',JSON.stringify(legacy))}catch{}
   setLegacy({});
  }
  setImportBusy(false);
 };
 return{...state,update:(key:string,value:string|boolean)=>book.current?.update(key,value),retry:()=>book.current?.retry(),legacyCount:Object.keys(legacy).length,importLegacy,importBusy};
}
