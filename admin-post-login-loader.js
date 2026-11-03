import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function waitForMenuModules(timeout=4500){
 const started=Date.now();
 const required=['pendingStores','taxonomyDb','synonymSuggestions'];
 while(Date.now()-started<timeout){
  const nav=document.querySelector('.panel-nav');
  if(nav&&required.every(id=>nav.querySelector(`[data-view="${id}"]`)))return true;
  await wait(80);
 }
 return false;
}
async function boot(){
  try{
    const{data:{session}}=await sb.auth.getSession();
    if(!session)return;
    const{data:profile}=await sb.from('local_ai_profiles').select('role').eq('user_id',session.user.id).maybeSingle();
    if(profile?.role!=='admin')return;
    const nav=document.querySelector('.panel-nav');
    if(nav){nav.style.visibility='hidden';nav.style.opacity='0';nav.style.pointerEvents='none'}
    document.body.classList.add('admin-menu-booting');
    await import('./admin-ai-editor.js?v=2');
    await waitForMenuModules();
    window.dispatchEvent(new CustomEvent('guru-admin-modules-ready'));
    await wait(40);
    if(nav){nav.style.visibility='visible';nav.style.opacity='1';nav.style.pointerEvents='auto'}
    document.body.classList.remove('admin-menu-booting');
    document.body.classList.add('admin-menu-ready');
  }catch(err){
    const nav=document.querySelector('.panel-nav');
    if(nav){nav.style.visibility='visible';nav.style.opacity='1';nav.style.pointerEvents='auto'}
    document.body.classList.remove('admin-menu-booting');
    console.error('[GURU Admin Post Login Loader]',err);
  }
}
boot();
