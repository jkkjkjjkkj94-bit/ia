(()=>{
  const msgs=document.getElementById('msgs');
  if(!msgs)return;

  const FUNCTION_URL='https://ccsypggvelcxsqszepfs.supabase.co/functions/v1/web-search';
  const REST_URL='https://ccsypggvelcxsqszepfs.supabase.co/rest/v1/answer_feedback';
  const PUBLISHABLE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
  const FALLBACKS=new Set([
    'Ainda não tenho uma resposta para isso. Registrei sua pergunta para o administrador.',
    'Não consegui acessar a base agora.',
    'Não consegui acessar a base de conhecimento agora.',
    'Erro ao acessar a base.'
  ]);
  const meta=new WeakMap();

  const style=document.createElement('style');
  style.textContent=`
    .web-answer{white-space:pre-wrap;line-height:1.62}
    .web-searching{display:flex;align-items:center;gap:7px;color:#6f6f6f;font-size:11px;font-weight:650}
    .web-searching:before{content:'◌';display:inline-block;animation:webSpin .8s linear infinite;color:#111}
    .web-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid #e7e7e5}
    .web-confidence{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;background:#f5f5f3;border:1px solid #e3e3e0;color:#444;font-size:9px;font-weight:800}
    .web-confidence[data-level="baixa"],.web-confidence[data-level="média"],.web-confidence[data-level="alta"]{background:#f5f5f3;border-color:#e3e3e0;color:#444}
    .source-toggle,.feedback-btn{border:1px solid #e0e0dd;background:#fff;color:#1b1b1b;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:800;cursor:pointer;transition:.18s ease}
    .source-toggle:hover,.feedback-btn:hover{background:#f2f2f0;border-color:#d0d0cc}
    .feedback-wrap{display:inline-flex;gap:5px;margin-left:auto}
    .feedback-btn.on{background:#0b0b0b;border-color:#0b0b0b;color:#fff}
    .web-sources{margin-top:10px;padding-top:10px;border-top:1px solid #e7e7e5;display:none;gap:7px}
    .web-sources.on{display:grid}
    .web-sources-title{font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#777}
    .web-source{display:flex;align-items:center;gap:8px;text-decoration:none;color:#111;background:#fff;border:1px solid #e2e2df;border-radius:12px;padding:9px 10px;font-size:10px;max-width:100%;transition:.18s ease}
    .web-source:hover{background:#f5f5f3;border-color:#cececa;transform:translateY(-1px)}
    .web-source span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .web-source-domain{color:#969696;font-size:9px;margin-left:auto;flex:0 0 auto}
    .feedback-note{font-size:9px;color:#777;margin-top:8px}
    @keyframes webSpin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(style);

  function previousUser(node){
    let p=node.previousElementSibling;
    while(p){if(p.classList?.contains('msg')&&p.classList.contains('user'))return p;p=p.previousElementSibling}
    const all=[...msgs.querySelectorAll('.msg.user')];
    return all.at(-1)||null;
  }

  function bubbleText(node){
    if(node.classList?.contains('user'))return (node.textContent||'').trim();
    const a=node.querySelector?.('.web-answer');
    return ((a?.textContent||node.textContent)||'').trim();
  }

  function collectHistory(bubble,currentQuestion){
    const all=[...msgs.querySelectorAll('.msg')];
    const stop=all.indexOf(bubble);
    const prior=(stop>=0?all.slice(0,stop):all)
      .filter(n=>!n.dataset.typing&&!n.classList.contains('typing-indicator'))
      .map(n=>({role:n.classList.contains('user')?'user':'assistant',text:bubbleText(n)}))
      .filter(x=>x.text&&!FALLBACKS.has(x.text)&&!/^Preparando resposta/.test(x.text));
    if(prior.at(-1)?.role==='user'&&prior.at(-1)?.text===currentQuestion)prior.pop();
    return prior.slice(-10);
  }

  function safeSourceUrl(raw){
    try{const u=new URL(raw);return /^https?:$/.test(u.protocol)?u:null}catch{return null}
  }

  async function typeAnswer(el,text){
    const words=String(text||'').split(/(\s+)/);
    if(words.length<12){el.textContent=text;return}
    el.textContent='';
    const chunk=Math.max(1,Math.ceil(words.length/90));
    for(let i=0;i<words.length;i+=chunk){
      el.textContent+=words.slice(i,i+chunk).join('');
      if(i%4===0){msgs.scrollTop=msgs.scrollHeight;await new Promise(r=>setTimeout(r,8));}
    }
  }

  function renderConfidence(metaRow,data){
    if(!data.confidence)return;
    const badge=document.createElement('div');
    badge.className='web-confidence';
    badge.dataset.level=data.confidence;
    const score=Number.isFinite(Number(data.confidence_score))?` • ${Number(data.confidence_score)}%`:'';
    badge.textContent=`Confiança: ${data.confidence}${score}`;
    if(data.confidence_reason)badge.title=data.confidence_reason;
    metaRow.appendChild(badge);
  }

  function buildSources(bubble,sources){
    const valid=(sources||[]).map(s=>({...s,u:safeSourceUrl(s.url)})).filter(s=>s.u).slice(0,5);
    if(!valid.length)return null;
    const wrap=document.createElement('div');wrap.className='web-sources';
    const title=document.createElement('div');title.className='web-sources-title';title.textContent='Fontes consultadas';wrap.appendChild(title);
    for(const s of valid){
      const a=document.createElement('a');a.className='web-source';a.href=s.u.href;a.target='_blank';a.rel='noopener noreferrer nofollow';
      const name=document.createElement('span');name.textContent=s.title||s.u.hostname;
      const domain=document.createElement('span');domain.className='web-source-domain';domain.textContent=s.u.hostname.replace(/^www\./,'');
      a.append(name,domain);wrap.appendChild(a);
    }
    bubble.appendChild(wrap);
    return {wrap,valid};
  }

  async function saveFeedback(question,data,rating){
    try{
      await fetch(REST_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY,'Authorization':`Bearer ${PUBLISHABLE_KEY}`,'Prefer':'return=minimal'},
        body:JSON.stringify({
          question,
          answer:data.answer||'',
          rating,
          confidence:data.confidence||null,
          intent:data.intent||null,
          sources:data.sources||[],
          engine:data.engine||null,
          response_ms:Number.isFinite(Number(data.response_ms))?Number(data.response_ms):null,
          correction:Boolean(data.correction),
          stages:data.stages||[]
        })
      });
    }catch(e){console.error('Feedback BuscaIA:',e)}
  }

  function renderControls(bubble,question,data,sourceInfo){
    const row=document.createElement('div');row.className='web-meta';
    renderConfidence(row,data);
    if(sourceInfo){
      const toggle=document.createElement('button');toggle.type='button';toggle.className='source-toggle';toggle.textContent=`Ver fontes (${sourceInfo.valid.length})`;
      toggle.onclick=()=>{const on=sourceInfo.wrap.classList.toggle('on');toggle.textContent=on?'Ocultar fontes':`Ver fontes (${sourceInfo.valid.length})`;msgs.scrollTop=msgs.scrollHeight;};
      row.appendChild(toggle);
    }
    const fw=document.createElement('div');fw.className='feedback-wrap';
    const up=document.createElement('button');up.type='button';up.className='feedback-btn';up.textContent='👍';up.title='Resposta útil';
    const down=document.createElement('button');down.type='button';down.className='feedback-btn';down.textContent='👎';down.title='Resposta incorreta';
    up.onclick=async()=>{if(bubble.dataset.feedback)return;bubble.dataset.feedback='up';up.classList.add('on');await saveFeedback(question,data,'up');};
    down.onclick=async()=>{
      if(bubble.dataset.feedback)return;bubble.dataset.feedback='down';down.classList.add('on');await saveFeedback(question,data,'down');
      const note=document.createElement('div');note.className='feedback-note';note.textContent='Refazendo a pesquisa com outras fontes…';bubble.appendChild(note);
      if(bubble.dataset.retryDone!=='1'){bubble.dataset.retryDone='1';setTimeout(()=>searchWeb(question,bubble,true),120);}
    };
    fw.append(up,down);row.appendChild(fw);bubble.appendChild(row);
  }

  function shouldRescue(text){
    const t=String(text||'').trim();
    return FALLBACKS.has(t)||/^Não consegui acessar a base/i.test(t)||/^Erro ao acessar a base/i.test(t);
  }

  async function searchWeb(question,bubble,retry=false){
    if(!question)return;
    if(bubble.dataset.webSearching==='1'&&!retry)return;
    bubble.dataset.webSearching='1';
    const history=collectHistory(bubble,question);
    bubble.innerHTML='<div class="web-searching">Preparando resposta...</div>';
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6500);
    try{
      const r=await fetch(FUNCTION_URL,{
        method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},
        body:JSON.stringify({query:question,history,retry})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data?.error||'Falha ao responder');
      bubble.innerHTML='';
      const answer=document.createElement('div');answer.className='web-answer';bubble.appendChild(answer);
      await typeAnswer(answer,data.answer||'Não consegui formular uma resposta clara.');
      const sourceInfo=data.mode==='web'?buildSources(bubble,data.sources):null;
      renderControls(bubble,question,data,sourceInfo);
      bubble.dataset.webAnswered='1';
      bubble.dataset.answerMode=data.mode||'direct';
      bubble.dataset.webSearching='0';
      meta.set(bubble,{question,data});
    }catch(err){
      console.error('BuscaIA:',err);
      bubble.textContent=err?.name==='AbortError'?'A resposta demorou mais que o esperado. Tente novamente.':'Não consegui responder agora. Tente novamente em instantes.';
      bubble.dataset.webError='1';bubble.dataset.webSearching='0';
    }finally{clearTimeout(timer)}
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
        if(user)searchWeb(user.textContent.trim(),node,false);
      }
    }
  });
  observer.observe(msgs,{childList:true});
})();