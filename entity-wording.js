const msgs=document.getElementById('msgs');
let writing=false;
function state(){return window.LocalAIEngine&&window.LocalAIEngine.state}
function rewriteText(text){
  const s=state();if(!text||!s||s.category!=='Comida')return text;
  return String(text)
    .replace(/nenhuma loja de/gi,'nenhuma opção de')
    .replace(/uma loja de/gi,'uma opção de')
    .replace(/lojas compatíveis/gi,'estabelecimentos compatíveis')
    .replace(/as lojas/gi,'os estabelecimentos')
    .replace(/achei as lojas/gi,'achei os estabelecimentos')
    .replace(/nenhuma loja cadastrada/gi,'nenhum estabelecimento cadastrado')
    .replace(/loja cadastrada/gi,'opção cadastrada');
}
function botOf(node){
  if(!node)return null;
  const el=node.nodeType===1?node:node.parentElement;
  return el&&el.closest?el.closest('.msg.bot'):null;
}
function transform(node){
  if(writing||!node||!node.classList||!node.classList.contains('bot'))return;
  if(node.querySelector('.store-result-card,.normal-result-card,.chat-actions'))return;
  const before=node.textContent||'';
  const after=rewriteText(before);
  if(after!==before){writing=true;node.textContent=after;setTimeout(()=>{writing=false},0)}
}
function scan(root){
  root=root||document;
  if(root.matches&&root.matches('.msg.bot'))transform(root);
  if(root.querySelectorAll)root.querySelectorAll('.msg.bot').forEach(transform);
}
scan(document);
if(msgs)new MutationObserver(records=>{
  if(writing)return;
  records.forEach(r=>{
    if(r.type==='characterData')transform(botOf(r.target));
    r.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n);else transform(botOf(n))});
  });
}).observe(msgs,{childList:true,characterData:true,subtree:true});
window.GuruEntityWording={rewriteText,scan};
