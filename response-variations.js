const resetResponses=[
  'Certo. Vamos começar uma nova busca. O que você procura?',
  'Filtros limpos. Pode me dizer o que deseja encontrar agora.',
  'Pronto. Removi os filtros anteriores. O que você quer buscar?',
  'Busca reiniciada. Me diga o que você está procurando.',
  'Tudo limpo. Podemos começar de novo. O que você precisa?',
  'Removi as restrições da busca. Qual loja, produto ou serviço você quer encontrar?',
  'Novo começo. Diga o que você procura e eu faço uma busca sem os filtros anteriores.',
  'Os filtros foram removidos. O que deseja pesquisar agora?'
];
let lastResetResponse='';
function chooseResetResponse(){
  const choices=resetResponses.filter(x=>x!==lastResetResponse);
  const picked=choices[Math.floor(Math.random()*choices.length)]||resetResponses[0];
  lastResetResponse=picked;
  return picked;
}
function isResetReply(text){
  const t=(text||'').trim().toLowerCase();
  return t==='certo. começamos uma nova busca. o que você procura?' ||
    t.includes('começamos uma nova busca') ||
    t.includes('comecamos uma nova busca');
}
function varyResetReply(node){
  if(!(node instanceof HTMLElement))return;
  const candidates=[];
  if(node.matches?.('.msg.bot'))candidates.push(node);
  node.querySelectorAll?.('.msg.bot').forEach(x=>candidates.push(x));
  for(const msg of candidates){
    if(isResetReply(msg.textContent))msg.textContent=chooseResetResponse();
  }
}
const msgs=document.getElementById('msgs');
if(msgs){
  msgs.querySelectorAll('.msg.bot').forEach(varyResetReply);
  new MutationObserver(records=>{
    for(const record of records){
      record.addedNodes.forEach(varyResetReply);
    }
  }).observe(msgs,{childList:true,subtree:true});
}
