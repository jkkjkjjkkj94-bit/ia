import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const URL='https://innziuzgtpfsiywqmies.supabase.co';
const KEY='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
const sb=createClient(URL,KEY);
const form=document.getElementById('loginForm');
const email=document.getElementById('email');
const password=document.getElementById('password');
const toast=document.getElementById('toast');
function message(t){if(!toast)return;toast.textContent=t;toast.classList.add('on');clearTimeout(window.__adminLoginToast);window.__adminLoginToast=setTimeout(()=>toast.classList.remove('on'),4000)}
async function login(e){
  e.preventDefault();e.stopImmediatePropagation();
  if(!form||form.dataset.loginBusy==='1')return;
  const btn=form.querySelector('button[type="submit"],button:not([type])');
  form.dataset.loginBusy='1';
  if(btn){btn.disabled=true;btn.textContent='Entrando...'}
  try{
    const mail=String(email?.value||'').trim();
    const pass=String(password?.value||'');
    if(!mail||!pass)throw new Error('Informe e-mail e senha.');
    const{data,error}=await sb.auth.signInWithPassword({email:mail,password:pass});
    if(error)throw error;
    const userId=data.user?.id||data.session?.user?.id;
    if(!userId)throw new Error('Sessão administrativa não foi criada.');
    const{data:profile,error:profileError}=await sb.from('local_ai_profiles').select('role').eq('user_id',userId).maybeSingle();
    if(profileError)throw profileError;
    if(profile?.role!=='admin'){
      await sb.auth.signOut();
      throw new Error('Esta conta não possui acesso administrativo.');
    }
    location.reload();
  }catch(err){
    console.error('[GURU Admin Login]',err);
    message(err?.message||'Não foi possível entrar.');
    form.dataset.loginBusy='0';
    if(btn){btn.disabled=false;btn.textContent='Entrar'}
  }
}
form?.addEventListener('submit',login,true);
