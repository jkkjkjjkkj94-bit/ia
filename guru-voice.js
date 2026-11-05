// GURU Voice - fala e escuta com APIs nativas do navegador.
// Nenhuma gravação é armazenada pela aplicação.
(() => {
  'use strict';
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  const form = document.getElementById('chatForm');
  const input = document.getElementById('q');
  const messages = document.getElementById('msgs');
  if (!form || !input || !messages) return;
  const mic = document.getElementById('guruVoiceMic');
  const audio = document.getElementById('guruVoiceAudio');
  const status = document.getElementById('guruVoiceStatus');
  let recognition = null;
  let listening = false;
  let pendingResponse = false;
  let responseStart = 0;
  let responseWatcher = null;
  let speechEnabled = false;
  let voiceSession = 0;

  function setStatus(message) {
    if (status) status.textContent = message || '';
  }
  function updateControls() {
    mic?.classList.toggle('is-listening', listening);
    mic?.setAttribute('aria-pressed', String(listening));
    if (mic) mic.title = listening ? 'Parar de escutar' : 'Falar com a GURU';
    audio?.setAttribute('aria-pressed', String(speechEnabled));
    audio?.classList.toggle('is-enabled', speechEnabled);
    if (audio) audio.title = speechEnabled ? 'Desativar respostas em áudio' : 'Ativar respostas em áudio';
  }
  function stopSpeaking() {
    if (synth) synth.cancel();
  }
  function speak(text) {
    if (!speechEnabled || !synth || !window.SpeechSynthesisUtterance) return;
    const clean = String(text || '').replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim().slice(0, 600);
    if (!clean) return;
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'pt-BR';
    utterance.rate = 1;
    utterance.pitch = 1;
    const voices = synth.getVoices();
    utterance.voice = voices.find(v => v.lang.toLowerCase() === 'pt-br') || voices.find(v => v.lang.toLowerCase().startsWith('pt')) || null;
    utterance.onstart = () => setStatus('GURU está respondendo por voz…');
    utterance.onend = () => setStatus('');
    utterance.onerror = () => setStatus('Não foi possível reproduzir o áudio.');
    synth.speak(utterance);
  }
  function replyText() {
    // Somente as mensagens novas, sem ler botões de cards ou URLs.
    const nodes = [...messages.querySelectorAll('.msg.bot')].filter(node => node !== messages.firstElementChild && node.dataset.guruVoiceIndex === String(voiceSession));
    return nodes.map(node => {
      const copy = node.cloneNode(true);
      copy.querySelectorAll('button, a, .store-results-grid, .chat-actions, .guru-next-buttons, .guru-need-card, .guru-followup-panel, .guru-typing-dots').forEach(el => el.remove());
      return copy.textContent.trim();
    }).filter(Boolean).slice(0, 2).join(' ');
  }
  function finishResponse() {
    if (!pendingResponse || messages.querySelector('.guru-typing, .guru-typewriter-caret')) return;
    const text = replyText();
    if (!text) return;
    pendingResponse = false;
    responseWatcher?.disconnect();
    responseWatcher = null;
    speak(text);
    if (!speechEnabled) setStatus('');
  }
  function watchResponse() {
    responseWatcher?.disconnect();
    pendingResponse = true;
    voiceSession += 1;
    responseStart = messages.children.length;
    let marked = false;
    responseWatcher = new MutationObserver(() => {
      if (!marked) {
        // Marca a resposta gerada após a mensagem do usuário.
        [...messages.children].slice(responseStart).forEach(node => {
          if (node.classList?.contains('bot') && !node.classList.contains('guru-typing')) node.dataset.guruVoiceIndex = String(voiceSession);
        });
      }
      finishResponse();
    });
    responseWatcher.observe(messages, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['class']});
    // Não manter uma pesquisa de áudio pendente se o catálogo falhar.
    window.setTimeout(() => {
      if (pendingResponse) {
        pendingResponse = false;
        responseWatcher?.disconnect();
        responseWatcher = null;
        setStatus('');
      }
    }, 45000);
  }
  function submitVoiceText(text) {
    const query = String(text || '').trim();
    if (!query) return;
    if (!window.GuruEngineV4?.submitText) {
      input.value = query;
      input.dispatchEvent(new Event('input', {bubbles:true}));
      setStatus('A pesquisa ainda está carregando. Toque em enviar.');
      return;
    }
    stopSpeaking();
    watchResponse();
    setStatus('Pesquisando: ' + query);
    Promise.resolve(window.GuruEngineV4.submitText(query)).then(() => {
      // A função do chat só resolve após a animação da resposta.
      finishResponse();
    }).catch(() => {
      pendingResponse = false;
      responseWatcher?.disconnect();
      setStatus('Não consegui concluir a pesquisa por voz.');
    });
  }
  function stopListening() {
    if (recognition && listening) {
      try { recognition.stop(); } catch {}
    }
    listening = false;
    updateControls();
  }
  if (!Recognition) {
    if (mic) { mic.disabled = true; mic.title = 'Reconhecimento de voz indisponível neste navegador'; }
    setStatus('O microfone por voz não é compatível com este navegador.');
  } else {
    recognition = new Recognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { listening = true; setStatus('Ouvindo… fale sua pergunta.'); updateControls(); };
    recognition.onresult = event => {
      const transcript = event.results?.[event.resultIndex]?.[0]?.transcript;
      if (transcript) submitVoiceText(transcript);
    };
    recognition.onerror = event => {
      const error = event.error;
      const messages = {
        'not-allowed':'Permita o acesso ao microfone nas configurações do navegador.',
        'service-not-allowed':'O serviço de reconhecimento foi bloqueado.',
        'no-speech':'Não identifiquei uma fala. Tente novamente.',
        'audio-capture':'Não encontrei um microfone disponível.',
        'network':'Não foi possível acessar o reconhecimento de voz.'
      };
      setStatus(messages[error] || 'Não foi possível reconhecer a fala.');
    };
    recognition.onend = () => { listening = false; updateControls(); if (!pendingResponse && status?.textContent === 'Ouvindo… fale sua pergunta.') setStatus(''); };
    mic?.addEventListener('click', () => {
      if (listening) return stopListening();
      stopSpeaking();
      try { recognition.start(); } catch { setStatus('Não foi possível iniciar o microfone.'); }
    });
  }
  audio?.addEventListener('click', () => {
    if (!synth || !window.SpeechSynthesisUtterance) {
      setStatus('A reprodução de voz não está disponível neste navegador.');
      return;
    }
    speechEnabled = !speechEnabled;
    if (!speechEnabled) stopSpeaking();
    updateControls();
    setStatus(speechEnabled ? 'Respostas por voz ativadas.' : 'Respostas por voz desativadas.');
  });
  // Ao iniciar uma nova conversa, não continuar lendo a resposta antiga.
  document.querySelectorAll('[data-shell-action="new"]').forEach(btn => btn.addEventListener('click', () => {
    stopSpeaking(); stopListening(); pendingResponse=false; responseWatcher?.disconnect(); setStatus('');
  }));
  window.addEventListener('pagehide', () => {stopSpeaking(); stopListening(); responseWatcher?.disconnect();});
  updateControls();
})();
