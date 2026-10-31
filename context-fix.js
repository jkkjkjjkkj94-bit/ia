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
await safeImport('./clear-filter-fix.js?v=3');
await safeImport('./admin-login-fix.js?v=3');
await safeImport('./admin-pending-v2.js?v=4');
await safeImport('./real-location.js?v=1');
await safeImport('./address-validation.js?v=6');
await safeImport('./hashtag-manager.js?v=1');
await safeImport('./hashtag-search.js?v=3');
await safeImport('./regular-results-ui.js?v=1');
await safeImport('./selected-store-ui.js?v=3');
await safeImport('./city-context.js?v=1');
await safeImport('./intelligence-v3.js?v=3');
await safeImport('./distance-fix.js?v=2');
await safeImport('./typing-indicator.js?v=2');
