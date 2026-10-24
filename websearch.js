(()=>{
  const msgs=document.getElementById('msgs');
  if(!msgs)return;

  const FUNCTION_URL='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/web-search';
  const PUBLISHABLE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
  const FALLBACK='Ainda não tenho uma resposta para isso. Registrei sua pergunta para o administrador.';

  const style=document.createElement('style');
  style.textContent=`
    .web-answer{white-space:pre-wrap}
    .web-searching{display:flex;align-items:center;gap:7px;color:#64748b;font-size:12px}
    .web-searching:before{content:'◌';display:inline-block;animation:webSpin .8s linear infinite}
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

  async function searchWeb(question,bubble){
    if(!question||bubble.dataset.webSearching==='1')return;
    bubble.dataset.webSearching='1';
    bubble.innerHTML='<div class="web-searching">Pesquisando na internet...</div>';
    try{
      const r=await fetch(FUNCTION_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},
        body:JSON.stringify({query:question})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data?.error||'Falha na pesquisa');
      bubble.innerHTML='';
      const answer=document.createElement('div');answer.className='web-answer';answer.textContent=data.answer||'Não encontrei uma resposta clara na internet.';
      bubble.appendChild(answer);
      renderSources(bubble,data.sources);
      bubble.dataset.webAnswered='1';
    }catch(err){
      console.error('Pesquisa web:',err);
      bubble.textContent='Não consegui pesquisar na internet agora. Tente novamente em instantes.';
      bubble.dataset.webError='1';
    }
    msgs.scrollTop=msgs.scrollHeight;
  }

  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(!(node instanceof HTMLElement))continue;
        if(!node.classList.contains('msg')||!node.classList.contains('bot'))continue;
        if(node.dataset.typing==='true')continue;
        if(node.textContent.trim()!==FALLBACK)continue;
        const user=previousUser(node);
        if(user)searchWeb(user.textContent.trim(),node);
      }
    }
  });
  observer.observe(msgs,{childList:true});
})();