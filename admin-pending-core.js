import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const ai=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const API='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/admin-pending-stores';
const ADDRESS_API='https://innziuzgtpfsiywqmies.supabase.co/functions/v1/address-search';
const $=id=>document.getElementById(id);
const openLocations=new Set();
const openEditors=new Set();
let pendingLoadSequence=0;
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
 const sequence=++pendingLoadSequence;
 const list=$('pendingStoreList');if(list)list.innerHTML='<div class="meta">Carregando lojas pendentes...</div>';
 try{
   const{stores=[]}=await request();
   if(sequence!==pendingLoadSequence)return;
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
     return `<div class="item"><div class="row store-row"><div class="store-main"><div class="title-line"><b>${esc(s.name||'Loja sem nome')}</b><span class="status-dot pending"></span><span class="badge warn">Pendente</span></div><div class="meta">${esc(s.category||'Sem categoria')}</div><div class="meta">${esc(s.address||'Endereço não informado')}</div>${ready?'<div class="meta" style="color:#237245">Dados mínimos completos. Pronta para revisão.</div>':`<div class="meta" style="color:#975e11">Antes de aprovar: ${esc(missing.join(', '))}. <a href="guru-prospects.html">Abrir captação</a></div>`}</div><div class="actions-wrap"><button class="btn sm" type="button" data-pedit="${s.id}" aria-expanded="${openEditors.has(s.id)}">Editar loja</button><button class="btn sm" type="button" data-plocation="${s.id}" aria-controls="pending-location-${s.id}" aria-expanded="${openLocations.has(s.id)}">Coordenadas</button><button class="btn sm dark" data-papprove="${s.id}" ${ready?'':'disabled title="Complete os dados obrigatórios antes de aprovar"'}>Aprovar</button><button class="btn sm" data-psuspend="${s.id}">Suspender</button></div></div><div data-pedit-form="${s.id}" ${openEditors.has(s.id)?'':'hidden'} style="padding:14px;margin:10px 0;border:1px solid #e5e5e5;border-radius:10px">
 <div class="meta" style="margin-bottom:10px">Editar informações da loja pendente. O cadastro não será aprovado automaticamente.</div>
 <div class="row" style="gap:10px;flex-wrap:wrap">
 <label class="field" style="flex:1;min-width:190px">Nome<input data-edit-name="${s.id}" maxlength="140" value="${esc(s.name||'')}" required></label>
 <label class="field" style="flex:1;min-width:160px">Categoria<input data-edit-category="${s.id}" maxlength="100" value="${esc(s.category||'')}" required></label></div>
 <label class="field">Endereço comercial completo<input data-edit-address="${s.id}" maxlength="300" value="${esc(s.address||'')}"></label>
 <div class="row" style="gap:10px;flex-wrap:wrap"><label class="field" style="flex:1;min-width:150px">Telefone<input data-edit-phone="${s.id}" maxlength="50" value="${esc(s.phone||'')}"></label><label class="field" style="flex:1;min-width:150px">WhatsApp<input data-edit-whatsapp="${s.id}" maxlength="50" value="${esc(s.whatsapp||'')}"></label></div>
 <div class="row" style="gap:10px;flex-wrap:wrap"><label class="field" style="flex:1;min-width:150px">Site<input data-edit-website="${s.id}" maxlength="500" value="${esc(s.website||'')}"></label><label class="field" style="flex:1;min-width:150px">Instagram<input data-edit-instagram="${s.id}" maxlength="300" value="${esc(s.instagram||'')}"></label></div>
 <label class="field">Descrição<textarea data-edit-description="${s.id}" maxlength="2000" rows="3">${esc(s.description||'')}</textarea></label>
 <div class="row" style="gap:10px;flex-wrap:wrap"><label class="field" style="flex:1;min-width:150px">Latitude<input data-edit-latitude="${s.id}" type="number" step="any" min="-34" max="6" value="${s.latitude==null?'':esc(s.latitude)}"></label><label class="field" style="flex:1;min-width:150px">Longitude<input data-edit-longitude="${s.id}" type="number" step="any" min="-74" max="-32" value="${s.longitude==null?'':esc(s.longitude)}"></label></div>
 <div class="meta">Ao alterar o endereço, confira a localização novamente. Você pode deixar ambas as coordenadas vazias enquanto aguarda confirmação.</div>
 <div class="row" style="margin-top:12px;gap:8px"><button class="btn sm dark" type="button" data-psaveedit="${s.id}">Salvar alterações</button><button class="btn sm" type="button" data-pcanceledit="${s.id}">Cancelar</button></div>
 </div><div id="pending-location-${s.id}" data-plocation-form="${s.id}" ${openLocations.has(s.id)?'':'hidden'} style="padding:12px;margin:10px 0;border:1px solid #e5e5e5;border-radius:10px"><div class="meta" style="margin-bottom:9px">Confirme as coordenadas exatas deste comércio. O endereço preenchido, sozinho, não fornece latitude e longitude.</div><div class="row" style="gap:10px;flex-wrap:wrap"><label class="field" style="flex:1;min-width:150px">Latitude<input data-lat="${s.id}" inputmode="decimal" type="number" min="-34" max="6" step="any" placeholder="Ex.: -23.6" value="${s.latitude==null?'':esc(s.latitude)}"></label><label class="field" style="flex:1;min-width:150px">Longitude<input data-lng="${s.id}" inputmode="decimal" type="number" min="-74" max="-32" step="any" placeholder="Ex.: -47.5" value="${s.longitude==null?'':esc(s.longitude)}"></label></div><div class="row" style="margin-top:10px;gap:9px;flex-wrap:wrap"><button class="btn sm" type="button" data-pautolocation="${s.id}">Buscar coordenadas automaticamente</button><button class="btn sm dark" data-psavelocation="${s.id}">Salvar coordenadas</button><a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.name,s.address].filter(Boolean).join(' '))}" target="_blank" rel="noopener noreferrer">Conferir no Google Maps</a></div><div data-pautopreview="${s.id}" aria-live="polite" style="margin-top:10px"></div></div></div>`;
   }).join('');
   list.querySelectorAll('[data-pedit]').forEach(btn=>btn.onclick=(event)=>{
     event.preventDefault();event.stopPropagation();
     const id=btn.dataset.pedit,form=list.querySelector('[data-pedit-form="'+id+'"]');
     if(!form)return;
     if(openEditors.has(id)){openEditors.delete(id);form.hidden=true;btn.setAttribute('aria-expanded','false')}
     else{openEditors.add(id);form.hidden=false;btn.setAttribute('aria-expanded','true')}
   });
   list.querySelectorAll('[data-pcanceledit]').forEach(btn=>btn.onclick=()=>{
     const form=list.querySelector('[data-pedit-form="'+btn.dataset.pcanceledit+'"]');
     if(form){form.hidden=true;openEditors.delete(btn.dataset.pcanceledit)}
   });
   list.querySelectorAll('[data-psaveedit]').forEach(btn=>btn.onclick=async()=>{
     const id=btn.dataset.psaveedit;
     const original=stores.find(x=>x.id===id);
     const read=name=>list.querySelector('[data-edit-'+name+'="'+id+'"]')?.value.trim()||'';
     const name=read('name'),category=read('category'),address=read('address');
     if(name.length<2||name.length>140||category.length<2||category.length>100){
       toast('Preencha nome e categoria corretamente.');return;
     }
     const latText=read('latitude'),lngText=read('longitude');
     if(Boolean(latText)!==Boolean(lngText)){toast('Informe latitude e longitude juntas, ou deixe as duas vazias.');return}
     const latitude=latText?Number(latText.replace(',','.')):null;
     const longitude=lngText?Number(lngText.replace(',','.')):null;
     if(latText&&(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -34||latitude > 6||longitude < -74||longitude > -32)){
       toast('Coordenadas inválidas.');return;
     }
     if(original&&address!==String(original.address||'').trim()&&latitude!==null&&
        Number(original.latitude)===latitude&&Number(original.longitude)===longitude){
       toast('Endereço alterado: confira e atualize as coordenadas, ou apague ambas antes de salvar.');return;
     }
     if(!window.confirm('Salvar as alterações desta loja pendente? Ela continuará inativa até ser aprovada.'))return;
     const payload={action:'edit_pending_store',id,name,category,address,
       description:read('description'),phone:read('phone'),whatsapp:read('whatsapp'),
       website:read('website'),instagram:read('instagram'),latitude,longitude};
     btn.disabled=true;
     try{
       const result=await request('POST',payload);
       if(!result?.ok||!result.store)throw Error('O servidor não confirmou a edição.');
       toast('Loja pendente atualizada.');
       await loadPending();
     }catch(err){toast('Não foi possível salvar: '+(err.message||'Erro na edição'));btn.disabled=false}
   });
   list.querySelectorAll('[data-plocation]').forEach(btn=>btn.onclick=(event)=>{
     event.preventDefault();event.stopPropagation();
     const id=btn.dataset.plocation,form=list.querySelector('[data-plocation-form="'+id+'"]');
     if(!form)return;
     if(openLocations.has(id)){openLocations.delete(id);form.hidden=true;btn.setAttribute('aria-expanded','false')}
     else{openLocations.add(id);form.hidden=false;btn.setAttribute('aria-expanded','true')}
   });
   list.querySelectorAll('[data-pautolocation]').forEach(btn=>btn.onclick=async()=>{
     const id=btn.dataset.pautolocation;
     const store=stores.find(s=>s.id===id);
     const preview=list.querySelector('[data-pautopreview="'+id+'"]');
     const latInput=list.querySelector('[data-lat="'+id+'"]');
     const lngInput=list.querySelector('[data-lng="'+id+'"]');
     if(!store||!preview||!latInput||!lngInput){toast('Não foi possível identificar esta loja.');return}
     if(!store.address||store.address.trim().length<6){toast('Cadastre o endereço completo antes de buscar coordenadas.');return}
     btn.disabled=true;preview.replaceChildren();
     preview.appendChild(Object.assign(document.createElement('div'),{className:'meta',textContent:'Localizando o endereço cadastrado...'}));
     try{
       const u=new URL(ADDRESS_API);
       u.searchParams.set('resolve','1');
       u.searchParams.set('q',store.address);
       const numberMatch=store.address.match(/,\s*(\d{1,6})(?:\b|[\s-])/);
       if(numberMatch)u.searchParams.set('number',numberMatch[1]);
       const response=await fetch(u.href,{headers:{Accept:'application/json'}});
       if(!response.ok)throw new Error('Serviço de localização indisponível (HTTP '+response.status+').');
       const payload=await response.json();
       const found=payload?.resolved;
       if(!found||!Number.isFinite(Number(found.lat))||!Number.isFinite(Number(found.lng))){
         throw new Error('Nenhuma coordenada encontrada para esse endereço. Confira o endereço ou informe os números manualmente.');
       }
       const lat=Number(found.lat),lng=Number(found.lng);
       if(lat < -34||lat > 6||lng < -74||lng > -32){
         throw new Error('O resultado está fora do Brasil. Não foi utilizado.');
       }
       // Não gravar diretamente no banco: o administrador deve conferir e salvar.
       latInput.value=String(lat);
       lngInput.value=String(lng);
       preview.replaceChildren();
       const label=document.createElement('div');label.className='meta';
       label.textContent='Resultado: '+(found.display_name||store.address)+' · Fonte: '+(found.source||'geocodificador')+
         ' · Precisão: '+(found.accuracy==='exact'?'número identificado':found.accuracy==='street'?'aproximada (rua)':found.accuracy==='cep'?'aproximada (CEP)':'não determinada')+
         '. Confira o marcador e salve apenas se corresponder à loja.';
       preview.appendChild(label);
       const frame=document.createElement('iframe');
       frame.title='Prévia da localização encontrada para '+store.name;
       frame.loading='lazy';
       frame.referrerPolicy='no-referrer';
       frame.style.cssText='width:100%;max-width:550px;height:235px;border:1px solid #ddd;border-radius:9px;margin-top:10px;display:block';
       const delta=.004;
       const bbox=[lng-delta,lat-delta,lng+delta,lat+delta].join(',');
       frame.src='https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(bbox)+'&layer=mapnik&marker='+encodeURIComponent(lat+','+lng);
       preview.appendChild(frame);
       const link=document.createElement('a');
       link.className='btn sm';link.target='_blank';link.rel='noopener noreferrer';
       link.href='https://www.openstreetmap.org/?mlat='+encodeURIComponent(lat)+'&mlon='+encodeURIComponent(lng)+'#map=18/'+encodeURIComponent(lat)+'/'+encodeURIComponent(lng);
       link.textContent='Conferir marcador no mapa';
       preview.appendChild(link);
       toast('Coordenadas encontradas. Confira a localização e clique em Salvar coordenadas.');
     }catch(err){
       preview.replaceChildren();
       const warning=document.createElement('div');warning.className='meta';warning.style.color='#a34e16';
       warning.textContent=err.message||'Erro na busca de coordenadas.';
       preview.appendChild(warning);
       toast(warning.textContent);
     }finally{btn.disabled=false}
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
     try{await request('POST',{action:'save_location',id,latitude,longitude});openLocations.delete(id);toast('Coordenadas salvas. Verifique se a loja está pronta para aprovação.');await loadPending()}
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
