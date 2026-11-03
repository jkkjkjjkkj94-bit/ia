// Compatibilidade legada: o único motor público ativo é GURU V4.
// Não reativa context-fix.js ou ai-engine.js antigos.
if(document.getElementById('chatForm')&&!window.GuruEngineV4){
  import('./guru-engine-v4.js?v=3').catch(err=>console.error('[Legacy GURU entrypoint]',err));
}
