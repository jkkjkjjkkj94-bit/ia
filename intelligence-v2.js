// Compatibilidade legada.
// O motor atual do GURU é carregado por context-fix.js e ai-engine.js.
if(!window.LocalAIEngine){
  import('./context-fix.js?v=62').catch(err=>console.error('[Legacy intelligence-v2 compatibility]',err));
}
