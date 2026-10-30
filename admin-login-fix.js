import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const form=document.getElementById('loginForm');
const title=document.getElementById('loginTitle');
const email=document.getElementById('email');
const password=document.getElementById('password');
const adminModal=document.getElementById('adminModal');
const toastEl=document.getElementById('toast');
function toast(t){if(!toastEl)return;toastEl.textContent=t;toastEl.classList.add('on');clearTimeout(window.__adminLoginToast);window.__adminLoginToast=setTimeout(()=>toastEl.classList.remove('on'),3200)}
function closeModals(){document.querySelectorAll('.modal').forEach(x=>x.classList.remove('on'))}
async function loadAdminPanel(){
 const[s,p]=await Promise.all([
  sb.from('local_ai_stores').select('*').order('created_at',{ascending:false}),
  sb.from('local_ai_products').select('id')
 ]);
 if(s.error)throw s.error;
 if(p.error)throw p.error;
 const stores=s.data||[];
 const products=p.data||[];
 const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
 set('aStores',stores.length);
 set('aPending',stores.filter(x=>x.status==='pending').length);
 set('aActive',stores.filter(x=>x.status==='active'&&x.active).length);
 set('aProducts',products.length);
 const list=document.getElementById('adminStores');
 if(list){
  list.innerHTML=stores.map(x=>`<div class="item"><div class="row"><div><b>${x.name||'Loja sem nome'}</b><div class="meta">${x.category||'Sem categoria'} · ${x.status||'sem status'}</div></div><div>${x.status!=='active'?`<button class="btn sm dark" data-adminapprove="${x.id}">Aprovar</button>`:''} ${x.status!=='suspended'?`<button class="btn sm" data-adminsuspend="${x.id}">Suspender</button>`:''}</div></div></div>`).join('')||'<div class="meta">Nenhuma loja.</div>';
  list.querySelectorAll('[data-adminapprove]').forEach(b=>b.onclick=async()=>{const{error}=await sb.from('local_ai_stores').update({status:'active',active:true,verified:true}).eq('id',b.dataset.adminapprove);if(error)return toast(error.message);toast('Loja aprovada.');await loadAdminPanel()});
  list.querySelectorAll('[data-adminsuspend]').forEach(b=>b.onclick=async()=>{const{error}=await sb.from('local_ai_stores').update({status:'suspended',active:false}).eq('id',b.dataset.adminsuspend);if(error)return toast(error.message);toast('Loja suspensa.');await loadAdminPanel()});
 }
}
if(form){
 form.addEventListener('submit',async e=>{
  if((title?.textContent||'').trim()!=='Administrador')return;
  e.preventDefault();e.stopImmediatePropagation();
  const btn=form.querySelector('button[type="submit"],button:not([type])');
  if(btn){btn.disabled=true;btn.textContent='Entrando...'}
  try{
   const{data,error}=await sb.auth.signInWithPassword({email:email.value.trim(),password:password.value});
   if(error)throw error;
   const userId=data.session?.user?.id;
   if(!userId)throw new Error('Sessão não criada.');
   const{data:profile,error:profileError}=await sb.from('local_ai_profiles').select('user_id,role').eq('user_id',userId).maybeSingle();
   if(profileError)throw profileError;
   if(!profile||profile.role!=='admin'){
    await sb.auth.signOut();
    throw new Error('Esta conta não possui perfil de administrador.');
   }
   await loadAdminPanel();
   closeModals();
   adminModal?.classList.add('on');
   toast('Administrador conectado.');
  }catch(err){
   console.error('[Local AI] admin login:',err);
   toast(err?.message||'Não foi possível entrar como administrador.');
  }finally{
   if(btn){btn.disabled=false;btn.textContent='Entrar'}
  }
 },true);
}
