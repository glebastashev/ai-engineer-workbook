import {loadEnv} from 'vite';
import {spawnSync} from 'node:child_process';
const config={...loadEnv('production',process.cwd(),'VITE_'),...process.env};
const key=config.VITE_SUPABASE_PUBLISHABLE_KEY||'';
let safeKey=key.startsWith('sb_publishable_')&&key.length>30;
if(key.split('.').length===3){try{safeKey=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon'}catch{}}
if(!safeKey||!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(config.VITE_SUPABASE_URL||'')){
 console.error('Cloud publication requires the real Supabase project URL and a publishable/anon key. Secret and service-role keys must never be bundled.');process.exit(1);
}
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit',env:config});
process.exit(result.status??1);
