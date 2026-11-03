const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');
const ctx=document.getElementById('ctx');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

const explicitTypes=[
  [/\brestaurantes?\b/,'Restaurante'],
  [/\blanchonetes?\b/,'Lanchonete'],
  [/\bcafeterias?\b/,'Cafeteria'],
  [/\bpadarias?\b/,'Padaria'],
  [/\bpizzarias?\b/,'Pizzaria'],
  [/\bhamburguerias?\b/,'Hamburgueria'],
  [/\bdocerias?\b/,'Doceria'],
  [/\bsorveterias?\b/,'Sorveteria'],
  [/\bchurrascarias?\b/,'Churrascaria'],
  [/\bpastelarias?\b/,'Pastelaria'],
  [/\bmercados?\b/,'Mercado'],
  [/\bfarmacias?\b/,'Farmácia']
];
const retail=/\b(loja|lojas|comercio|comercios|negocio|negocios|empresa|empresas|ponto|pontos)\b/;
const food=/\b(comida|comer|almoco|jantar|japonesa|japones|sushi|pizza|pizzaria|hamburguer|hamburgueria|lanche|doceria|doce|sorvete|sorveteria|acai|marmita|padaria|cafeteria|restaurante|churrasco|churrascaria|pastel|pastelaria)\b/;
const clothes=/\b(roupa|roupas|vestuario|moda|camisa|camiseta|calca|vestido)\b/;

function hasRetailFoodConflict(text){const n=norm(text);return retail.test(n)&&food.test(n)}
function detectType(text){
  const n=norm(text);
  if(hasRetailFoodConflict(n))return 'Loja';
  for(const[re,label]of explicitTypes)if(re.test(n))return label;
  if(retail.test(n))return 'Loja';
  return null;
}
function inferCategory(text){
  const n=norm(text);
  if(hasRetailFoodConflict(n))return null;
  if(food.test(n))return 'Comida';
  if(clothes.test(n))return 'Roupas';
  if(/\b(tecnologia|eletronico|eletronicos|celular|computador)\b/.test(n))return 'Tecnologia';
  if(/\b(farmacia|medicamento|remedio)\b/.test(n))return 'Farmácia';
  if(/\b(beleza|cosmetico|cosmeticos|salao)\b/.test(n))return 'Beleza';
  return null;
}
function entityWord(state=window.LocalAIEngine?.state){
  if(!state)return'estabelecimento';
  if(state.establishmentType==='Loja')return'loja';
  if(state.category==='Comida')return'estabelecimento';
  return state.establishmentType?state.establishmentType.toLowerCase():'estabelecimento';
}
function apply(text){
  const s=window.LocalAIEngine?.state;if(!s)return null;
  const type=detectType(text),category=inferCategory(text);
  s.establishmentType=type;
  s.entityWord=category==='Comida'?'estabelecimento':(type==='Loja'?'loja':type?.toLowerCase()||'estabelecimento');
  return{type,category,entityWord:s.entityWord,conflict:hasRetailFoodConflict(text)};
}
function addMsg(text,user=false){if(!msgs)return;const d=document.createElement('div');d.className='msg '+(user?'user':'bot');d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}
function blockRetailFood(original){
  const s=window.LocalAIEngine?.state;
  if(s){s.establishmentType='Loja';s.entityWord='loja';s.category=null;s.group=null;s.product=null;s.specialty=null;s.term=null;s.selectedStore=null;s.selectedProduct=null;s.lastResults=[]}
  addMsg(original,true);
  addMsg('“Loja” e “comércio” são tratados como varejo e não entram na categoria Comida. Para alimentação, procure por restaurante, pizzaria, cafeteria, lanchonete ou pelo tipo de comida diretamente.');
  if(ctx)ctx.textContent='Contexto: Loja';
  if(input)input.value='';
}
form?.addEventListener('submit',e=>{
  const q=input?.value?.trim();if(!q)return;
  if(hasRetailFoodConflict(q)){
    e.preventDefault();e.stopImmediatePropagation();blockRetailFood(q);return;
  }
  apply(q);
},true);
window.GuruEstablishmentSemantics={detectType,inferCategory,entityWord,apply,normalize:norm,hasRetailFoodConflict};
