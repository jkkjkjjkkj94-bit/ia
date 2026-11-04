import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const core=createClient('https://ccsypggvelcxsqszepfs.supabase.co','sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG');
const aiView=document.getElementById('ai');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
function ensureCard(){
  if(!aiView||document.getElementById('guruQualityCard'))return;
  const grid=aiView.querySelector('.admin-grid')||aiView;
  const card=document.createElement('div');card.className='card';card.id='guruQualityCard';
  card.innerHTML='<div class="section-head"><div><h3>Qualidade do GURU</h3><div class="meta">Interpretação, sucesso, cliques e testes automáticos.</div></div><button id="guruQualityRefresh" class="btn sm" type="button">Atualizar</button></div><div class="cards" style="margin-top:12px"><div class="stat"><span>Buscas analisadas</span><b id="gqTotal">0</b></div><div class="stat"><span>Sucesso</span><b id="gqSuccess">0%</b></div><div class="stat"><span>Sem resultado</span><b id="gqFail">0</b></div><div class="stat"><span>Seleções</span><b id="gqClicks">0</b></div><div class="stat"><span>Confiança média</span><b id="gqConfidence">—</b></div><div class="stat"><span>Testes de linguagem</span><b id="gqTests">—</b></div></div><div class="grid admin-grid" style="margin-top:14px"><div><h4>Principais falhas</h4><div id="gqFailures" class="list compact-list"></div></div><div><h4>Termos problemáticos</h4><div id="gqUnknown" class="list compact-list"></div></div><div><h4>Grupos mais buscados</h4><div id="gqGroups" class="list compact-list"></div></div><div><h4>Filtros mais usados</h4><div id="gqFilters" class="list compact-list"></div></div><div><h4>Correções / normalizações</h4><div id="gqCorrections" class="list compact-list"></div></div><div><h4>Testes automáticos</h4><div id="gqTestList" class="list compact-list"></div></div></div>';
  grid.appendChild(card);
  const ops=document.createElement('div');ops.className='card';ops.id='guruOperationalCard';
  ops.style.marginTop='14px';
  ops.innerHTML='<div class="section-head"><div><h3>GURU · Inteligência e operações</h3><div class="meta">Uso real da OpenAI, limites de segurança e qualidade dos cadastros. Apenas administradores.</div></div></div>'
    +'<div class="cards" style="margin-top:12px"><div class="stat"><span>OpenAI · Respostas hoje</span><b id="gqApiSuccess">—</b></div><div class="stat"><span>OpenAI · Falhas hoje</span><b id="gqApiErrors">—</b></div><div class="stat"><span>Chamadas liberadas hoje</span><b id="gqQuotaToday">—</b></div><div class="stat"><span>Limite diário</span><b>300</b></div><div class="stat"><span>Lojas com dados antigos</span><b id="gqStale">—</b></div><div class="stat"><span>Lojas sem imagem</span><b id="gqNoPhoto">—</b></div><div class="stat"><span>Cadastros incompletos</span><b id="gqIncomplete">—</b></div><div class="stat"><span>Sugestões em revisão</span><b id="gqPendingSuggestions">—</b></div></div>'
    +'<div class="meta" id="gqOperationalNotice" style="margin-top:12px">Os indicadores do servidor não incluem uma estimativa financeira; consulte também os custos na plataforma OpenAI.</div>';
  grid.appendChild(ops);card.querySelector('#guruQualityRefresh')?.addEventListener('click',load);
}
function rowsList(id,items,empty='Sem dados suficientes.'){
  const el=document.getElementById(id);if(!el)return;
  el.innerHTML=items.length?items.map(x=>`<div class="item"><div><b>${esc(x.label)}</b>${x.meta?`<div class="meta">${esc(x.meta)}</div>`:''}</div><span class="badge">${esc(x.value)}</span></div>`).join(''):`<div class="meta">${esc(empty)}</div>`;
}
function countBy(rows,key){const m=new Map();for(const r of rows){const v=typeof key==='function'?key(r):r[key];if(v===null||v===undefined||v==='')continue;m.set(v,(m.get(v)||0)+1)}return[...m].sort((a,b)=>b[1]-a[1])}
function failures(rows){return countBy(rows.filter(r=>!r.matched),r=>r.normalized_query||r.query).slice(0,8).map(([label,value])=>({label,value:value+'x'}))}
function problemTerms(rows){
  const stop=new Set('quero loja lojas comercio comercios comida de da do das dos uma um com sem aberta aberto agora hoje amanha mais perto entrega para que nao nao'.split(' '));const m=new Map();
  rows.filter(r=>!r.matched).forEach(r=>norm(r.query).split(' ').filter(w=>w.length>3&&!stop.has(w)).forEach(w=>m.set(w,(m.get(w)||0)+1)));
  return[...m].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label,value])=>({label,value:value+'x'}));
}
function corrections(rows){
  const m=new Map();for(const r of rows){const q=norm(r.query),n=norm(r.normalized_query);if(!q||!n||q===n)continue;const k=r.query+' → '+r.normalized_query;m.set(k,(m.get(k)||0)+1)}
  return[...m].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label,value])=>({label,value:value+'x'}));
}
function filters(rows){
  const a=[];rows.forEach(r=>{if(r.category)a.push('Categoria: '+r.category);if(r.group_name)a.push('Grupo: '+r.group_name);if(r.day!==null&&r.day!==undefined)a.push('Dia da semana');if(r.time_period)a.push('Período: '+r.time_period)});
  return countBy(a,x=>x).slice(0,8).map(([label,value])=>({label,value:value+'x'}));
}
function testReport(){try{return JSON.parse(localStorage.getItem('guru_language_test_report')||'null')}catch{return null}}
function metricText(id,value){const target=document.getElementById(id);if(target)target.textContent=String(value)}
async function loadV5Metrics(){
 const today=new Date().toISOString().slice(0,10);
 const [metrics,quota,stores,suggestions]=await Promise.all([
  sb.from('guru_hybrid_metrics').select('outcome,calls').eq('metric_day',today),
  sb.from('guru_hybrid_quota').select('hits').eq('bucket','global:daily').gte('period',today+'T00:00:00Z').order('period',{ascending:false}).limit(1),
  core.from('local_ai_stores').select('id,active,status,updated_at,name,address,logo_url,description,phone,whatsapp,payment_methods').eq('active',true).eq('status','active').limit(1000),
  sb.from('local_ai_synonym_suggestions').select('id',{count:'exact',head:true}).eq('status','pending')
 ]);
 const outcomes=metrics.data||[];
 const count=k=>outcomes.filter(x=>x.outcome===k).reduce((sum,x)=>sum+Number(x.calls||0),0);
 metricText('gqApiSuccess',metrics.error?'Indisponível':count('success'));
 metricText('gqApiErrors',metrics.error?'Indisponível':outcomes.filter(x=>x.outcome!=='success').reduce((sum,x)=>sum+Number(x.calls||0),0));
 metricText('gqQuotaToday',quota.error?'Indisponível':Number(quota.data?.[0]?.hits||0));
 const data=stores.data||[];
 const isStale=x=>{const d=Date.parse(x.updated_at||'');return Number.isFinite(d)&&Date.now()-d>90*86400000};
 const missing=x=>[x.address,x.description,x.phone||x.whatsapp,x.logo_url,Array.isArray(x.payment_methods)&&x.payment_methods.length].filter(v=>!v).length;
 metricText('gqStale',stores.error?'Indisponível':data.filter(isStale).length);
 metricText('gqNoPhoto',stores.error?'Indisponível':data.filter(x=>!x.logo_url).length);
 metricText('gqIncomplete',stores.error?'Indisponível':data.filter(x=>missing(x)>0).length);
 metricText('gqPendingSuggestions',suggestions.error?'Indisponível':suggestions.count??0);
 const notice=document.getElementById('gqOperationalNotice');
 if(notice)notice.textContent=metrics.error||quota.error?'Sem autorização para alguns indicadores do servidor. Confira o perfil administrador no AIDB.':'OpenAI: contagem registrada pela Edge Function. Pesquisas e falhas sem resultado: relatórios do navegador, sujeitos a registros incompletos. Orçamento financeiro: OpenAI Platform.';
}
async function load(){
  ensureCard();if(!document.getElementById('guruQualityCard'))return;const since=new Date(Date.now()-7*86400000).toISOString();
  const[q,s]=await Promise.all([
    sb.from('local_ai_quality_events').select('*').gte('created_at',since).order('created_at',{ascending:false}).limit(500),
    sb.from('local_ai_search_events').select('query,event_type,store_id,matched,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(1000)
  ]);
  if(q.error){document.getElementById('gqFailures').innerHTML='<div class="meta">Sem acesso aos eventos de qualidade.</div>';return}
  const rows=(q.data||[]).filter(r=>!r.event_type||r.event_type==='search'),events=s.data||[],ok=rows.filter(r=>r.matched).length,fail=rows.length-ok,conf=rows.map(r=>r.confidence).filter(v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))).map(Number),clicks=events.filter(r=>r.event_type==='selection').length,report=testReport();
  document.getElementById('gqTotal').textContent=rows.length;document.getElementById('gqSuccess').textContent=rows.length?Math.round(ok/rows.length*100)+'%':'0%';document.getElementById('gqFail').textContent=fail;document.getElementById('gqClicks').textContent=clicks;document.getElementById('gqConfidence').textContent=conf.length?(conf.reduce((a,b)=>a+b,0)/conf.length).toFixed(2):'—';document.getElementById('gqTests').textContent=report?`${report.passed}/${report.total}`:'—';
  rowsList('gqFailures',failures(rows),'Nenhuma falha registrada nos últimos 7 dias.');rowsList('gqUnknown',problemTerms(rows));rowsList('gqGroups',countBy(rows,'group_name').slice(0,8).map(([label,value])=>({label,value:value+'x'})));rowsList('gqFilters',filters(rows));rowsList('gqCorrections',corrections(rows),'Nenhuma correção registrada.');
  rowsList('gqTestList',report?(report.results||[]).map(x=>({label:x.q,value:x.pass?'OK':'FALHOU',meta:x.pass?'':JSON.stringify(x.got)})):[],'Abra o chat uma vez para executar os testes automáticos.');
  await loadV5Metrics();
}
ensureCard();document.querySelector('[data-view="ai"]')?.addEventListener('click',()=>setTimeout(load,80));document.getElementById('refreshBtn')?.addEventListener('click',()=>setTimeout(load,250));setTimeout(load,700);
