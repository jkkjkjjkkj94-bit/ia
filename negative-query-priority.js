const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const NEG=/\b(?:mas\s+)?(?:nao|sem|menos|exceto|tirando|evitar|excluir)\b/;
const stopWords=new Set(['uma','um','uns','umas','de','do','da','dos','das','com','e','ou','que','seja','ser','quero','queria']);

function taxonomy(){return window.LocalAITaxonomy?.active||window.LocalAITaxonomy?.taxonomy||{}}
function aliases(){return window.LocalAITaxonomy?.categoryAliases||{}}
function splitQuery(text){const n=norm(text),m=NEG.exec(n);if(!m)return null;const before=n.slice(0,m.index).trim();const after=n.slice(m.index+m[0].length).trim();if(!after)return null;const words=after.split(' ').filter(w=>w&&!stopWords.has(w));return{before,after:words.slice(0,5).join(' ')}}
function findTaxonomyMatch(term){
  const n=norm(term);let best=null;
  for(const[category,groups]of Object.entries(taxonomy())){
    const cat=norm(category);
    // Só o NOME exato da categoria é tratado como exclusão de categoria.
    if(n===cat&&(!best||cat.length>best.len))best={kind:'category',category,label:category,term:cat,len:cat.length};
    for(const[group,groupAliases]of Object.entries(groups||{}))for(const raw of [group,...(Array.isArray(groupAliases)?groupAliases:[])]){const t=norm(raw);if(!t)continue;if((n===t||n.includes(t)||t.includes(n))&&(!best||t.length>best.len))best={kind:'group',category,group,label:group,term:t,len:t.length}}
  }
  return best;
}
function detectBaseCategory(text){
  const n=norm(text);let best=null;
  for(const[category,groups]of Object.entries(taxonomy())){
    for(const raw of [category,...(aliases()[category]||[])]){const t=norm(raw);if(t&&new RegExp(`(?:^|\\s)${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+')}(?:\\s|$)`).test(n)&&(!best||t.length>best.len))best={category,group:null,len:t.length}}
    for(const[group,groupAliases]of Object.entries(groups||{}))for(const raw of [group,...(Array.isArray(groupAliases)?groupAliases:[])]){const t=norm(raw);if(t&&new RegExp(`(?:^|\\s)${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+')}(?:\\s|$)`).test(n)&&(!best||t.length>best.len))best={category,group,len:t.length}}
  }
  return best;
}
function addUser(text){if(!msgs)return;const d=document.createElement('div');d.className='msg user';d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}
function resultText(r){const s=r?.store||r||{};return norm([s.name,s.category,s.group,(s.groups||[]).join(' '),(s.specialties||[]).join(' '),s.description,r?.product?.name,r?.product?.category,r?.product?.description].join(' '))}
function cardMatches(card,excluded){const n=norm(card.textContent||'');if(excluded.match?.kind==='group'){const g=norm(excluded.match.group);const chips=[...card.querySelectorAll('.store-chip,.smart-specialty')].map(x=>norm(x.textContent));if(chips.includes(g))return true}return excluded.term.split(' ').filter(Boolean).every(w=>n.includes(w))}
function applyExclusionToState(excluded,base){
  const s=window.LocalAIEngine?.state;if(!s)return;
  if(base?.category)s.category=base.category;
  if(base?.group&&norm(base.group)!==norm(excluded.match?.group))s.group=base.group;else if(excluded.match?.kind==='group'&&norm(s.group)===norm(excluded.match.group))s.group=null;
  if(excluded.match?.kind==='category')s.excludedCategories?.add?.(norm(excluded.match.category));
  if(excluded.match?.kind==='group')s.excludedGroups?.add?.(norm(excluded.match.group));
  s.excludedTerms=s.excludedTerms instanceof Set?s.excludedTerms:new Set();s.excludedTerms.add(excluded.term);
  s.product=null;s.term=null;s.specialty=null;s.selectedProduct=null;s.selectedStore=null;
  if(Array.isArray(s.lastResults))s.lastResults=s.lastResults.filter(r=>!resultText(r).includes(excluded.term));
}
function removeExcludedCards(excluded){document.querySelectorAll('.store-result-card,.normal-result-card').forEach(card=>{if(cardMatches(card,excluded))card.remove()});document.querySelectorAll('.store-results-grid').forEach(grid=>{const count=grid.querySelectorAll(':scope > .store-result-card,:scope > .normal-result-card').length;const intro=grid.closest('.msg')?.querySelector('.hashtag-intro');if(intro)intro.textContent=count?`${count} ${count===1?'opção encontrada':'opções encontradas'} · Melhor correspondência primeiro`:'Nenhuma opção encontrada com esses critérios.'})}
function renderContext(excluded){const s=window.LocalAIEngine?.state;if(!ctx||!s)return;const parts=[];if(s.category)parts.push('Categoria: '+s.category);if(s.group)parts.push('Grupo: '+s.group);parts.push('Excluir: '+excluded.label);if(s.day!=null){const days=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];parts.push('Dia: '+days[s.day])}if(s.openNow)parts.push('abertas agora');if(s.delivery===true)parts.push('com entrega');ctx.textContent='Contexto: '+parts.join(' · ')}
function buildExcluded(after){const match=findTaxonomyMatch(after);return{term:norm(match?.term||after),label:match?.label||after,match}}

form?.addEventListener('submit',async e=>{
  const original=input?.value?.trim();const engine=window.LocalAIEngine;if(!original||!engine)return;
  const split=splitQuery(original);if(!split)return;
  const excluded=buildExcluded(split.after),base=detectBaseCategory(split.before||original);if(!excluded.term)return;
  e.preventDefault();e.stopImmediatePropagation();addUser(original);input.value='';applyExclusionToState(excluded,base);
  const query=(split.before||base?.category||'lojas').trim();await engine.handle(query);applyExclusionToState(excluded,base);removeExcludedCards(excluded);renderContext(excluded);setTimeout(()=>{applyExclusionToState(excluded,base);removeExcludedCards(excluded);renderContext(excluded)},140);
},true);

window.GuruNegativePriority={splitQuery,findTaxonomyMatch,detectBaseCategory,buildExcluded,applyExclusionToState,removeExcludedCards};
