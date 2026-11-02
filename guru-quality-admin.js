import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const aiView=document.getElementById('ai');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function ensureCard(){
  if(!aiView||document.getElementById('guruQualityCard'))return;
  const grid=aiView.querySelector('.admin-grid')||aiView;
  const card=document.createElement('div');card.className='card';card.id='guruQualityCard';
  card.innerHTML='<div class="section-head"><div><h3>Qualidade do GURU</h3><div class="meta">Interpretação, sucesso e buscas que precisam de ajuste.</div></div><button id="guruQualityRefresh" class="btn sm" type="button">Atualizar</button></div><div class="cards" style="margin-top:12px"><div class="stat"><span>Buscas analisadas</span><b id="gqTotal">0</b></div><div class="stat"><span>Sucesso</span><b id="gqSuccess">0%</b></div><div class="stat"><span>Sem resultado</span><b id="gqFail">0</b></div><div class="stat"><span>Confiança média</span><b id="gqConfidence">—</b></div></div><div style="margin-top:14px"><h4 style="margin:0 0 8px">Principais falhas</h4><div id="gqFailures" class="list compact-list"></div></div>';
  grid.appendChild(card);
  card.querySelector('#guruQualityRefresh')?.addEventListener('click',load);
}
function groupFailures(rows){
  const map=new Map();
  rows.filter(r=>!r.matched).forEach(r=>{const k=r.normalized_query||r.query;const x=map.get(k)||{query:r.query,count:0,reason:r.failure_reason,category:r.category,group:r.group_name};x.count++;map.set(k,x)});
  return[...map.values()].sort((a,b)=>b.count-a.count).slice(0,8);
}
async function load(){
  ensureCard();if(!document.getElementById('guruQualityCard'))return;
  const since=new Date(Date.now()-7*86400000).toISOString();
  const{data,error}=await sb.from('local_ai_quality_events').select('*').gte('created_at',since).order('created_at',{ascending:false}).limit(500);
  if(error){document.getElementById('gqFailures').innerHTML='<div class="meta">Sem acesso aos eventos de qualidade.</div>';return}
  const rows=data||[],ok=rows.filter(r=>r.matched).length,fail=rows.length-ok,conf=rows.map(r=>Number(r.confidence)).filter(Number.isFinite);
  document.getElementById('gqTotal').textContent=rows.length;
  document.getElementById('gqSuccess').textContent=rows.length?Math.round(ok/rows.length*100)+'%':'0%';
  document.getElementById('gqFail').textContent=fail;
  document.getElementById('gqConfidence').textContent=conf.length?(conf.reduce((a,b)=>a+b,0)/conf.length).toFixed(2):'—';
  const list=document.getElementById('gqFailures'),items=groupFailures(rows);
  list.innerHTML=items.length?items.map(x=>`<div class="item"><div><b>${esc(x.query)}</b><div class="meta">${esc([x.category&&'Categoria: '+x.category,x.group&&'Grupo: '+x.group,x.reason].filter(Boolean).join(' · '))}</div></div><span class="badge">${x.count}x</span></div>`).join(''):'<div class="meta">Nenhuma falha registrada nos últimos 7 dias.</div>';
}
ensureCard();
document.querySelector('[data-view="ai"]')?.addEventListener('click',()=>setTimeout(load,80));
document.getElementById('refreshBtn')?.addEventListener('click',()=>setTimeout(load,250));
setTimeout(load,700);
