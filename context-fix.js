await new Promise(resolve=>setTimeout(resolve,80));
const body=document.body;
const sidebar=document.querySelector('.app-sidebar');
const msgs=document.getElementById('msgs');
const q=document.getElementById('q');
const form=document.getElementById('chatForm');
const heroTitle=document.querySelector('.hero h1');
const heroPhrases=[
  'O que você procura?',
  'O que você quer encontrar?',
  'Procurando alguma coisa?',
  'Onde você quer ir?',
  'O que podemos encontrar para você?',
  'Que tipo de lugar você procura?',
  'O que você está procurando hoje?',
  'Vamos encontrar o lugar certo?'
];
if(heroTitle){
  let last='';
  try{last=sessionStorage.getItem('guru_last_hero_phrase')||''}catch{}
  const choices=heroPhrases.filter(x=>x!==last);
  const phrase=choices[Math.floor(Math.random()*choices.length)]||heroPhrases[0];
  heroTitle.textContent=phrase;
  try{sessionStorage.setItem('guru_last_hero_phrase',phrase)}catch{}
}
const shellActions={new:()=>document.getElementById('resetBtn')?.click(),location:()=>document.getElementById('locBtn')?.click()};
sidebar?.addEventListener('click',e=>{const btn=e.target.closest('[data-shell-action]');if(btn)shellActions[btn.dataset.shellAction]?.()});
sidebar?.querySelector('.sidebar-collapse')?.addEventListener('click',()=>body.classList.toggle('sidebar-collapsed'));
const syncChatState=()=>body.classList.toggle('chat-started',!!msgs?.querySelector('.msg.user'));
syncChatState();
if(msgs)new MutationObserver(syncChatState).observe(msgs,{childList:true,subtree:true});
async function safeImport(path){try{await import(path)}catch(error){console.error('[GURU] Falha ao carregar módulo:',path,error)}}
await safeImport('./core-data-router.js?v=3');
await safeImport('./ai-engine.js?v=15');
await safeImport('./guru-intelligence-v2.js?v=2');

function sanitizeCategorySynonyms(){
  const tax=window.LocalAITaxonomy?.active;
  if(!tax)return;
  const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  for(const[category,groups]of Object.entries(tax)){
    const categoryNorm=normalize(category);
    for(const[group,terms]of Object.entries(groups||{})){
      if(!Array.isArray(terms))continue;
      groups[group]=terms.filter(term=>normalize(term)!==categoryNorm);
    }
  }
}
sanitizeCategorySynonyms();
setTimeout(sanitizeCategorySynonyms,250);

await safeImport('./category-context-fix.js?v=3');
await safeImport('./establishment-semantics.js?v=1');
await safeImport('./guru-regression-fix.js?v=1');
await safeImport('./semantic-query-guard.js?v=9');
await safeImport('./guru-session-v3.js?v=3');
await safeImport('./guru-language-tests.js?v=2');
await safeImport('./ai-conversation-enhancements.js?v=2');
await safeImport('./real-location.js?v=1');
await safeImport('./hashtag-search.js?v=3');
await safeImport('./regular-results-ui.js?v=3');
await safeImport('./card-standardizer.js?v=3');
await safeImport('./verified-store-badge.js?v=1');
await safeImport('./zero-result-responses.js?v=2');
await safeImport('./entity-wording.js?v=1');
await safeImport('./typing-indicator.js?v=3');

function ensureNoCoverStyles(){
  if(document.getElementById('localAiNoCoverStyles'))return;
  const style=document.createElement('style');
  style.id='localAiNoCoverStyles';
  style.textContent=`
.store-result-card .store-card-photo,
.store-result-card .store-card-cover,
.store-result-card .smart-cover,
.store-result-card .smart-banner,
.store-result-card .smart-hero,
.store-result-card .card-cover,
.store-result-card .store-cover{display:none!important}
.store-result-card .store-card-actions a[href*="google.com/maps"]{display:none!important}
`;
  document.head.appendChild(style);
}
ensureNoCoverStyles();

