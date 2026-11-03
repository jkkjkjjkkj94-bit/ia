// Compatibilidade legada: toda interpretação e busca pública são feitas pelo GURU V4.
if(document.getElementById('chatForm')&&!window.GuruEngineV4){
  import('./guru-engine-v4.js?v=3').catch(err=>console.error('[Legacy Intelligence entrypoint]',err));
}
