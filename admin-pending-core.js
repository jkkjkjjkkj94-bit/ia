import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const ai=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const API='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/admin-pending-stores';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const toast=t=>{const e=$('toast');if(!e)return;e.textContent=t;e.classList.add('on');clearTimeout(window.__pcToast);window.__pcToast=setTimeout(()=>e.classList.remove('on'),2800)};

async function token(){const{data:{session}}=await ai.auth.getSession();return session?.access_token||''}
async function request(method='GET',body=null){const t=await token();if(!t)throw new Error('Sessão administrativa não encontrada.');const r=await fetch(API,{method,headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error||`HTTP ${r.status}`);return data}

function ensureUI(){
 const nav=document.querySelector('.panel-nav');
 const main=document.querySelector('.panel-main');
 if(!nav||!main)return false;
 if(!nav.querySelector('[data-view="pendingStores"]')){
   const b=document.createElement('button');b.dataset.view='pendingStores';b.innerHTML='Pendentes <span id="pendingNavCount" class="badge" style="margin-left:6px">0</span>';
   const stores=nav.querySelector('[data-view="stores"]');stores?.insertAdjacentElement('afterend',b);
   b.onclick=()=>{document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id==='pendingStores'));document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('on',x===b));$('pageTitle').textContent='Pendentes';loadPending()};
 }
 if(!$('pendingStores')){
   const s=document.createElement('section');s.id='pendingStores';s.className='view';s.innerHTML='<div class="card"><div class="section-head"><div><h3>Lojas pendentes</h3><div class="meta">Cadastros aguardando aprovação administrativa.</div></div><div class="row"><a class="btn sm" href="guru-prospects.html">Criar contas para lojas sem responsável</a><button id="pendingRefresh" class="btn sm" type="button">Atualizar</button></div></div><div id="pendingStoreList" class="list" style="margin-top:14px"></div></div>';
   main.appendChild(s);$('pendingRefresh').onclick=loadPending;
 }
 return true;
}

