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
await safeImport('./core-data-router.js?v=2');
await safeImport('./ai-engine.js?v=8');
await safeImport('./real-location.js?v=1');
await safeImport('./hashtag-search.js?v=3');
await safeImport('./regular-results-ui.js?v=1');
await safeImport('./typing-indicator.js?v=2');

form?.addEventListener('submit',()=>{
  const engine=window.LocalAIEngine;
  const state=engine?.state;
  if(!state||state.selectedStore||state.lastResults?.length)return;
  const text=String(q?.value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const looksLikeFreshSearch=/\b(quero|procuro|preciso|pizzaria|pizza|restaurante|loja|roupa|roupas|farmacia|mercado|comida|tecnologia|servico|pet|oficina|construcao)\b/.test(text)||/\bem\s+[a-z]/.test(text);
  if(!looksLikeFreshSearch)return;
  if(!/abert[oa]s?\s+agora|abert[oa]s?|agora/.test(text))state.openNow=false;
  if(!/com\s+entrega|delivery|entrega/.test(text)){state.delivery=null;state.excludedDelivery=false}
  if(!/retirada|retirar|buscar\s+na\s+loja/.test(text))state.pickup=null;
  if(!/promocao|promoção|oferta|desconto/.test(String(q?.value||'').toLowerCase()))state.promotionOnly=false;
  if(!/tamanho|\btam\b/.test(text))state.size=null;
  if(!/\b(?:ate|maximo|max|menos de|entre|acima de|mais de|a partir de)\b/.test(text)){state.minPrice=null;state.maxPrice=null}
  if(!/nota|avaliacao/.test(text))state.minRating=null;
  if(!/\bkm\b|perto|proxima|proximo|distancia/.test(text))state.maxDistance=null;
  if(!/pix|dinheiro|credito|debito|cartao|pagamento/.test(text))state.paymentMethods=[];
},true);

document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{if(!q||!form)return;q.value=b.dataset.q||'';form.requestSubmit()}));
document.getElementById('resetBtn')?.addEventListener('click',()=>{window.LocalAIEngine?.reset?.();if(msgs){const d=document.createElement('div');d.className='msg bot';d.textContent='Pronto. Limpei o contexto da busca. O que você procura agora?';msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}});
