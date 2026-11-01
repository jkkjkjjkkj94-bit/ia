await new Promise(resolve=>setTimeout(resolve,80));
const body=document.body;
const sidebar=document.querySelector('.app-sidebar');
const msgs=document.getElementById('msgs');
const q=document.getElementById('q');
const form=document.getElementById('chatForm');
const shellActions={new:()=>document.getElementById('resetBtn')?.click(),location:()=>document.getElementById('locBtn')?.click()};
sidebar?.addEventListener('click',e=>{const btn=e.target.closest('[data-shell-action]');if(btn)shellActions[btn.dataset.shellAction]?.()});
sidebar?.querySelector('.sidebar-collapse')?.addEventListener('click',()=>body.classList.toggle('sidebar-collapsed'));
const syncChatState=()=>body.classList.toggle('chat-started',!!msgs?.querySelector('.msg.user'));
syncChatState();
if(msgs)new MutationObserver(syncChatState).observe(msgs,{childList:true,subtree:true});
async function safeImport(path){try{await import(path)}catch(error){console.error('[Local AI] Falha ao carregar módulo:',path,error)}}
await safeImport('./core-data-router.js?v=3');
await safeImport('./ai-engine.js?v=14');
await safeImport('./category-context-fix.js?v=3');
await safeImport('./semantic-query-guard.js?v=4');
await safeImport('./ai-conversation-enhancements.js?v=2');
await safeImport('./real-location.js?v=1');
await safeImport('./hashtag-search.js?v=3');
await safeImport('./regular-results-ui.js?v=3');
await safeImport('./card-standardizer.js?v=2');
await safeImport('./card-rating.js?v=1');
await safeImport('./zero-result-responses.js?v=2');
await safeImport('./typing-indicator.js?v=3');

// Foto da loja nos cards de resultado.
// As lojas/produtos públicos ficam no banco CORE. A foto é gravada em local_ai_stores.logo_url.
const CARD_STORE_URL='https://ccsypggvelcxsqszepfs.supabase.co';
const CARD_STORE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
let cardStoreCache=null;
const cardNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
async function getCardStores(){
  if(cardStoreCache)return cardStoreCache;
  try{
    const r=await fetch(CARD_STORE_URL+'/rest/v1/local_ai_stores?select=id,name,logo_url,cover_url&active=eq.true&status=eq.active',{headers:{apikey:CARD_STORE_KEY,Authorization:'Bearer '+CARD_STORE_KEY,Accept:'application/json'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    cardStoreCache=await r.json();
    return cardStoreCache;
  }catch(error){
    console.warn('[Local AI Fotos]',error);
    return [];
  }
}
function ensureCardPhotoStyles(){
  if(document.getElementById('localAiCardPhotoStyles'))return;
  const style=document.createElement('style');
  style.id='localAiCardPhotoStyles';
  style.textContent=`.store-result-card .store-card-photo{width:100%;height:190px;border-radius:13px;overflow:hidden;background:#f4f4f4;margin-bottom:12px}.store-result-card .store-card-photo img{display:block;width:100%;height:100%;object-fit:cover}@media(max-width:680px){.store-result-card .store-card-photo{height:155px}}`;
  document.head.appendChild(style);
}
async function applyCardPhotos(root=document){
  ensureCardPhotoStyles();
  const stores=await getCardStores();
  root.querySelectorAll?.('.store-result-card').forEach(card=>{
    if(card.dataset.photoReady==='1')return;
    const title=card.querySelector('.store-card-top h3')?.textContent||'';
    const n=cardNorm(title);
    const store=stores.find(s=>cardNorm(s.name)===n)||stores.find(s=>cardNorm(s.name).includes(n)||n.includes(cardNorm(s.name)));
    card.dataset.photoReady='1';
    const url=store?.logo_url||store?.cover_url||'';
    if(!url)return;
    const wrap=document.createElement('div');
    wrap.className='store-card-photo';
    const img=document.createElement('img');
    img.src=url;
    img.alt='Foto da '+title;
    img.loading='lazy';
    img.onerror=()=>wrap.remove();
    wrap.appendChild(img);
    card.insertBefore(wrap,card.firstChild);
  });
}
applyCardPhotos(document);
if(msgs)new MutationObserver(()=>applyCardPhotos(msgs)).observe(msgs,{childList:true,subtree:true});

document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{if(!q||!form)return;q.value=b.dataset.q||'';form.requestSubmit()}));
document.getElementById('resetBtn')?.addEventListener('click',()=>{window.LocalAIEngine?.reset?.();if(msgs){const d=document.createElement('div');d.className='msg bot';d.textContent='Pronto. Limpei o contexto da busca. O que você procura agora?';msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}});