function ensureCompactCardStyles(){
  if(document.getElementById('localAiCompactCardStyles'))return;
  const style=document.createElement('style');
  style.id='localAiCompactCardStyles';
  style.textContent=`
.store-results-grid{gap:10px!important}
.store-result-card.smart-card{padding:11px 13px!important;border-radius:14px!important}
.store-result-card .smart-store-logo{width:42px!important;height:42px!important;flex-basis:42px!important}
.store-result-card .store-card-top{gap:9px!important}
.store-result-card .store-card-top h3{font-size:14px!important;margin-bottom:2px!important}
.store-result-card .smart-location{font-size:10px!important;margin-top:0!important}
.store-result-card .store-card-meta{margin-top:3px!important}
.store-result-card .smart-facts{margin-top:6px!important;gap:4px!important}
.store-result-card .smart-facts .store-chip,.store-result-card .store-card-meta .store-chip{padding:3px 6px!important;font-size:9px!important}
.store-result-card .smart-specialties{margin-top:7px!important;padding-top:7px!important}
.store-result-card .smart-specialties b{margin-bottom:4px!important;font-size:9.5px!important}
.store-result-card .smart-specialties-list{gap:4px!important}
.store-result-card .smart-specialty{padding:3px 6px!important;font-size:9px!important}
.store-result-card .smart-specialty:nth-child(n+4){display:none!important}
.store-result-card .smart-summary{margin-top:7px!important;font-size:10px!important;line-height:1.35!important;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.store-result-card .smart-why-btn{margin-top:6px!important;font-size:9.5px!important}
.store-result-card .smart-why-panel{margin-top:6px!important;padding:7px 8px!important}
.store-result-card .store-card-actions{margin-top:8px!important;gap:5px!important}
.store-result-card .store-action,.store-result-card .smart-link{padding:6px 9px!important;font-size:9.5px!important}
.store-result-card .card-rating{display:none!important}
.hashtag-intro{margin-bottom:8px!important}
@media(max-width:680px){.store-result-card.smart-card{padding:10px 11px!important}.store-result-card .smart-store-logo{width:38px!important;height:38px!important;flex-basis:38px!important}}
`;
  document.head.appendChild(style);
}
ensureCompactCardStyles();

function compactCards(root=document){
  const cards=[];
  if(root.matches?.('.store-result-card'))cards.push(root);
  root.querySelectorAll?.('.store-result-card').forEach(card=>cards.push(card));
  cards.forEach(card=>{
    card.querySelectorAll('.store-card-meta .store-chip').forEach(chip=>{if(/^★\s*\d/i.test(chip.textContent.trim()))chip.remove()});
    card.querySelectorAll('.store-card-actions a').forEach(a=>{if(a.textContent.trim().toLowerCase()==='como chegar')a.remove()});
  });
  const resultMessages=[];
  if(root.matches?.('.hashtag-result-msg'))resultMessages.push(root);
  root.querySelectorAll?.('.hashtag-result-msg').forEach(msg=>resultMessages.push(msg));
  resultMessages.forEach(msg=>{
    const count=msg.querySelectorAll('.store-result-card').length;
    const intro=msg.querySelector('.hashtag-intro');
    if(intro&&count>0)intro.textContent=`${count} ${count===1?'opção encontrada':'opções encontradas'} · Melhor correspondência primeiro`;
  });
}
compactCards();
if(msgs)new MutationObserver(mutations=>{for(const m of mutations)m.addedNodes.forEach(n=>{if(n.nodeType===1)compactCards(n)})}).observe(msgs,{childList:true,subtree:true});

document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{if(!q||!form)return;q.value=b.dataset.q||'';form.requestSubmit()}));
document.getElementById('resetBtn')?.addEventListener('click',()=>{window.GuruSessionV3?.clear?.();window.LocalAIEngine?.reset?.();if(msgs){const d=document.createElement('div');d.className='msg bot';d.textContent='Pronto. Limpei o contexto da busca. O que você procura agora?';msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}});
