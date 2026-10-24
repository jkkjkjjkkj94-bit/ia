(()=>{
  const msgs=document.getElementById('msgs');
  if(!msgs)return;

  const FUNCTION_URL='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/web-search';
  const PUBLISHABLE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
  const FALLBACKS=new Set([
    'Ainda não tenho uma resposta para isso. Registrei sua pergunta para o administrador.',
    'Não consegui acessar a base agora.',
    'Não consegui acessar a base de conhecimento agora.',
    'Erro ao acessar a base.'
  ]);

  const style=document.createElement('style');
  style.textContent=`
    .web-answer{white-space:pre-wrap}
    .web-searching{display:flex;align-items:center;gap:7px;color:#64748b;font-size:12px}
    .web-searching:before{content:'◌';display:inline-block;animation:webSpin .8s linear infinite}
    .web-confidence{display:inline-flex;align-items:center;margin-top:9px;padding:4px 7px;border-radius:999px;background:#fff;border:1px solid #dbe3ec;color:#64748b;font-size:10px;font-weight:700}
    .web-confidence[data-level="baixa"]{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
    .web-confidence[data-level="média"]{background:#f8fafc;color:#475569}
    .web-confidence[data-level="alta"]{background:#f0fdf4;border-color:#bbf7d0;color:#166534}
    .web-sources{margin-top:10px;padding-top:9px;border-top:1px solid #dbe3ec;display:grid;gap:6px}
    .web-sources-title{font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:#64748b}
    .web-source{display:flex;align-items:center;gap:7px;text-decoration:none;color:#1d4ed8;background:#fff;border:1px solid #dbe3ec;border-radius:9px;padding:7px 9px;font-size:11px;max-width:100%}
    .web-source:hover{background:#f8fafc;border-color:#bfdbfe}
    .web-source span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .web-source-domain{color:#94a3b8;font-size:10px;margin-left:auto;flex:0 0 auto}
    @keyframes webSpin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(style);

  function previousUser(node){
    let p=node.previousElementSibling;
    while(p){if(p.classList?.contains('msg')&&p.classList.contains('user'))return p;p=p.previousElementSibling}
    const all=[...msgs.querySelectorAll('.msg.user')];
    return all.at(-1)||null;
  }

  function safeSourceUrl(raw){
    try{const u=new URL(raw);return /^https?:$/.test(u.protocol)?u:null}catch{return null}
  }

  function renderConfidence(bubble,level){
    if(!level)return;
    const allowed=['baixa','média','alta'];
    const value=allowed.includes(level)?level:'média';
    const badge=document.createElement('div');
    badge.className='web-confidence';
    badge.dataset.level=value;
    badge.textContent=`Confiança da busca: ${value}`;
    bubble.appendChild(badge);
  }

  function renderSources(bubble,sources){
    const valid=(sources||[]).map(s=>({...s,u:safeSourceUrl(s.url)})).filter(s=>s.u).slice(0,5);
    if(!valid.length)return;
    const wrap=document.createElement('div');wrap.className='web-sources';
    const title=document.createElement('div');title.className='web-sources-title';title.textContent='Fontes da internet';wrap.appendChild(title);
    for(const s of valid){
      const a=document.createElement('a');a.className='web-source';a.href=s.u.href;a.target='_blank';a.rel='noopener noreferrer nofollow';
      const name=document.createElement('span');name.textContent=s.title||s.u.hostname;
      const domain=document.createElement('span');domain.className='web-source-domain';domain.textContent=s.u.hostname.replace(/^www\./,'');
      a.append(name,domain);wrap.appendChild(a);
    }
    bubble.appendChild(wrap);
  }

  function shouldRescue(text){
    const t=String(text||'').trim();
    return FALLBACKS.has(t)||/^Não consegui acessar a base/i.test(t)||/^Erro ao acessar a base/i.test(t);
  }

  async function searchWeb(question,bubble){
    if(!question||bubble.dataset.webSearching==='1')return;
    bubble.dataset.webSearching='1';
    bubble.innerHTML='<div class="web-searching">Preparando resposta...</div>';
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6000);
    try{
      const r=await fetch(FUNCTION_URL,{
        method:'POST',
        signal:controller.signal,
        headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},
        body:JSON.stringify({query:question})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data?.error||'Falha ao responder');
      bubble.innerHTML='';
      const answer=document.createElement('div');answer.className='web-answer';answer.textContent=data.answer||'Não consegui formular uma resposta clara.';
      bubble.appendChild(answer);
      if(data.mode==='web'){
        renderConfidence(bubble,data.confidence);
        renderSources(bubble,data.sources);
      }
      bubble.dataset.webAnswered='1';
      bubble.dataset.answerMode=data.mode||'direct';
    }catch(err){
      console.error('BuscaIA:',err);
      bubble.textContent=err?.name==='AbortError'?'A resposta demorou mais que o esperado. Tente novamente.':'Não consegui responder agora. Tente novamente em instantes.';
      bubble.dataset.webError='1';
    }finally{
      clearTimeout(timer);
    }
    msgs.scrollTop=msgs.scrollHeight;
  }

  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(!(node instanceof HTMLElement))continue;
        if(!node.classList.contains('msg')||!node.classList.contains('bot'))continue;
        if(node.dataset.typing==='true')continue;
        if(!shouldRescue(node.textContent))continue;
        const user=previousUser(node);
        if(user)searchWeb(user.textContent.trim(),node);
      }
    }
  });
  observer.observe(msgs,{childList:true});
})();