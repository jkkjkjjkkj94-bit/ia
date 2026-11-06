// GURU Voice 3 — ditado resiliente, confirmação antes da busca e respostas apenas em texto.
(() => {
  'use strict';
  const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = document.getElementById('guruVoiceMic');
  const input = document.getElementById('q');
  const form = document.getElementById('chatForm');
  const status = document.getElementById('guruVoiceStatus');
  if (!mic || !input || !form) return;

  let recognition = null;
  let state = 'idle';
  let finalText = '';
  let interimText = '';
  let initialText = '';
  let heardSpeech = false;
  let stopping = false;
  let intentionalStop = false;
  let lastError = '';
  let restartCount = 0;
  let silenceTimer = null;
  let restartTimer = null;
  let sessionId = 0;
  let pendingSubmit = false;
  const MAX_RESTARTS = 2;
  const SILENCE_MS = 8500;
  const statusText = message => { if (status) status.textContent = message || ''; };
  const clearTimers = () => {
    clearTimeout(silenceTimer);
    clearTimeout(restartTimer);
    silenceTimer = null;
    restartTimer = null;
  };
  const setState = next => {
    state = next;
    const active = next === 'starting' || next === 'listening' || next === 'stopping';
    mic.classList.toggle('is-listening', active);
    mic.classList.toggle('is-starting', next === 'starting');
    mic.setAttribute('aria-pressed', String(active));
    mic.setAttribute('aria-label', active ? 'Finalizar gravação e pesquisar' : 'Falar com a GURU');
    mic.title = active ? 'Finalizar gravação e pesquisar' : 'Falar com a GURU';
  };
  const join = (...parts) => parts.map(x => String(x || '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const renderTranscript = () => {
    const next = join(initialText, finalText, interimText);
    input.value = next;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const armSilence = () => {
    clearTimeout(silenceTimer);
    if (state !== 'listening') return;
    silenceTimer = setTimeout(() => {
      if (state !== 'listening') return;
      if (heardSpeech && join(finalText, interimText)) {
        statusText('Pausa detectada. Finalizando sua pergunta…');
        finish(true);
      } else {
        statusText('Ainda não detectei sua voz. Fale próximo ao microfone ou toque para cancelar.');
        armSilence();
      }
    }, SILENCE_MS);
  };
  const send = () => {
    if (!pendingSubmit) return;
    pendingSubmit = false;
    const query = join(initialText, finalText, interimText);
    if (!query || !join(finalText, interimText)) {
      statusText('Não consegui identificar a pergunta. Tente novamente ou digite.');
      return;
    }
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    statusText('Pergunta reconhecida. Pesquisando…');
    if (window.GuruEngineV4 && typeof window.GuruEngineV4.submitText === 'function') {
      Promise.resolve(window.GuruEngineV4.submitText(query))
        .then(() => { if (state === 'idle') statusText(''); })
        .catch(() => statusText('Não foi possível pesquisar. O texto continua no campo para enviar.'));
    } else {
      // Evita perder o texto se o motor de busca ainda estiver carregando.
      statusText('Pergunta captada. Toque em enviar para pesquisar.');
    }
  };
  const finish = shouldSubmit => {
    if (state === 'idle') return;
    clearTimers();
    intentionalStop = true;
    stopping = true;
    pendingSubmit = !!shouldSubmit;
    setState('stopping');
    try { recognition?.stop(); }
    catch { setState('idle'); send(); }
  };
  const reset = () => {
    clearTimers();
    pendingSubmit = false;
    intentionalStop = true;
    sessionId++;
    if (recognition && state !== 'idle') {
      try { recognition.abort(); } catch {}
    }
    setState('idle');
    finalText = '';
    interimText = '';
    initialText = '';
    heardSpeech = false;
    stopping = false;
    statusText('');
  };
  if (!SpeechAPI) {
    mic.disabled = true;
    mic.title = 'Reconhecimento de fala indisponível neste navegador';
    statusText('O reconhecimento de fala não está disponível neste navegador. Você ainda pode digitar.');
    return;
  }
  const createRecognition = () => {
    const r = new SpeechAPI();
    r.lang = 'pt-BR';
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    r.onstart = () => {
      if (intentionalStop || state === 'idle') { try { r.abort(); } catch {} return; }
      setState('listening');
      statusText('Microfone ativo. Pode falar; o texto aparece enquanto você fala.');
      armSilence();
    };
    r.onspeechstart = () => {
      heardSpeech = true;
      statusText('Captando sua voz…');
      armSilence();
    };
    r.onresult = event => {
      if (intentionalStop || state === 'idle') return;
      let interim = '';
      // Resultados anteriores podem voltar em eventos subsequentes; não duplicar.
      const confirmed = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = String(result?.[0]?.transcript || '').trim();
        if (!text) continue;
        if (result.isFinal) confirmed.push(text);
        else interim = join(interim, text);
      }
      finalText = join(...confirmed);
      interimText = interim;
      if (finalText || interimText) {
        heardSpeech = true;
        statusText(interimText ? 'Transcrevendo… continue falando.' : 'Fala captada. Continue ou toque no microfone para enviar.');
        renderTranscript();
        armSilence();
      }
    };
    r.onerror = event => {
      if (intentionalStop) return;
      const messages = {
        'not-allowed': 'Acesso ao microfone negado. Autorize o microfone nas permissões do navegador.',
        'service-not-allowed': 'O serviço de reconhecimento de voz foi bloqueado neste navegador.',
        'audio-capture': 'Não foi possível acessar o microfone. Verifique se ele está conectado e permitido.',
        'network': 'A conexão com o reconhecimento de voz falhou. Verifique a internet.',
        'language-not-supported': 'O idioma português não está disponível neste navegador.',
        'no-speech': 'Não ouvi sua voz. Tente falar mais perto do microfone.'
      };
      lastError = event.error || 'unknown';
      if (lastError !== 'no-speech') statusText(messages[lastError] || 'Falha ao captar áudio. Tente novamente.');
      if (['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'].includes(lastError)) {
        intentionalStop = true;
        pendingSubmit = false;
      }
    };
    r.onend = () => {
      clearTimeout(silenceTimer);
      if (recognition !== r) return;
      if (intentionalStop || stopping) {
        stopping = false;
        setState('idle');
        send();
        return;
      }
      // Alguns navegadores encerram o reconhecimento durante uma pausa curta.
      // Retomada limitada, sem solicitar permissão novamente.
      if (restartCount < MAX_RESTARTS && !['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported', 'network'].includes(lastError)) {
        restartCount++;
        setState('starting');
        statusText('Reconectando ao microfone…');
        restartTimer = setTimeout(() => {
          if (state !== 'starting' || intentionalStop) return;
          try { r.start(); } catch {
            setState('idle');
            statusText('O microfone parou. Toque para tentar novamente.');
          }
        }, 320);
      } else {
        setState('idle');
        if (join(finalText, interimText)) {
          pendingSubmit = true;
          send();
        } else if (!lastError || lastError === 'no-speech') {
          statusText('Não consegui captar a fala. Tente novamente.');
        }
      }
    };
    return r;
  };
  const begin = () => {
    clearTimers();
    sessionId++;
    initialText = input.value.trim();
    finalText = '';
    interimText = '';
    heardSpeech = false;
    stopping = false;
    intentionalStop = false;
    pendingSubmit = false;
    lastError = '';
    restartCount = 0;
    recognition = createRecognition();
    setState('starting');
    statusText('Ativando microfone… permita o acesso caso seja solicitado.');
    try { recognition.start(); }
    catch {
      setState('idle');
      statusText('Não foi possível ativar o microfone. Verifique as permissões e tente novamente.');
    }
  };
  mic.addEventListener('click', () => {
    if (state !== 'idle') { finish(true); return; }
    begin();
  });
  // Enviar manualmente cancela a captura para não duplicar a pergunta.
  form.addEventListener('submit', () => {
    if (state !== 'idle') {
      clearTimers();
      pendingSubmit = false;
      intentionalStop = true;
      try { recognition?.abort(); } catch {}
      setState('idle');
    }
  }, true);
  document.querySelectorAll('[data-shell-action="new"]').forEach(button => button.addEventListener('click', reset));
  window.addEventListener('pagehide', reset);
  setState('idle');
})();
