// Ponte temporária: carrega os módulos atuais do Local AI.
// O pequeno atraso garante que app.js termine de configurar lojista/admin antes.
await new Promise(resolve=>setTimeout(resolve,250));
await import('./intelligence-v3.js?v=2');
await import('./distance-fix.js?v=1');
await import('./typing-indicator.js?v=1');
await import('./admin-pending-v2.js?v=2');
await import('./admin-login-fix.js?v=1');
