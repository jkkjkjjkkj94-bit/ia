import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const SUPABASE_URL='https://innziuzgtpfsiywqmies.supabase.co';
const SUPABASE_KEY='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
const sbSync=createClient(SUPABASE_URL,SUPABASE_KEY);
const saveBtn=document.getElementById('aiConfigSave');
const keyEl=document.getElementById('aiConfigKey');
const valueEl=document.getElementById('aiConfigValue');
function toastSync(text,ms=3600){const el=document.getElementById('toast');if(!el)return;el.textContent=text;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),ms)}
saveBtn?.addEventListener('click',async()=>{
  const key=keyEl?.value||'';
  if(key!=='synonyms')return;
  await new Promise(r=>setTimeout(r,800));
  let value;
  try{value=JSON.parse(valueEl?.value||'{}')}catch{return}
  try{
    const{data,error}=await sbSync.functions.invoke('sync-ai-engine',{body:{config_key:key,config_value:value}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    toastSync(data?.commit_sha?'Sinônimos salvos e ai-engine.js atualizado.':'Sinônimos sincronizados.');
  }catch(err){
    console.error('[Local AI Sync]',err);
    toastSync('Sinônimos salvos no banco, mas a sincronização com o GitHub falhou.',4500);
  }
});
