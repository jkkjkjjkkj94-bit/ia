import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const SUPABASE_URL='https://innziuzgtpfsiywqmies.supabase.co';
const SUPABASE_KEY='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
const sbSync=createClient(SUPABASE_URL,SUPABASE_KEY);
const saveBtn=document.getElementById('aiConfigSave');
const keyEl=document.getElementById('aiConfigKey');
const valueEl=document.getElementById('aiConfigValue');
function toastSync(text,ms=4200){const el=document.getElementById('toast');if(!el)return;el.textContent=text;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),ms)}
saveBtn?.addEventListener('click',async()=>{
  const key=keyEl?.value||'';
  if(key!=='synonyms')return;
  await new Promise(r=>setTimeout(r,900));
  let value;
  try{value=JSON.parse(valueEl?.value||'{}')}catch{return}
  try{
    const{data:{session},error:sessionError}=await sbSync.auth.getSession();
    if(sessionError)throw sessionError;
    if(!session?.access_token)throw new Error('Sessão administrativa não encontrada.');
    const response=await fetch(`${SUPABASE_URL}/functions/v1/sync-ai-engine`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':`Bearer ${session.access_token}`,
        'apikey':SUPABASE_KEY
      },
      body:JSON.stringify({config_key:key,config_value:value})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error||`Falha HTTP ${response.status}`);
    if(data?.error)throw new Error(data.error);
    toastSync(data?.commit_sha?'Sinônimos salvos e ai-engine.js atualizado.':'Sinônimos sincronizados.');
  }catch(err){
    console.error('[Local AI Sync]',err);
    toastSync(`Sinônimos salvos no banco, mas a sincronização com o GitHub falhou: ${err?.message||'erro desconhecido'}`,6000);
  }
});
