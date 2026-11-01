const msgs=document.getElementById('msgs');
if(msgs){
  const style=document.createElement('style');
  style.id='localAiTypingStyles';
  style.textContent=`
    .msg.typing{display:inline-flex;align-items:center;gap:8px;min-width:108px;color:#666;opacity:.95}
    .typing-label{font-size:13px;font-weight:500}
    .typing-dots{display:inline-flex;gap:3px;align-items:center}
    .typing-dots i{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.25;animation:localAiTyping 1.05s infinite ease-in-out}
    .typing-dots i:nth-child(2){animation-delay:.16s}.typing-dots i:nth-child(3){animation-delay:.32s}
    .msg.bot.ai-streaming::after{content:'▍';display:inline-block;margin-left:2px;opacity:.55;animation:localAiCursor .8s steps(1) infinite}
    .msg.bot.ai-reveal-rich{animation:localAiRevealRich .28s ease both}
    .msg.bot.ai-reveal-rich .store-result-card,.msg.bot.ai-reveal-rich .normal-result-card{animation:localAiCardIn .32s ease both}
    .msg.bot.ai-reveal-rich .store-result-card:nth-child(2),.msg.bot.ai-reveal-rich .normal-result-card:nth-child(2){animation-delay:.05s}
    .msg.bot.ai-reveal-rich .store-result-card:nth-child(3),.msg.bot.ai-reveal-rich .normal-result-card:nth-child(3){animation-delay:.1s}
    @keyframes localAiTyping{0%,60%,100%{transform:translateY(0);opacity:.25}30%{transform:translateY(-3px);opacity:1}}
    @keyframes localAiCursor{0%,49%{opacity:.55}50%,100%{opacity:0}}
    @keyframes localAiRevealRich{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
    @keyframes localAiCardIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    @media(prefers-reduced-motion:reduce){.typing-dots i,.msg.bot.ai-streaming::after,.msg.bot.ai-reveal-rich,.msg.bot.ai-reveal-rich .store-result-card,.msg.bot.ai-reveal-rich .normal-result-card{animation:none!important}}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);

  let typingNode=null;
  let typingStarted=0;
  let internal=false;
  let streamToken=0;
  const minVisible=480;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function scroll(){msgs.scrollTop=msgs.scrollHeight}
  function showTyping(){
    if(typingNode?.isConnected)return;
    typingStarted=Date.now();
    typingNode=document.createElement('div');
    typingNode.className='msg bot typing';
    typingNode.setAttribute('role','status');
    typingNode.setAttribute('aria-live','polite');
    typingNode.innerHTML='<span class="typing-label">pensando</span><span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    internal=true;msgs.appendChild(typingNode);internal=false;scroll();
  }
  async function waitThinking(){
    const left=Math.max(0,minVisible-(Date.now()-typingStarted));
    if(left)await sleep(left);
    if(typingNode?.isConnected)typingNode.remove();
    typingNode=null;
  }
  function hasRichContent(node){
    return !!node.querySelector('.store-results-grid,.store-result-card,.normal-result-card,.chat-actions,button,a,article')||node.children.length>0;
  }
  function chunks(text){
    if(text.length<90)return text.match(/.{1,2}/gs)||[];
    if(text.length<220)return text.match(/.{1,3}/gs)||[];
    return text.match(/.{1,4}/gs)||[];
  }
  async function streamText(node,text,token){
    node.classList.add('ai-streaming');
    node.textContent='';
    const parts=chunks(text);
    const delay=text.length<90?18:text.length<220?14:10;
    for(const part of parts){
      if(token!==streamToken||!node.isConnected)break;
      node.append(document.createTextNode(part));
      scroll();
      await sleep(delay);
    }
    if(token===streamToken){node.textContent=text;node.classList.remove('ai-streaming');scroll()}
  }
  async function revealBot(node){
    const token=++streamToken;
    node.style.visibility='hidden';
    await waitThinking();
    if(!node.isConnected||token!==streamToken)return;
    await sleep(35);
    node.style.visibility='';
    if(hasRichContent(node)){
      node.classList.add('ai-reveal-rich');
      scroll();
      return;
    }
    const text=node.textContent||'';
    if(!text.trim())return;
    await streamText(node,text,token);
  }

  const observer=new MutationObserver(mutations=>{
    if(internal)return;
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(!(node instanceof HTMLElement))continue;
        if(node.classList.contains('msg')&&node.classList.contains('user')){showTyping();continue}
        if(node.classList.contains('msg')&&node.classList.contains('bot')&&!node.classList.contains('typing'))revealBot(node);
      }
    }
  });
  observer.observe(msgs,{childList:true});
  window.LocalAITyping={show:showTyping,hide:async()=>waitThinking()};
}
