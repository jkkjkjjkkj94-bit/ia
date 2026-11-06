// GURU Voice 3: entrada por voz, transcrição ao vivo, revisão antes do envio.
(() => {
 'use strict';
 const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
 const mic=document.getElementById('guruVoiceMic'), input=document.getElementById('q'), status=document.getElementById('guruVoiceStatus');
 if(!mic||!input)return;
 const form=document.getElementById('chatForm');
 let rec,active=false,starting=false,requestedStop=false,token=0,base='',final='',restarts=0,started=0,restartTimer=null,watchdog=null;
 const originalPlaceholder=input.placeholder;
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
 const join=(...parts)=>parts.map(clean).filter(Boolean).join(' ');
 function say(message,state=''){if(status){status.textContent=message;status.dataset.state=state}}
 function ui(){mic.classList.toggle('is-listening',active);mic.classList.toggle('is-starting',starting);mic.setAttribute('aria-pressed',String(active));mic.setAttribute('aria-label',active?'Finalizar ditado':'Falar com a GURU');mic.title=active?'Finalizar ditado e revisar':'Ditar pergunta';input.placeholder=active?'Sua pergunta aparece aqui enquanto você fala…':originalPlaceholder}
 function clear(){clearTimeout(restartTimer);clearTimeout(watchdog)}
 function write(interim=''){const value=join(base,final,interim);if(value){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))}}
 function finish(message){requestedStop=true;active=false;starting=false;token++;clear();try{rec?.stop()}catch{}ui();say(message||(input.value.trim()?'Pergunta captada. Confira o texto e toque em enviar.':'Não detectei sua fala. Tente novamente.'),input.value.trim()?'ready':'hint')}
 if(!Speech){mic.disabled=true;mic.title='Reconhecimento de voz indisponível';say('Este navegador não oferece reconhecimento de voz. Use o teclado ou outro navegador compatível.','error');return}
 rec=new Speech();rec.lang='pt-BR';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=1;
 function begin(id){
  if(!active||requestedStop||id!==token)return;
  starting=true;ui();
  try{rec.start()}catch(e){starting=false;ui();if(e?.name!=='InvalidStateError')finish('Não foi possível iniciar o microfone. Verifique a permissão.');return}
  clearTimeout(watchdog);
  watchdog=setTimeout(()=>{if(active&&starting&&id===token)finish('O microfone não iniciou. Confira a permissão e tente novamente.')},10000);
 }
 rec.onstart=()=>{if(!active||requestedStop){try{rec.stop()}catch{}return}starting=false;clearTimeout(watchdog);ui();say('Ouvindo… fale naturalmente e toque no microfone quando terminar.','listening')};
 rec.onresult=event=>{
  if(!active||requestedStop)return;
  const parts=[];let interim='';
  for(let i=0;i<event.results.length;i++){const result=event.results[i],txt=clean(result?.[0]?.transcript);if(!txt)continue;if(result.isFinal)parts.push(txt);else interim=join(interim,txt)}
  final=join(...parts);write(interim);say(interim?'Captando sua fala…':'Fala reconhecida. Continue falando ou finalize.','listening');
 };
 rec.onerror=event=>{
  const err=event.error;
  const fatal={
   'not-allowed':'Autorize o microfone nas configurações do navegador.',
   'service-not-allowed':'O reconhecimento de voz está bloqueado neste navegador.',
   'audio-capture':'Não foi possível captar áudio. Verifique o microfone.',
   'network':'O reconhecimento de voz perdeu a conexão. Confira sua internet.',
   'language-not-supported':'Português não está disponível no reconhecimento deste navegador.'
  };
  if(fatal[err])finish(fatal[err]);
  else if(err==='no-speech')say('Não detectei fala. Tente falar novamente.','hint');
  else if(err!=='aborted')say('A escuta foi interrompida. Tentando recuperar…','hint');
 };
 rec.onend=()=>{
  starting=false;clearTimeout(watchdog);
  if(!active||requestedStop){ui();return}
  base=join(base,final);final='';write();
  if(Date.now()-started>90000){finish('Tempo máximo de ditado atingido. Confira o texto e envie.');return}
  if(restarts>=3){finish('A escuta foi interrompida várias vezes. Confira o texto e tente novamente.');return}
  const id=token;restarts++;say('Reconectando microfone… o texto já captado foi preservado.','hint');
  restartTimer=setTimeout(()=>begin(id),350*restarts);
 };
 mic.addEventListener('click',()=>{
  if(active){finish();input.focus();return}
  if(starting)return;
  clear();token++;requestedStop=false;active=true;starting=false;restarts=0;started=Date.now();base=clean(input.value);final='';
  say('Ativando microfone…','starting');ui();begin(token)
 });
 form?.addEventListener('submit',()=>{if(active)finish('Pergunta enviada.')},{capture:true});
 document.querySelectorAll('[data-shell-action="new"]').forEach(b=>b.addEventListener('click',()=>{if(active)finish();base='';final='';say('')}));
 input.addEventListener('input',event=>{if(active&&event.isTrusted){base=clean(input.value);final='';finish('Texto editado. Toque no microfone para continuar ditando.')}});
 window.addEventListener('pagehide',()=>{if(active)finish('')});
 ui();
})();