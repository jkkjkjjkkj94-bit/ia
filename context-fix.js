await new Promise(resolve=>setTimeout(resolve,80));

const body=document.body;
const sidebar=document.querySelector('.app-sidebar');
const msgs=document.getElementById('msgs');
const shellActions={
  new:()=>document.getElementById('resetBtn')?.click(),
  location:()=>document.getElementById('locBtn')?.click(),
  merchant:()=>document.getElementById('merchantAccess')?.click(),
  admin:()=>document.getElementById('adminAccess')?.click()
};
sidebar?.addEventListener('click',e=>{
  const btn=e.target.closest('[data-shell-action]');
  if(btn)shellActions[btn.dataset.shellAction]?.();
});
sidebar?.querySelector('.sidebar-collapse')?.addEventListener('click',()=>body.classList.toggle('sidebar-collapsed'));
const syncChatState=()=>body.classList.toggle('chat-started',!!msgs?.querySelector('.msg.user'));
syncChatState();
if(msgs)new MutationObserver(syncChatState).observe(msgs,{childList:true,subtree:true});

async function safeImport(path){try{await import(path)}catch(error){console.error('[Local AI] Falha ao carregar módulo:',path,error)}}

// Inteligência centralizada: busca, filtros, distância, contexto e seleção de loja
await safeImport('./ai-engine.js?v=2');

// Corrige variações de reinício/limpeza que precisam interromper a busca antes do motor normal.
const clearForm=document.getElementById('chatForm');
const clearInput=document.getElementById('q');
const clearNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
function isRestartCommand(text){
  const n=clearNorm(text);
  return [
    'reiniciar filtro','reiniciar filtros','reinicie filtro','reinicie filtros',
    'reiniciar busca','reiniciar a busca','resetar busca','resetar a busca',
    'recomecar filtro','recomecar filtros','recomecar busca','recomecar a busca'
  ].some(x=>n.includes(x));
}
function appendChatMessage(text,kind='bot'){
  if(!msgs)return;
  const d=document.createElement('div');
  d.className='msg '+kind;
  d.textContent=text;
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
}
clearForm?.addEventListener('submit',e=>{
  const original=clearInput?.value?.trim()||'';
  if(!isRestartCommand(original))return;
  e.preventDefault();
  e.stopImmediatePropagation();
  appendChatMessage(original,'user');
  if(clearInput)clearInput.value='';
  window.LocalAIEngine?.reset?.();
  const reply=window.LocalAIEngine?.nextClearReply?.()||'Pronto. Reiniciei a busca e removi os filtros. O que você procura agora?';
  appendChatMessage(reply,'bot');
},true);

// Conta, administração e recursos auxiliares
await safeImport('./admin-login-fix.js?v=3');
await safeImport('./admin-pending-v2.js?v=4');
await safeImport('./real-location.js?v=1');
await safeImport('./address-validation.js?v=6');
await safeImport('./hashtag-manager.js?v=1');
await safeImport('./hashtag-search.js?v=3');
await safeImport('./regular-results-ui.js?v=1');
await safeImport('./city-context.js?v=1');
await safeImport('./typing-indicator.js?v=2');
