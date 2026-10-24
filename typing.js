(()=>{
  const form=document.getElementById('chatForm');
  const msgs=document.getElementById('msgs');
  const input=document.getElementById('q');
  if(!form||!msgs||!input)return;

  const style=document.createElement('style');
  style.textContent=`
    .typing-indicator{display:flex!important;align-items:center;gap:8px;color:#64748b;min-height:40px}
    .typing-label{font-size:12px;font-weight:600}
    .typing-dots{display:inline-flex;align-items:center;gap:3px;height:12px}
    .typing-dots i{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.35;animation:buscaiaTyping 1.05s infinite ease-in-out}
    .typing-dots i:nth-child(2){animation-delay:.14s}
    .typing-dots i:nth-child(3){animation-delay:.28s}
    .typing-waiting-response{display:none!important}
    @keyframes buscaiaTyping{0%,60%,100%{transform:translateY(0);opacity:.3}30%{transform:translateY(-4px);opacity:1}}
  `;
  document.head.appendChild(style);

  const MIN_VISIBLE=250;
  let active=null;
  let pending=false;
  let started=0;
  let responseNode=null;
  let timer=null;

  function scrollBottom(){msgs.scrollTop=msgs.scrollHeight}

  function showTyping(){
    if(!pending)return;
    if(active)active.remove();
    const d=document.createElement('div');
    d.className='msg bot typing-indicator';
    d.dataset.typing='true';
    d.setAttribute('aria-live','polite');
    d.innerHTML='<span class="typing-label">BuscaIA está digitando</span><span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    msgs.appendChild(d);
    active=d;
    scrollBottom();
    if(responseNode)scheduleReveal(responseNode);
  }

  function scheduleReveal(node){
    if(!pending||!node)return;
    if(timer)clearTimeout(timer);
    const elapsed=performance.now()-started;
    const delay=Math.max(0,MIN_VISIBLE-elapsed);
    timer=setTimeout(()=>{
      if(active){active.remove();active=null}
      node.classList.remove('typing-waiting-response');
      pending=false;
      responseNode=null;
      timer=null;
      scrollBottom();
    },delay);
  }

  form.addEventListener('submit',()=>{
    if(!input.value.trim())return;
    if(timer){clearTimeout(timer);timer=null}
    if(active){active.remove();active=null}
    if(responseNode)responseNode.classList.remove('typing-waiting-response');
    pending=true;
    responseNode=null;
    started=performance.now();
    queueMicrotask(showTyping);
  },true);

  const observer=new MutationObserver(mutations=>{
    if(!pending)return;
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(!(node instanceof HTMLElement))continue;
        if(!node.classList.contains('msg')||!node.classList.contains('bot')||node.dataset.typing==='true')continue;
        node.classList.add('typing-waiting-response');
        responseNode=node;
        if(active)scheduleReveal(node);
        return;
      }
    }
  });
  observer.observe(msgs,{childList:true});
})();