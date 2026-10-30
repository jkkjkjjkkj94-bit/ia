const msgs=document.getElementById('msgs');
if(msgs){
  const style=document.createElement('style');
  style.textContent=`
    .msg.typing{display:inline-flex;align-items:center;gap:7px;min-width:88px;color:#666}
    .typing-label{font-size:14px}
    .typing-dots{display:inline-flex;gap:3px;align-items:center}
    .typing-dots i{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.28;animation:localAiTyping 1.05s infinite ease-in-out}
    .typing-dots i:nth-child(2){animation-delay:.16s}.typing-dots i:nth-child(3){animation-delay:.32s}
    @keyframes localAiTyping{0%,60%,100%{transform:translateY(0);opacity:.25}30%{transform:translateY(-3px);opacity:1}}
  `;
  document.head.appendChild(style);

  let typingNode=null;
  let typingStarted=0;
  let internal=false;
  const minVisible=650;

  function showTyping(){
    if(typingNode?.isConnected)return;
    typingStarted=Date.now();
    typingNode=document.createElement('div');
    typingNode.className='msg bot typing';
    typingNode.innerHTML='<span class="typing-label">digitando</span><span class="typing-dots" aria-label="..."><i></i><i></i><i></i></span>';
    internal=true;
    msgs.appendChild(typingNode);
    internal=false;
    msgs.scrollTop=msgs.scrollHeight;
  }

  function revealBot(node){
    if(!typingNode?.isConnected)return;
    const wait=Math.max(0,minVisible-(Date.now()-typingStarted));
    node.style.visibility='hidden';
    setTimeout(()=>{
      if(typingNode?.isConnected)typingNode.remove();
      typingNode=null;
      node.style.visibility='';
      msgs.scrollTop=msgs.scrollHeight;
    },wait);
  }

  const observer=new MutationObserver(mutations=>{
    if(internal)return;
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(!(node instanceof HTMLElement))continue;
        if(node.classList.contains('msg')&&node.classList.contains('user')){
          showTyping();
          continue;
        }
        if(node.classList.contains('msg')&&node.classList.contains('bot')&&!node.classList.contains('typing')){
          revealBot(node);
        }
      }
    }
  });
  observer.observe(msgs,{childList:true});
}
