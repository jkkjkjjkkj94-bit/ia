const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const ctx=document.getElementById('ctx');

function normalizeText(value=''){
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function isNewCommercialSearch(text){
  const n=normalizeText(text);
  const hasNewSearchVerb=/\b(quero|procuro|procurando|preciso|busco|buscar|encontre|encontrar|ache|achar)\b/.test(n);
  const hasCommercialIntent=/\b(loja|lojas|pizzaria|pizza|restaurante|lanchonete|hamburgueria|farmacia|drogaria|mercado|supermercado|roupa|roupas|vestuario|boutique|pet ?shop|padaria|cafeteria|salao|barbearia|oficina|autopecas|informatica|tecnologia|comida)\b/.test(n);
  const isStoreQuestion=/\b(horario|abre|fecha|pix|pagamento|entrega|endereco|onde fica|produto|produtos|preco|valor)\b/.test(n) && !hasCommercialIntent;
  return hasNewSearchVerb && hasCommercialIntent && !isStoreQuestion;
}

window.addEventListener('load',()=>{
  if(!form||!input)return;
  const originalHandler=form.onsubmit;
  if(typeof originalHandler!=='function')return;

  form.addEventListener('submit',async event=>{
    const originalText=input.value.trim();
    const hasStoreContext=normalizeText(ctx?.textContent||'').includes('loja:');
    if(!hasStoreContext||!isNewCommercialSearch(originalText))return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const before=[...document.querySelectorAll('#msgs .msg')];
    input.value='limpar filtros';
    await originalHandler.call(form,{preventDefault(){}});

    const after=[...document.querySelectorAll('#msgs .msg')];
    after.slice(before.length).forEach(node=>node.remove());

    input.value=originalText;
    await originalHandler.call(form,{preventDefault(){}});
  },true);
});