async function loadPending(){
 if(!ensureUI())return;
 const list=$('pendingStoreList');if(list)list.innerHTML='<div class="meta">Carregando lojas pendentes...</div>';
 try{
   const{stores=[]}=await request();
   if($('aPending'))$('aPending').textContent=String(stores.length);
   if($('pendingNavCount'))$('pendingNavCount').textContent=String(stores.length);
   if(!list)return;
   if(!stores.length){list.innerHTML='<div class="empty-state">Nenhuma loja aguardando aprovação.</div>';return}
   list.innerHTML=stores.map(s=>{
     const missing=[];
     if(!s.owner_id)missing.push('vincular lojista');
     if(!String(s.address||'').trim()||String(s.address).trim().length<5)missing.push('endereço');
     if(s.latitude==null||s.longitude==null)missing.push('coordenadas');
     const ready=missing.length===0;
     return `<div class="item"><div class="row store-row"><div class="store-main"><div class="title-line"><b>${esc(s.name||'Loja sem nome')}</b><span class="status-dot pending"></span><span class="badge warn">Pendente</span></div><div class="meta">${esc(s.category||'Sem categoria')}</div><div class="meta">${esc(s.address||'Endereço não informado')}</div>${ready?'<div class="meta" style="color:#237245">Dados mínimos completos. Pronta para revisão.</div>':`<div class="meta" style="color:#975e11">Antes de aprovar: ${esc(missing.join(', '))}. <a href="guru-prospects.html">Abrir captação</a></div>`}</div><div class="actions-wrap"><button class="btn sm" type="button" data-plocation="${s.id}">Coordenadas</button><button class="btn sm dark" data-papprove="${s.id}" ${ready?'':'disabled title="Complete os dados obrigatórios antes de aprovar"'}>Aprovar</button><button class="btn sm" data-psuspend="${s.id}">Suspender</button></div></div><div data-plocation-form="${s.id}" hidden style="padding:12px;margin:10px 0;border:1px solid #e5e5e5;border-radius:10px"><div class="meta" style="margin-bottom:9px">Confirme as coordenadas exatas deste comércio. O endereço preenchido, sozinho, não fornece latitude e longitude.</div><div class="row" style="gap:10px;flex-wrap:wrap"><label class="field" style="flex:1;min-width:150px">Latitude<input data-lat="${s.id}" inputmode="decimal" type="number" min="-34" max="6" step="any" placeholder="Ex.: -23.6" value="${s.latitude==null?'':esc(s.latitude)}"></label><label class="field" style="flex:1;min-width:150px">Longitude<input data-lng="${s.id}" inputmode="decimal" type="number" min="-74" max="-32" step="any" placeholder="Ex.: -47.5" value="${s.longitude==null?'':esc(s.longitude)}"></label></div><div class="row" style="margin-top:10px;gap:9px;flex-wrap:wrap"><button class="btn sm dark" data-psavelocation="${s.id}">Salvar coordenadas</button><a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.name,s.address].filter(Boolean).join(' '))}" target="_blank" rel="noopener noreferrer">Conferir no Google Maps</a></div></div></div>`;
   }).join('');
   list.querySelectorAll('[data-plocation]').forEach(btn=>btn.onclick=()=>{
     const form=list.querySelector('[data-plocation-form="'+btn.dataset.plocation+'"]');
     if(form)form.hidden=!form.hidden;
   });
   list.querySelectorAll('[data-psavelocation]').forEach(btn=>btn.onclick=async()=>{
     const id=btn.dataset.psavelocation;
     const latInput=list.querySelector('[data-lat="'+id+'"]'),lngInput=list.querySelector('[data-lng="'+id+'"]');
     const latitude=Number(String(latInput?.value||'').replace(',','.'));
     const longitude=Number(String(lngInput?.value||'').replace(',','.'));
     if(!latInput?.value.trim()||!lngInput?.value.trim()||!Number.isFinite(latitude)||!Number.isFinite(longitude)){
       toast('Informe latitude e longitude válidas.');return;
     }
     if(latitude < -34||latitude > 6||longitude < -74||longitude > -32){
       toast('As coordenadas devem estar no Brasil. Verifique no mapa.');return;
     }
     if(!window.confirm('Salvar as coordenadas verificadas para esta loja?'))return;
     btn.disabled=true;
     try{await request('POST',{action:'save_location',id,latitude,longitude});toast('Coordenadas salvas. Verifique se a loja está pronta para aprovação.');await loadPending()}
     catch(e){toast(e.message||'Não foi possível salvar as coordenadas.');btn.disabled=false}
   });
   list.querySelectorAll('[data-papprove]').forEach(b=>b.onclick=()=>act(b.dataset.papprove,'approve',b));
   list.querySelectorAll('[data-psuspend]').forEach(b=>b.onclick=()=>act(b.dataset.psuspend,'suspend',b));
 }catch(e){if(list)list.innerHTML='<div class="empty-state">'+esc(e.message||'Erro ao carregar pendências.')+'</div>';toast(e.message||'Erro ao carregar pendências.')}
}
async function act(id,action,btn){btn.disabled=true;try{await request('POST',{id,action});toast(action==='approve'?'Loja aprovada.':'Loja suspensa.');await loadPending();setTimeout(()=>$('refreshBtn')?.click(),150)}catch(e){toast(e.message||'Não foi possível atualizar a loja.');btn.disabled=false}}

for(let i=0;i<50&&!ensureUI();i++)await new Promise(r=>setTimeout(r,100));
await loadPending();
ai.auth.onAuthStateChange((event,session)=>{if(session&&['SIGNED_IN','TOKEN_REFRESHED'].includes(event))setTimeout(loadPending,200)});
$('refreshBtn')?.addEventListener('click',()=>setTimeout(loadPending,250));
