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

function install(){
  if(!form||!input)return false;
  const original=form.onsubmit;
  if(typeof original!=='function'||original.__contextWrapped)return false;

  const wrapped=async function(e){
    const text=input.value.trim();
    const hasStoreContext=norm(ctx?.textContent||'').includes('loja:');

    if(hasStoreContext&&isNewSearch(text)){
      e?.preventDefault?.();
      const beforeCount=document.querySelectorAll('#msgs .msg').length;

      input.value='limpar filtros';
      await original.call(form,{preventDefault(){}});

      const afterReset=[...document.querySelectorAll('#msgs .msg')];
      afterReset.slice(beforeCount).forEach(node=>node.remove());

      input.value=text;
      return original.call(form,{preventDefault(){}});
    }

    return original.call(form,e||{preventDefault(){}});
  };

  wrapped.__contextWrapped=true;
  form.onsubmit=wrapped;
  return true;
}

if(!install()){
  const timer=setInterval(()=>{
    if(install())clearInterval(timer);
  },50);
  setTimeout(()=>clearInterval(timer),5000);
}
