const form=document.getElementById('chatForm');
const input=document.getElementById('q');
let bypass=false;
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const newSearchWords=['comida','pizzaria','pizza','restaurante','lanchonete','hamburgueria','mercado','supermercado','farmacia','drogaria','roupa','roupas','camiseta','camisa','vestido','moda','pet shop','petshop','tecnologia','informatica','celular','computador','beleza','salao','barbearia','servico','servicos','oficina','autopecas','construcao','ferragem'];
const followupWords=['horario','abre','fecha','pix','pagamento','entrega','endereco','onde fica','distancia','produto','produtos','preco','valor','essa loja','esta loja','ela','dela'];
function isNewSearch(text){
  const n=norm(text).trim();
  if(!n)return false;
  const hasCategory=newSearchWords.some(w=>n.includes(w));
  const looksLikeSearch=/\b(quero|procuro|procurando|preciso|encontre|achar|busco|buscando|tem|onde tem)\b/.test(n)||/\bloja\s+de\b/.test(n);
  const isFollowup=followupWords.some(w=>n.includes(w))&&!looksLikeSearch;
  return hasCategory&&looksLikeSearch&&!isFollowup;
}
form.addEventListener('submit',e=>{
  if(bypass){bypass=false;return}
  const original=input.value.trim();
  if(!isNewSearch(original))return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const before=[...document.querySelectorAll('#msgs .msg')];
  bypass=true;
  input.value='limpar filtros';
  form.requestSubmit();
  setTimeout(()=>{
    const after=[...document.querySelectorAll('#msgs .msg')];
    after.slice(before.length).forEach(x=>x.remove());
    bypass=true;
    input.value=original;
    form.requestSubmit();
  },0);
},true);
