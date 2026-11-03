import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
async function boot(){
  try{
    const{data:{session}}=await sb.auth.getSession();
    if(!session)return;
    const{data:profile}=await sb.from('local_ai_profiles').select('role').eq('user_id',session.user.id).maybeSingle();
    if(profile?.role!=='admin')return;
    await import('./admin-ai-editor.js?v=2');
  }catch(err){
    console.error('[GURU Admin Post Login Loader]',err);
  }
}
boot();
