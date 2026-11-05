// GURU Voice: entrada de voz somente, respostas sempre em texto.
(() => {
  'use strict';
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = document.getElementById('guruVoiceMic');
  const input = document.getElementById('q');
  const status = document.getElementById('guruVoiceStatus');
  if (!mic || !input) return;

  let recognition = null;
  let listening = false;
  let submitted = false;
  const setStatus = message => { if (status) status.textContent = message || ''; };
  const updateButton = () => {
    mic.classList.toggle('is-listening', listening);
    mic.setAttribute('aria-pressed', String(listening));
    mic.title = listening ? 'Parar de escutar' : 'Falar com a GURU';
  };
  const stop = () => {
    if (listening && recognition) {
      try { recognition.stop(); } catch {}
    }
    listening = false;
    updateButton();
  };
  if (!Recognition) {
    mic.disabled = true;
    mic.title = 'Reconhecimento de voz indisponível neste navegador';
    setStatus('Este navegador não oferece reconhecimento de voz.');
    return;
  }
  recognition = new Recognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    listening = true;
    submitted = false;
    updateButton();
    setStatus('Ouvindo… fale sua pergunta.');
  };
  recognition.onresult = event => {
    const query = String(event.results?.[event.resultIndex]?.[0]?.transcript || '').trim();
    if (!query || submitted) return;
    submitted = true;
    // Mostra a transcrição para confirmar antes de iniciar a busca.
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles:true }));
    input.focus({preventScroll:true});
    setStatus('Confira o texto reconhecido e toque em enviar. A GURU responderá apenas por escrito.');
  };
  recognition.onerror = event => {
    const messages = {
      'not-allowed': 'Permita acesso ao microfone nas configurações do navegador.',
      'service-not-allowed': 'O reconhecimento de voz foi bloqueado.',
      'no-speech': 'Não identifiquei sua fala. Tente novamente.',
      'audio-capture': 'Nenhum microfone disponível.',
      'network': 'Falha na conexão com o serviço de reconhecimento de voz.'
    };
    setStatus(messages[event.error] || 'Não foi possível reconhecer a fala.');
  };
  recognition.onend = () => {
    listening = false;
    updateButton();
    if (status?.textContent === 'Ouvindo… fale sua pergunta.') setStatus('');
  };
  mic.addEventListener('click', () => {
    if (listening) { stop(); return; }
    try { recognition.start(); } catch { setStatus('Não foi possível iniciar o microfone.'); }
  });
  document.querySelectorAll('[data-shell-action="new"]').forEach(button =>
    button.addEventListener('click', () => { stop(); setStatus(''); })
  );
  window.addEventListener('pagehide', stop);
  updateButton();
})();
