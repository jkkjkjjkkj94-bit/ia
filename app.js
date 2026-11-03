// Compatibilidade legada.
// O motor atual do GURU é carregado por context-fix.js. Este arquivo não mantém mais uma segunda implementação concorrente.
if(!window.LocalAIEngine){
  import('./context-fix.js?v=62').catch(err=>console.error('[Legacy app.js compatibility]',err));
}
