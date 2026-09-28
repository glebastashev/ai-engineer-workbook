import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
export const cloudClient=url&&key?createClient(url,key,{auth:{storageKey:'ai-engineer-account-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const appUrl=()=>new URL('./',window.location.href).href;
