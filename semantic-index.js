import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';

const sb=createClient('https://ccsypggvelcxsqszepfs.supabase.co','sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG');
let running=false;

async function indexMissing(rounds=3){
  if(running)return;
  const{data:{session}}=await sb.auth.getSession();
  if(!session)return;
  running=true;
  try{
    for(let i=0;i<rounds;i++){
      const{data,error}=await sb.functions.invoke('embed-missing',{body:{limit:60,target:'all'}});
      if(error){console.warn('BuscaIA semantic index:',error);break;}
      if(!data?.processed)break;
      await new Promise(r=>setTimeout(r,250));
    }
  }finally{running=false;}
}

async function boot(){
  const{data:{session}}=await sb.auth.getSession();
  if(session&&!sessionStorage.getItem('buscaia_semantic_indexed')){
    sessionStorage.setItem('buscaia_semantic_indexed','1');
    indexMissing(3);
  }
}

await boot();
sb.auth.onAuthStateChange((_event,session)=>{
  if(session){sessionStorage.removeItem('buscaia_semantic_indexed');setTimeout(()=>indexMissing(3),500);}
});

const form=document.getElementById('kForm');
if(form)form.addEventListener('submit',()=>setTimeout(()=>indexMissing(1),1200));

const importInfo=document.getElementById('importInfo');
if(importInfo){
  const obs=new MutationObserver(()=>{
    if(/conclu|importad|finaliz/i.test(importInfo.textContent||''))setTimeout(()=>indexMissing(3),500);
  });
  obs.observe(importInfo,{childList:true,subtree:true,characterData:true});
}
