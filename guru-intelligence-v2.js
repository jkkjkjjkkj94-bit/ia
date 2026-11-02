const CORE_URL='https://ccsypggvelcxsqszepfs.supabase.co';
const CORE_KEY='sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG';
const AI_URL='https://innziuzgtpfsiywqmies.supabase.co';
const AI_KEY='sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1';
const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const days=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const stop=new Set('quero queria preciso procuro procurar loja lojas lugar lugares local locais de da do das dos uma um no na em com sem que para por aberta aberto abertas abertos agora hoje amanha amanhã depois antes mais menos'.split(' '));
let lastQuery='';
let lastTelemetryKey='';
let fallbackBusy=false;

function engine(){return window.LocalAIEngine}
function state(){return engine()?.state}
function addDays(base,n){const d=new Date(base);d.setDate(d.getDate()+n);return d.getDay()}
function parseClock(text,kind){
  const n=norm(text);
  const re=kind==='after'?/(?:depois das?|apos as?|a partir das?)\s*(\d{1,2})(?::(\d{2}))?/:/(?:antes das?|ate as?)\s*(\d{1,2})(?::(\d{2}))?/;
  const m=n.match(re);if(!m)return null;const h=Number(m[1]),mi=Number(m[2]||0);return h>=0&&h<=23&&mi>=0&&mi<=59?h*60+mi:null;
}
function applyTemporalContext(text){
  const s=state();if(!s)return;
  const n=norm(text),now=new Date();
  const map={domingo:0,segunda:1,'segunda feira':1,terca:2,'terca feira':2,quarta:3,'quarta feira':3,quinta:4,'quinta feira':4,sexta:5,'sexta feira':5,sabado:6};
  let day=null;
  if(/\bdepois de amanha\b/.test(n))day=addDays(now,2);
  else if(/\bamanha\b/.test(n))day=addDays(now,1);
  else if(/\bhoje\b/.test(n))day=now.getDay();
  else for(const[k,v]of Object.entries(map)){if(new RegExp(`(?:^|\\s)${k.replace(/ /g,'\\s+')}(?:\\s|$)`).test(n)){day=v;break}}
  if(day!==null){s.day=day;s.openNow=false}
  if(/\bagora\b|abert[oa]s? agora/.test(n)){s.openNow=true;s.day=null}
  if(/\bmanha\b|de manha/.test(n)){s.timePeriod='morning';s.timeStart=360;s.timeEnd=720}
  if(/\balmoco\b|hora do almoco/.test(n)){s.timePeriod='lunch';s.timeStart=660;s.timeEnd=900}
  if(/\btarde\b/.test(n)){s.timePeriod='afternoon';s.timeStart=720;s.timeEnd=1080}
  if(/\bnoite\b|a noite|de noite/.test(n)){s.timePeriod='night';s.timeStart=1080;s.timeEnd=1439}
  if(/\bmadrugada\b/.test(n)){s.timePeriod='late';s.timeStart=0;s.timeEnd=360}
  if(/ate tarde|até tarde|fica aberto ate tarde|fica aberta ate tarde/.test(text.toLowerCase())){s.timePeriod='late_open';s.timeStart=1260;s.timeEnd=null}
  const after=parseClock(text,'after'),before=parseClock(text,'before');
  if(after!==null){s.timePeriod='after';s.timeStart=after;s.timeEnd=null}
  if(before!==null){s.timePeriod='before';s.timeEnd=before;s.timeStart=null}
}
function protectContext(text){
  const s=state();if(!s)return;
  const n=norm(text);
  const generic=[['comida','Comida'],['roupa','Roupas'],['roupas','Roupas'],['tecnologia','Tecnologia'],['farmacia','Farmácia'],['mercado','Mercado'],['beleza','Beleza']];
  const exact=generic.find(([t])=>new RegExp(`(?:^|\\s)${t}(?:\\s|$)`).test(n));
  const hasSpecific=/pizza|pizzaria|japonesa|japones|sushi|hamburg|doceria|doce|sorvete|acai|açai|padaria|pastel|churrasco|marmita/.test(n);
  if(exact&&!hasSpecific){s.category=exact[1];s.group=null;s.product=null;s.specialty=null;s.term=null;s.selectedProduct=null;s.selectedStore=null}
  if(/qualquer tipo|qualquer grupo|tanto faz/.test(n)){s.group=null;s.product=null;s.specialty=null;s.term=null}
  applyTemporalContext(text);
}
function sanitizeTaxonomy(){
  const tax=engine()?.getTaxonomy?.();if(!tax)return;
  for(const[category,groups]of Object.entries(tax)){
    const c=norm(category);
    for(const[group,terms]of Object.entries(groups||{}))if(Array.isArray(terms))groups[group]=terms.filter(t=>norm(t)!==c);
  }
}
function snapshot(){
  const s=state();if(!s)return;
  const snap={category:s.category,group:s.group,day:s.day,timeStart:s.timeStart,timeEnd:s.timeEnd,timePeriod:s.timePeriod,openNow:s.openNow,delivery:s.delivery,location:s.location,product:s.product,updatedAt:Date.now()};
  try{sessionStorage.setItem('guru_context_v2',JSON.stringify(snap))}catch{}
}
function tokens(text){return norm(text).split(' ').filter(w=>w.length>2&&!stop.has(w))}
async function rest(url,key,path){const r=await fetch(url+'/rest/v1/'+path,{headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
function mins(v){if(!v)return null;const x=String(v);return Number(x.slice(0,2))*60+Number(x.slice(3,5))}
function scheduleOk(store,hours,s){
  if(!s)return true;
  const now=new Date();const day=s.day??now.getDay();
  if(!s.openNow&&s.day==null&&s.timeStart==null&&s.timeEnd==null)return true;
  const h=hours.find(x=>x.store_id===store.id&&Number(x.weekday)===Number(day));
  if(!h||h.closed||!h.opens_at||!h.closes_at)return false;
  const open=mins(h.opens_at),close=mins(h.closes_at);
  if(s.openNow){const cur=now.getHours()*60+now.getMinutes();return cur>=open&&cur<=close}
  if(s.timeStart!=null&&close<=s.timeStart)return false;
  if(s.timeEnd!=null&&open>=s.timeEnd)return false;
  return true;
}
function textScore(query,store,products,knowledge){
  const q=tokens(query);if(!q.length)return 0;
  const ps=products.filter(p=>p.store_id===store.id&&p.active!==false&&p.show_in_ai!==false&&Number(p.stock)>0);
  const ks=knowledge.filter(k=>k.store_id===store.id&&k.active!==false);
  const hay=norm([store.name,store.category,store.group,(store.groups||[]).join(' '),(store.specialties||[]).join(' '),store.description,...ps.flatMap(p=>[p.name,p.description,p.category]),...ks.flatMap(k=>[k.question,(k.variations||[]).join(' '),k.answer])].join(' '));
  let hits=0;for(const w of q)if(hay.includes(w))hits++;
  return hits/q.length;
}
function structuredScore(store,s){
  let score=0;
  if(s?.category&&norm(store.category)===norm(s.category))score+=45;
  const gs=[store.group,...(store.groups||[])].map(norm);
  if(s?.group&&gs.includes(norm(s.group)))score+=55;
  if(s?.delivery===true&&store.delivery)score+=15;
  if(store.verified)score+=4;
  return score;
}
function card(store,reason){
  const c=document.createElement('div');c.className='store-result-card';c.dataset.guruHybrid='1';
  c.innerHTML=`<div class="store-card-top"><div><h3></h3><div class="store-card-meta"></div></div></div><div class="smart-summary"></div><div class="store-card-actions"></div>`;
  c.querySelector('h3').textContent=store.name||'Comércio';
  const meta=c.querySelector('.store-card-meta');[store.category,store.group].filter(Boolean).forEach(x=>{const e=document.createElement('span');e.className='store-chip';e.textContent=x;meta.appendChild(e)});
  c.querySelector('.smart-summary').textContent=reason;
  const actions=c.querySelector('.store-card-actions');
  const view=document.createElement('button');view.type='button';view.className='store-action primary';view.textContent='Ver loja';view.onclick=()=>{if(input&&form){input.value=store.name;form.requestSubmit()}};actions.appendChild(view);
  const prod=document.createElement('button');prod.type='button';prod.className='store-action';prod.textContent='Produtos';prod.onclick=()=>{if(input&&form){input.value=`produtos da ${store.name}`;form.requestSubmit()}};actions.appendChild(prod);
  return c;
}
async function hybridFallback(){
  if(fallbackBusy||!lastQuery||!msgs)return;
  const lastBot=[...msgs.querySelectorAll('.msg.bot')].at(-1);if(!lastBot||lastBot.dataset.guruHybridDone==='1')return;
  const txt=norm(lastBot.textContent);if(!/nao encontrei|nenhuma loja|nenhum resultado|combinacao ficou|combinação ficou/.test(txt))return;
  fallbackBusy=true;lastBot.dataset.guruHybridDone='1';
  try{
    const s=state();
    const[stores,products,hours,knowledge]=await Promise.all([
      rest(CORE_URL,CORE_KEY,'local_ai_stores?select=*&active=eq.true&status=eq.active'),
      rest(CORE_URL,CORE_KEY,'local_ai_products?select=*&active=eq.true&show_in_ai=eq.true'),
      rest(AI_URL,AI_KEY,'local_ai_store_hours?select=*'),
      rest(AI_URL,AI_KEY,'local_ai_store_knowledge?select=*&active=eq.true')
    ]);
    const ranked=[];
    for(const st of stores){
      if(s?.category&&norm(st.category)!==norm(s.category))continue;
      if(s?.group){const gs=[st.group,...(st.groups||[])].map(norm);if(!gs.includes(norm(s.group)))continue}
      if(s?.delivery===true&&!st.delivery)continue;
      if(!scheduleOk(st,hours,s))continue;
      const semantic=textScore(lastQuery,st,products,knowledge),structured=structuredScore(st,s);
      const score=structured+semantic*60;
      if(score<25)continue;
      ranked.push({store:st,score,semantic});
    }
    ranked.sort((a,b)=>b.score-a.score);
    const top=ranked.slice(0,5);if(!top.length)return;
    lastBot.textContent=`Encontrei ${top.length} ${top.length===1?'opção relacionada':'opções relacionadas'} usando busca híbrida.`;
    const grid=document.createElement('div');grid.className='store-results-grid';grid.dataset.guruHybrid='1';
    top.forEach(x=>grid.appendChild(card(x.store,`Correspondência por categoria, dados do comércio e conteúdo cadastrado${x.semantic>0?' · similaridade textual':''}.`)));
    lastBot.appendChild(grid);
    if(s){s.lastResults=top.map(x=>({store:x.store,score:x.score,reasons:['busca híbrida'],products:[]}))}
  }catch(e){console.warn('[GURU] fallback híbrido indisponível',e)}finally{fallbackBusy=false}
}
function improveWhy(root=document){
  const s=state();if(!s)return;
  const cards=[];if(root.matches?.('.store-result-card'))cards.push(root);root.querySelectorAll?.('.store-result-card').forEach(c=>cards.push(c));
  cards.forEach(c=>{
    const p=c.querySelector('.smart-why-panel');if(!p||p.dataset.guruWhy==='1')return;
    const reasons=[];
    if(s.category)reasons.push(`corresponde à categoria ${s.category}`);
    if(s.group)reasons.push(`corresponde ao grupo ${s.group}`);
    if(s.day!=null)reasons.push(`tem horário compatível com ${days[s.day]}`);
    if(s.timePeriod)reasons.push('funciona no período solicitado');
    if(s.delivery===true)reasons.push('atende ao filtro de entrega');
    const chipText=[...c.querySelectorAll('.smart-facts .store-chip')].map(x=>x.textContent.trim());
    const dist=chipText.find(x=>/km$/.test(x));if(dist)reasons.push(`fica a ${dist}`);
    const rate=chipText.find(x=>x.startsWith('★'));if(rate)reasons.push(`tem avaliação ${rate.replace('★','').trim()}`);
    if(chipText.some(x=>/Aberta agora/i.test(x)))reasons.push('está aberta agora');
    if(reasons.length){p.innerHTML='';reasons.forEach(r=>{const d=document.createElement('div');d.textContent=r;p.appendChild(d)});p.dataset.guruWhy='1'}
  });
}
async function telemetry(){
  const s=state();if(!lastQuery||!s)return;
  const count=msgs?.querySelectorAll('.store-result-card').length||0;
  const key=[lastQuery,s.category,s.group,s.day,count].join('|');if(key===lastTelemetryKey)return;lastTelemetryKey=key;
  const lastBot=[...msgs.querySelectorAll('.msg.bot')].at(-1);
  const failure=count===0?(lastBot?.textContent?.slice(0,220)||'sem resultado'):null;
  const body={query:lastQuery,normalized_query:norm(lastQuery),category:s.category||null,group_name:s.group||null,day:s.day??null,time_period:s.timePeriod||null,result_count:count,matched:count>0,confidence:Number(s.confidence?.overall??s.confidence??0)||null,failure_reason:failure};
  try{await fetch(AI_URL+'/rest/v1/local_ai_quality_events',{method:'POST',headers:{apikey:AI_KEY,Authorization:'Bearer '+AI_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)})}catch{}
}
function schedulePostProcessing(){setTimeout(()=>{snapshot();sanitizeTaxonomy();improveWhy();hybridFallback().then(()=>{setTimeout(()=>{improveWhy();telemetry()},350)})},650)}
form?.addEventListener('submit',()=>{const q=input?.value?.trim();if(!q)return;lastQuery=q;protectContext(q);sanitizeTaxonomy();schedulePostProcessing()},true);
if(msgs)new MutationObserver(ms=>{for(const m of ms)m.addedNodes.forEach(n=>{if(n.nodeType===1)improveWhy(n)});schedulePostProcessing()}).observe(msgs,{childList:true,subtree:true});
sanitizeTaxonomy();
window.GuruIntelligenceV2={protectContext,applyTemporalContext,snapshot,hybridFallback,sanitizeTaxonomy};
