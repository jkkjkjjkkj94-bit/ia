// Ponte temporária: carrega apenas o novo motor de inteligência do chat.
// O pequeno atraso garante que app.js termine de configurar lojista/admin antes
de await new Promise(resolve=>setTimeout(resolve,250));
await import('./intelligence-v2.js?v=1');
