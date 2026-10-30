const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const ctx=document.getElementById('ctx');
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

const commercialWords=['comida','pizzaria','pizza','restaurante','lanchonete','hamburgueria','mercado','supermercado','farmacia','drogaria','roupa','roupas','camiseta','camisa','vestido','moda','boutique','pet shop','petshop','tecnologia','informatica','celular','computador','beleza','salao','barbearia','servico','servicos','oficina','autopecas','construcao','ferragem','padaria','cafeteria'];

function isNewSearch(text){
  const n=norm(text).trim();
  if(!n)return false;
  const hasCommercialIntent=commercialWords.some(w=>n.includes(w));
  const hasSearchIntent=/\b(quero|procuro|procurando|preciso|busco|buscando|encontre|encontrar|ache|achar)\b/.test(n)||/\bloja\s+(de|para)\b/.test(n);
  return hasCommercialIntent&&hasSearchIntent;
}

window.addEventListener('load',()=>{
  if(!form||!input)return;
  const originalHandler=form.onsubmit;
  if(typeof originalHandler!=='function')return;

  form.addEventListener('submit',async e=>{
    const text=input.value.trim();
    const hasStoreContext=norm(ctx?.textContent||'').includes('loja:');
    if(!hasStoreContext||!isNewSearch(text))return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const beforeCount=document.querySelectorAll('#msgs .msg').length;

    input.value='limpar filtros';
    await originalHandler.call(form,{preventDefault(){}});

    const allAfterReset=[...document.querySelectorAll('#msgs .msg')];
    allAfterReset.slice(beforeCount).forEach(node=>node.remove());

    input.value=text;
    await originalHandler.call(form,{preventDefault(){}});
  },true);
});