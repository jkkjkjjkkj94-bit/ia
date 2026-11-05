import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let starting=false,started=false;
async function loadAdminModules(){
const load=async(path,label)=>{try{return await import(path)}catch(err){console.error(`[GURU Admin] ${label}`,err);return null}};
await load('./admin-ai-editor.js?v=3','AI Editor');
await load('./admin-store-group.js?v=4','Store Group');
await load('./admin-pending-core.js?v=5','Pending Stores');
await load('./admin-synonym-suggestions.js?v=2','Synonym Suggestions');
await load('./guru-quality-admin.js?v=2','Quality');
await load('./admin-delete-controls.js?v=1','Delete Controls');
await load('./admin-merchant-enhancements.js?v=3','Merchant Management');
await load('./admin-taxonomy-db.js?v=2','Taxonomy');
await load('./admin-ui.js?v=3','Admin Interface');
window.GuruAdminRuntimeV2={ready:true};
}
async function boot(sessionOverride=null){
 if(starting||started)return;
 const nav=document.querySelector('.panel-nav');
 try{
  starting=true;
  const session=sessionOverride||(await sb.auth.getSession()).data?.session;if(!session)return;
  const{data:profile,error:profileError}=await sb.from('local_ai_profiles').select('role').eq('user_id',session.user.id).maybeSingle();if(profileError)throw profileError;if(profile?.role!=='admin')return;
  if(nav){nav.style.visibility='hidden';nav.style.opacity='0';nav.style.pointerEvents='none'}
  document.body.classList.add('admin-menu-booting');
  await loadAdminModules();
  window.dispatchEvent(new CustomEvent('guru-admin-modules-ready'));
  await wait(60);
  if(nav){nav.style.visibility='visible';nav.style.opacity='1';nav.style.pointerEvents='auto'}
  document.body.classList.remove('admin-menu-booting');document.body.classList.add('admin-menu-ready');
  started=true;
 }catch(err){
  if(nav){nav.style.visibility='visible';nav.style.opacity='1';nav.style.pointerEvents='auto'}
  document.body.classList.remove('admin-menu-booting');console.error('[GURU Admin Post Login Loader]',err);
 }finally{starting=false}
}
boot();
sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)setTimeout(()=>boot(session),0)});
