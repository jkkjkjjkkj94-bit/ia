const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');

const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

const semanticRules=[
  {re:/\b(algo|coisa) doce\b|\bcomer (um |uma )?doce\b|\bvontade de doce\b|\bquero comer.*doce\b/,canonical:'doceria'},
  {re:/\bcomer pizza\b|\bvontade de pizza\b|\bquero.*pizza\b/,canonical:'pizzaria'},
  {re:/\b(comer|quero) (um )?(hamburguer|burger|lanche)\b|\bvontade de (hamburguer|lanche)\b/,canonical:'hamburgueria'},
  {re:/\b(comer|quero) (algo )?(japones|oriental)\b|\bcomida oriental\b/,canonical:'japonesa'},
  {re:/\b(tomar|quero) (um )?sorvete\b|\balgo gelado\b/,canonical:'sorveteria'},
  {re:/\b(tomar|quero) (um )?acai\b|\bvontade de acai\b/,canonical:'acai'},
  {re:/\bcomida caseira\b|\bprato feito\b|\bcomida pronta\b/,canonical:'marmita'}
];

function userMsg(text){
  if(!msgs)return;
  const d=document.createElement('div');
  d.className='msg user';
  d.textContent=text;
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
}

function cleanFalseProduct(state){
  if(!state)return;
  const bad=new Set(['comer','comendo','comida','tomar','procurar','achar','encontrar','comprar','querer']);
  if(bad.has(norm(state.product))||bad.has(norm(state.term))){state.product=null;state.term=null;state.specialty=null;state.selectedProduct=null;}
}

form?.addEventListener('submit',async e=>{
  const engine=window.LocalAIEngine;
  if(!engine||!input)return;
  const original=input.value.trim();
  if(!original)return;
  const n=norm(original);
  const rule=semanticRules.find(r=>r.re.test(n));
  if(!rule){cleanFalseProduct(engine.state);return;}
  e.preventDefault();
  e.stopImmediatePropagation();
  cleanFalseProduct(engine.state);
  userMsg(original);
  input.value='';
  await engine.handle(rule.canonical);
  cleanFalseProduct(engine.state);
},true);

window.LocalAISemanticGuard={normalize:norm,rules:semanticRules};
