const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

const rules=[
  {re:/\b(nao|sem|menos|exceto|tirando)\b.{0,18}\b(pizza|pizzaria)\b|\bmas\s+nao\s+(pizza|pizzaria)\b/,group:'Pizzaria'},
  {re:/\b(nao|sem|menos|exceto|tirando)\b.{0,18}\b(hamburguer|hamburgueria|lanche)\b|\bmas\s+nao\s+(hamburguer|hamburgueria|lanche)\b/,group:'Hamburgueria'},
  {re:/\b(nao|sem|menos|exceto|tirando)\b.{0,18}\b(japonesa|japones|sushi)\b|\bmas\s+nao\s+(japonesa|japones|sushi)\b/,group:'Japonesa'},
  {re:/\b(nao|sem|menos|exceto|tirando)\b.{0,18}\b(doceria|doce|doces)\b|\bmas\s+nao\s+(doceria|doce|doces)\b/,group:'Doceria'},
  {re:/\b(nao|sem|menos|exceto|tirando)\b.{0,18}\b(sorvete|sorveteria)\b|\bmas\s+nao\s+(sorvete|sorveteria)\b/,group:'Sorveteria'}
];

function addUser(text){if(!msgs)return;const d=document.createElement('div');d.className='msg user';d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}
function storeGroup(store){return [store?.group,...(Array.isArray(store?.groups)?store.groups:[])].filter(Boolean).map(norm)}
function removeExcludedCards(group){
  const g=norm(group);
  document.querySelectorAll('.store-result-card,.normal-result-card').forEach(card=>{
    const chips=[...card.querySelectorAll('.store-chip,.smart-specialty')].map(x=>norm(x.textContent));
    if(chips.includes(g))card.remove();
  });
  document.querySelectorAll('.store-results-grid').forEach(grid=>{
    const count=grid.querySelectorAll(':scope > .store-result-card,:scope > .normal-result-card').length;
    const intro=grid.closest('.msg')?.querySelector('.hashtag-intro');
    if(intro)intro.textContent=count?`${count} ${count===1?'opção encontrada':'opções encontradas'} · Melhor correspondência primeiro`:'Nenhuma opção encontrada com esses critérios.';
  });
}
function enforceState(group){
  const s=window.LocalAIEngine?.state;if(!s)return;
  const g=norm(group);
  s.category='Comida';
  if(norm(s.group)===g)s.group=null;
  s.product=null;s.term=null;s.specialty=null;s.selectedProduct=null;s.selectedStore=null;
  s.excludedGroups?.add?.(g);
  if(Array.isArray(s.lastResults))s.lastResults=s.lastResults.filter(r=>!storeGroup(r?.store).includes(g));
}
function renderContext(group){
  const s=window.LocalAIEngine?.state;if(!ctx||!s)return;
  const parts=['Categoria: Comida',`Excluir: ${group}`];
  if(s.day!=null){const days=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];parts.push('Dia: '+days[s.day])}
  if(s.openNow)parts.push('abertas agora');if(s.delivery===true)parts.push('com entrega');
  ctx.textContent='Contexto: '+parts.join(' · ');
}

form?.addEventListener('submit',async e=>{
  const original=input?.value?.trim();const engine=window.LocalAIEngine;if(!original||!engine)return;
  const n=norm(original),rule=rules.find(x=>x.re.test(n));if(!rule)return;
  e.preventDefault();e.stopImmediatePropagation();
  addUser(original);input.value='';
  enforceState(rule.group);
  await engine.handle('comida');
  enforceState(rule.group);
  removeExcludedCards(rule.group);
  renderContext(rule.group);
  setTimeout(()=>{enforceState(rule.group);removeExcludedCards(rule.group);renderContext(rule.group)},120);
},true);

window.GuruNegativePriority={rules,enforceState,removeExcludedCards};
