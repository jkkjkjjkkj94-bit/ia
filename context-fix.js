await new Promise(resolve=>setTimeout(resolve,150));
async function safeImport(path){try{await import(path)}catch(error){console.error('[Local AI] Falha ao carregar módulo:',path,error)}}
await safeImport('./shell-layout.js?v=1');
await safeImport('./admin-login-fix.js?v=3');
await safeImport('./admin-pending-v2.js?v=4');
await safeImport('./real-location.js?v=1');
await safeImport('./address-validation.js?v=6');
await safeImport('./hashtag-manager.js?v=1');
await safeImport('./hashtag-search.js?v=3');
await safeImport('./regular-results-ui.js?v=1');
await safeImport('./intelligence-v3.js?v=3');
await safeImport('./distance-fix.js?v=2');
await safeImport('./typing-indicator.js?v=2');
