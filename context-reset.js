const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function isNewCommercialSearch(text){const n=norm(text),hasVerb=/\b(quero|procuro|procurando|preciso|busco|buscar|encontre|encontrar|ache|achar)\b/.test(n),hasIntent=/\b(loja|lojas|pizzaria|pizza|restaurante|lanchonete|hamburgueria|farmacia|drogaria|mercado|supermercado|roupa|roupas|vestuario|boutique|pet ?shop|padaria|cafeteria|salao|barbearia|oficina|autopecas|informatica|tecnologia|comida)\b/.test(n);return hasVerb&&hasIntent}
form?.addEventListener('submit',()=>{const engine=window.LocalAIEngine,text=input?.value?.trim();if(!engine?.state||!text)return;if(engine.state.selectedStore&&isNewCommercialSearch(text))engine.reset?.()},true);
window.GuruContextReset={isNewCommercialSearch};
