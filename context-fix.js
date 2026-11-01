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
await safeImport('./card-standardizer.js?v=3');
await safeImport('./card-rating.js?v=1');
await safeImport('./zero-result-responses.js?v=2');
await safeImport('./typing-indicator.js?v=3');

// Garante que capas/banners antigos não apareçam nos cards.
// A foto de perfil é renderizada somente pelo card-standardizer.js.
function ensureNoCoverStyles(){
  if(document.getElementById('localAiNoCoverStyles'))return;
  const style=document.createElement('style');
  style.id='localAiNoCoverStyles';
  style.textContent=`
.store-result-card .store-card-photo,
.store-result-card .store-card-cover,
.store-result-card .smart-cover,
.store-result-card .smart-banner,
.store-result-card .smart-hero,
.store-result-card .card-cover,
.store-result-card .store-cover{
  display:none!important;
}
.store-result-card .store-card-actions a[href*="google.com/maps"]{
  display:none!important;
}
`;
  document.head.appendChild(style);
}
ensureNoCoverStyles();

function removeDirectionsButtons(root=document){
  root.querySelectorAll?.('.store-result-card .store-card-actions a').forEach(a=>{
    if(a.textContent.trim().toLowerCase()==='como chegar')a.remove();
  });
}
removeDirectionsButtons();
if(msgs)new MutationObserver(mutations=>{
  for(const m of mutations)m.addedNodes.forEach(n=>{if(n.nodeType===1)removeDirectionsButtons(n)});
}).observe(msgs,{childList:true,subtree:true});

document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{if(!q||!form)return;q.value=b.dataset.q||'';form.requestSubmit()}));
document.getElementById('resetBtn')?.addEventListener('click',()=>{window.LocalAIEngine?.reset?.();if(msgs){const d=document.createElement('div');d.className='msg bot';d.textContent='Pronto. Limpei o contexto da busca. O que você procura agora?';msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}});
