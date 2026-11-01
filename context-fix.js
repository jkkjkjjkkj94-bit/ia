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

// Foto de perfil da loja nos cards de resultado.
// Não renderiza capa/banner. Usa somente local_ai_stores.logo_url.
const CARD_STORE_URL='https://ccsypggvelcxsqszepfs.supabase.co';
const CARD_STORE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
let cardStoreCache=null;
const cardNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
async function getCardStores(){
  if(cardStoreCache)return cardStoreCache;
  try{
    const r=await fetch(CARD_STORE_URL+'/rest/v1/local_ai_stores?select=id,name,logo_url&active=eq.true&status=eq.active',{headers:{apikey:CARD_STORE_KEY,Authorization:'Bearer '+CARD_STORE_KEY,Accept:'application/json'}});
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
  style.textContent=`
.store-result-card .store-card-photo,.store-result-card .store-card-cover,.store-result-card .smart-cover,.store-result-card .smart-banner,.store-result-card .smart-hero,.store-result-card .card-cover,.store-result-card .store-cover{display:none!important}
.store-result-card .store-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.store-result-card .store-card-profile{display:flex;align-items:center;gap:12px;min-width:0;flex:1}
.store-result-card .store-profile-avatar{width:56px;height:56px;min-width:56px;border-radius:50%;overflow:hidden;background:#f4f4f4;border:1px solid #e7e7e7;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.store-result-card .store-profile-avatar img{display:block;width:100%;height:100%;object-fit:cover}
.store-result-card .store-profile-content{min-width:0;flex:1}
@media(max-width:680px){.store-result-card .store-profile-avatar{width:48px;height:48px;min-width:48px}.store-result-card .store-card-profile{gap:10px}}
`;
  document.head.appendChild(style);
}
async function applyCardPhotos(root=document){
  ensureCardPhotoStyles();
  const stores=await getCardStores();
  root.querySelectorAll?.('.store-result-card').forEach(card=>{
    if(card.dataset.photoReady==='1')return;
    const top=card.querySelector('.store-card-top');
    const title=top?.querySelector('h3')?.textContent||'';
    const n=cardNorm(title);
    const store=stores.find(s=>cardNorm(s.name)===n)||stores.find(s=>cardNorm(s.name).includes(n)||n.includes(cardNorm(s.name)));
    card.dataset.photoReady='1';
    const url=store?.logo_url||'';
    if(!top||!url)return;

    // Remove qualquer capa antiga que outro módulo tenha criado.
    card.querySelectorAll('.store-card-photo,.store-card-cover,.smart-cover,.smart-banner,.smart-hero,.card-cover,.store-cover').forEach(el=>el.remove());

    const rank=top.querySelector('.store-rank');
    const content=top.querySelector(':scope > div:not(.store-rank)');
    if(!content)return;

    const profile=document.createElement('div');
    profile.className='store-card-profile';

    const avatar=document.createElement('div');
    avatar.className='store-profile-avatar';
    const img=document.createElement('img');
    img.src=url;
    img.alt='Foto de perfil da '+title;
    img.loading='lazy';
    img.onerror=()=>avatar.remove();
    avatar.appendChild(img);

    const contentWrap=document.createElement('div');
    contentWrap.className='store-profile-content';
    while(content.firstChild)contentWrap.appendChild(content.firstChild);
    content.remove();

    profile.append(avatar,contentWrap);
    top.insertBefore(profile,rank||null);
  });
}
applyCardPhotos(document);
if(msgs)new MutationObserver(()=>applyCardPhotos(msgs)).observe(msgs,{childList:true,subtree:true});

document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{if(!q||!form)return;q.value=b.dataset.q||'';form.requestSubmit()}));
document.getElementById('resetBtn')?.addEventListener('click',()=>{window.LocalAIEngine?.reset?.();if(msgs){const d=document.createElement('div');d.className='msg bot';d.textContent='Pronto. Limpei o contexto da busca. O que você procura agora?';msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}});
