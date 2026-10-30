// Ponte temporária: carrega os módulos atuais do Local AI.
// Cada módulo é isolado para que um erro no chat não derrube login/admin.
await new Promise(resolve=>setTimeout(resolve,150));

async function safeImport(path){
  try{
    await import(path);
  }catch(error){
    console.error('[Local AI] Falha ao carregar módulo:',path,error);
  }
}

// Prioridade: autenticação e painel administrativo.
await safeImport('./admin-login-fix.js?v=2');
await safeImport('./admin-pending-v2.js?v=4');

// Localização real e validação de endereço da loja.
await safeImport('./real-location.js?v=1');
await safeImport('./address-validation.js?v=3');

// Recursos do chat carregam depois e não bloqueiam o admin.
await safeImport('./intelligence-v3.js?v=3');
await safeImport('./distance-fix.js?v=2');
await safeImport('./typing-indicator.js?v=2');
