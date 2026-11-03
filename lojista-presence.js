import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
async function touch(){try{const{data:{session},error}=await sb.auth.getSession();if(error||!session)return;await sb.from('local_ai_profiles').update({last_seen_at:new Date().toISOString()}).eq('user_id',session.user.id)}catch(err){console.warn('[Lojista Presence]',err)}}
await touch();
sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)setTimeout(touch,50)});
import('./lojista-review-summary.js?v=1').catch(err=>console.error('[Review Summary Loader]',err));
