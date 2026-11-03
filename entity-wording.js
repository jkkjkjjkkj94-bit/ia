const msgs=document.getElementById('msgs');
function state(){return window.LocalAIEngine?.state}
function rewriteText(text){
  const s=state();if(!text||s?.category!=='Comida')return text;
  return String(text)
    .replace(/nenhuma loja de/gi,'nenhuma opção de')
    .replace(/uma loja de/gi,'uma opção de')
    .replace(/lojas compatíveis/gi,'estabelecimentos compatíveis')
    .replace(/as lojas/gi,'os estabelecimentos')
    .replace(/achei as lojas/gi,'achei os estabelecimentos')
    .replace(/nenhuma loja cadastrada/gi,'nenhum estabelecimento cadastrado')
    .replace(/loja cadastrada/gi,'opção cadastrada');
}
function transform(node){
  if(!(node instanceof HTMLElement)||!node.classList.contains('bot'))return;
  if(node.querySelector('.store-result-card,.normal-result-card,.chat-actions'))return;
  const before=node.textContent||'',after=rewriteText(before);
  if(after!==before)node.textContent=after;
}
function scan(root=document){
  if(root.matches?.('.msg.bot'))transform(root);
  root.querySelectorAll?.('.msg.bot').forEach(transform);
}
scan();
if(msgs)new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)scan(n)}).observe(msgs,{childList:true,subtree:true});
window.GuruEntityWording={rewriteText,scan};
