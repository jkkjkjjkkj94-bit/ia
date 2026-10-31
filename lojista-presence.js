import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
async function touch(){const{data:{session}}=await sb.auth.getSession();if(!session)return;await sb.from('local_ai_profiles').update({last_seen_at:new Date().toISOString()}).eq('user_id',session.user.id)}
await touch();sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)setTimeout(touch,50)});
import('./lojista-store-group.js?v=1').catch(err=>console.error('[Store Group Loader]',err));