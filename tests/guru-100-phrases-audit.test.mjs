// Auditoria exploratória: 100 consultas inéditas para detectar regressões.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {interpret,emptyState,nextState,searchStores} from '../guru-engine-v4-core.mjs';
import {taxonomy,categoryAliases} from '../ai-taxonomy.js';

const cases=[
 {
  "q": "Por obséquio, localize alguma pizzaria.",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Consegue achar uma pizzaria para hoje?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Tô afim de comer pizza, onde tem?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Alguma indicação de onde vendem pizzas?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Existe casa de pizza na região?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Queria uma recomendação de pizzaria, se puder.",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Será que rola pedir pizza por algum lugar?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Preciso saber onde encontrar pizzarias.",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Tem um estabelecimento que prepara pizzas?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Qual lugar vocês indicam pra comer pizza?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Teria alguma opção de pizzaria pra mim?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Poderia descobrir uma pizzaria que eu possa visitar?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Dê uma olhada em pizzarias disponíveis.",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Me passa umas opções de pizza, por gentileza.",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Pode me ajudar com uma pizzaria na cidade?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Sabe onde compra pizza pronta?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Quero ir num lugar que vende pizzas.",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Qual estabelecimento serve pizzas por aqui?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Acha alguma pizzaria cadastrada?",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Se possível, liste pizzarias da região.",
  "group": "Pizzaria",
  "kind": "search"
 },
 {
  "q": "Você conhece alguma doceria por aí?",
  "group": "Doceria",
  "kind": "search"
 },
 {
  "q": "Teria loja de doces?",
  "group": "Doceria",
  "kind": "search"
 },
 {
  "q": "Quero comprar doces numa loja.",
  "group": "Doceria",
  "kind": "search"
 },
 {
  "q": "Tem confeitaria nas redondezas?",
  "group": "Doceria",
  "kind": "search"
 },
 {
  "q": "Procurava um cantinho de sobremesas.",
  "group": "Doceria",
  "kind": "search"
 },
 {
  "q": "Onde vendem brigadeiros?",
  "group": "Doceria",
  "kind": "search"
 },
 {
  "q": "Gostaria de visitar uma doceria artesanal.",
  "group": "Doceria",
  "kind": "search"
 },
 {
  "q": "Você acha alguma casa de doces?",
  "group": "Doceria",
  "kind": "search"
 },
 {
  "q": "Uma indicação de confeitaria, por favor.",
  "group": "Doceria",
  "kind": "search"
 },
 {
  "q": "Há loja que prepara sobremesas?",
  "group": "Doceria",
  "kind": "search"
 },
 {
  "q": "Quero restaurante japonês com sushi.",
  "kind": "search",
  "group": "Japonesa"
 },
 {
  "q": "Tem hamburgueria na cidade?",
  "kind": "search",
  "group": "Hamburgueria"
 },
 {
  "q": "Onde fica uma panificadora?",
  "kind": "search",
  "group": "Padaria"
 },
 {
  "q": "Indica uma pastelaria?",
  "kind": "search",
  "group": "Pastelaria"
 },
 {
  "q": "Poderia sugerir uma açaiteria?",
  "kind": "search",
  "group": "Açaí"
 },
 {
  "q": "Procurando um salão de beleza.",
  "kind": "search",
  "group": "Salão"
 },
 {
  "q": "Preciso de uma oficina mecânica.",
  "kind": "search",
  "group": "Oficina"
 },
 {
  "q": "Onde encontro um banho e tosa?",
  "kind": "search",
  "group": "Banho e tosa"
 },
 {
  "q": "Quero serviços de limpeza residencial.",
  "kind": "search",
  "group": "Limpeza"
 },
 {
  "q": "Tem loja de materiais de construção?",
  "kind": "search",
  "group": "Materiais de construção"
 },
 {
  "q": "Pizzarias que abrem sábado?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "day": 6
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Quais pizzarias estão abertas no domingo?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "day": 0
  },
  "ids": [
   "pizza-retirada"
  ]
 },
 {
  "q": "Pizzaria aberta na terça?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "day": 2
  },
  "ids": [
   "pizza-entrega",
   "pizza-retirada"
  ]
 },
 {
  "q": "Quero pizzaria para segunda-feira.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "day": 1
  },
  "ids": []
 },
 {
  "q": "Pizzaria funcionando aos sábados.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "day": 6
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Pizzaria que funcione domingo à tarde.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "day": 0
  },
  "ids": [
   "pizza-retirada"
  ]
 },
 {
  "q": "Tem pizza disponível hoje?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "day": 2
  },
  "ids": [
   "pizza-entrega",
   "pizza-retirada"
  ]
 },
 {
  "q": "Pizzarias abertas agora?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "openNow": true
  },
  "ids": [
   "pizza-entrega",
   "pizza-retirada"
  ]
 },
 {
  "q": "Qual pizzaria abre no fim de semana?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "days": [
    0,
    6
   ]
  },
  "ids": [
   "pizza-entrega",
   "pizza-retirada"
  ]
 },
 {
  "q": "Me sugira pizzaria para amanhã.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "day": 3
  },
  "ids": []
 },
 {
  "q": "Quero uma pizzaria que leve a pizza em casa.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "delivery": true
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Pizzaria com entrega em domicílio.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "delivery": true
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Tem pizzaria que faz delivery?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "delivery": true
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Pizzaria que não faz entrega.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "delivery": false
  },
  "ids": [
   "pizza-retirada"
  ]
 },
 {
  "q": "Encontre uma pizzaria com retirada no local.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "pickup": true
  },
  "ids": [
   "pizza-retirada"
  ]
 },
 {
  "q": "Preciso buscar a pizza no balcão.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "pickup": true
  },
  "ids": [
   "pizza-retirada"
  ]
 },
 {
  "q": "Pizzaria que aceite pagamento por Pix.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "payment": "pix"
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Há pizzaria que aceita cartão?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "payment": "cartao"
  },
  "ids": [
   "pizza-retirada"
  ]
 },
 {
  "q": "Pizzaria que faz entrega e recebe Pix.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "delivery": true,
   "payment": "pix"
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Pizzaria com retirada e Pix.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "pickup": true,
   "payment": "pix"
  },
  "ids": []
 },
 {
  "q": "Pizzaria com avaliação maior que 4.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "minRating": 4
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Encontre pizzaria nota acima de 4 estrelas.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "minRating": 4
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Quais pizzarias têm melhor reputação?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "sort": "rating"
  },
  "ids": [
   "pizza-entrega",
   "pizza-retirada"
  ],
  "first": "pizza-entrega"
 },
 {
  "q": "Pizzaria bem avaliada.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "sort": "rating"
  },
  "ids": [
   "pizza-entrega",
   "pizza-retirada"
  ],
  "first": "pizza-entrega"
 },
 {
  "q": "Quero uma pizzaria com nota mínima 4.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "minRating": 4
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Pizzaria até R$ 50.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "maxPrice": 50
  },
  "ids": [
   "pizza-entrega",
   "pizza-retirada"
  ]
 },
 {
  "q": "Encontre pizzaria que venda pizza abaixo de 40 reais.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "maxPrice": 40
  },
  "ids": [
   "pizza-retirada"
  ]
 },
 {
  "q": "Pizzaria com pizza até R$ 40.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "maxPrice": 40
  },
  "ids": [
   "pizza-retirada"
  ]
 },
 {
  "q": "Quero pizzaria com prato em promoção.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "promoOnly": true
  },
  "ids": []
 },
 {
  "q": "Quais pizzarias têm pizzas mais baratas?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "sort": "price"
  },
  "ids": [
   "pizza-entrega",
   "pizza-retirada"
  ],
  "first": "pizza-retirada"
 },
 {
  "q": "Onde encontro pizza calabresa?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {},
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Tem pizzaria que vende pizza de calabresa?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {},
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Quero comprar uma pizza de calabresa.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {},
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Pizzaria que tenha pizza mussarela.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {},
  "ids": [
   "pizza-retirada"
  ]
 },
 {
  "q": "Uma pizzaria com pizza vegana disponível.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {},
  "ids": []
 },
 {
  "q": "Tem pizza de chocolate nessas pizzarias?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {},
  "ids": []
 },
 {
  "q": "Pizzaria com tamanho G.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "size": "G"
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Onde tem calabresa em estoque?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {},
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Pizzaria com pizza de calabresa até R$ 50.",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {
   "maxPrice": 50
  },
  "ids": [
   "pizza-entrega"
  ]
 },
 {
  "q": "Pizzaria que tenha pizzas sem estoque?",
  "group": "Pizzaria",
  "kind": "search",
  "filters": {},
  "ids": []
 },
 {
  "q": "A primeira entrega?",
  "kind": "select",
  "index": 0,
  "ask": "delivery"
 },
 {
  "q": "A segunda aceita Pix?",
  "kind": "select",
  "index": 1,
  "ask": "payment"
 },
 {
  "q": "A primeira abre sábado?",
  "kind": "select",
  "index": 0,
  "ask": "hours"
 },
 {
  "q": "A segunda funciona domingo?",
  "kind": "select",
  "index": 1,
  "ask": "hours"
 },
 {
  "q": "A primeira tem WhatsApp?",
  "kind": "select",
  "index": 0,
  "ask": "contact"
 },
 {
  "q": "A última qual endereço?",
  "kind": "select",
  "index": -1,
  "ask": "address"
 },
 {
  "q": "A segunda vende quais produtos?",
  "kind": "select",
  "index": 1,
  "ask": "products"
 },
 {
  "q": "Quanto custa a primeira com entrega?",
  "kind": "select",
  "index": 0,
  "ask": "total"
 },
 {
  "q": "A primeira tem avaliação?",
  "kind": "select",
  "index": 0,
  "ask": "rating"
 },
 {
  "q": "A segunda fica onde?",
  "kind": "select",
  "index": 1,
  "ask": "address"
 },
 {
  "q": "Agora quero uma doceria",
  "kind": "search",
  "group": "Doceria",
  "context": true
 },
 {
  "q": "Mudando de assunto, quero sushi",
  "kind": "search",
  "group": "Japonesa",
  "context": true
 },
 {
  "q": "Prefiro procurar uma hamburgueria agora",
  "kind": "search",
  "group": "Hamburgueria",
  "context": true
 },
 {
  "q": "Esquece as pizzas, preciso de uma confeitaria",
  "kind": "search",
  "group": "Doceria",
  "context": true
 },
 {
  "q": "Vamos procurar uma sorveteria?",
  "kind": "search",
  "group": "Sorveteria",
  "context": true
 },
 {
  "q": "E se eu quiser uma padaria?",
  "kind": "search",
  "group": "Padaria",
  "context": true
 },
 {
  "q": "Pode encontrar uma pizzaria diferente?",
  "kind": "search",
  "group": "Pizzaria",
  "context": true
 },
 {
  "q": "A loja escolhida faz entrega?",
  "kind": "ask",
  "group": null,
  "ask": "delivery",
  "context": true
 },
 {
  "q": "Ela aceita Pix?",
  "kind": "ask",
  "group": null,
  "ask": "payment",
  "context": true
 },
 {
  "q": "Quais produtos ela vende?",
  "kind": "ask",
  "group": null,
  "ask": "products",
  "context": true
 }
];
const store=(id,category,group,extra={})=>({
 id,name:'Loja '+id,active:true,status:'active',category,group,groups:[group],
 address:'Rua Principal, Centro, Sorocaba - SP',delivery:false,pickup:false,
 payment_methods:[],...extra
});
const pizzaDelivery=store('pizza-entrega','Comida','Pizzaria',{
 name:'Pizzaria da Vila',delivery:true,pickup:false,payment_methods:['Pix'],
 latitude:-23.5,longitude:-47.4,description:'Pizzas artesanais'
});
const pizzaPickup=store('pizza-retirada','Comida','Pizzaria',{
 name:'Pizza na Praça',delivery:false,pickup:true,payment_methods:['Cartão'],
 latitude:-23.6,longitude:-47.4,description:'Pizzas tradicionais'
});
const sweet=store('doce','Comida','Doceria',{
 name:'Confeitaria Mel',delivery:true,pickup:true,payment_methods:['Pix'],
 description:'Doces artesanais e brigadeiros'
});
const otherStores=Object.entries(taxonomy).flatMap(([category,groups])=>
 Object.keys(groups).filter(group=>!(category==='Comida'&&['Pizzaria','Doceria'].includes(group)))
 .map((group,i)=>store(category+'-'+i,category,group,{name:'Estabelecimento '+category+' '+group}))
);
const shops=[pizzaDelivery,pizzaPickup,sweet,...otherStores];
const products=[
 {id:'c',store_id:'pizza-entrega',name:'Pizza Calabresa',active:true,show_in_ai:true,stock:9,price:45,sizes:['G']},
 {id:'v',store_id:'pizza-entrega',name:'Pizza Vegana',active:true,show_in_ai:true,stock:0,price:48,sizes:['G']},
 {id:'m',store_id:'pizza-retirada',name:'Pizza Mussarela',active:true,show_in_ai:true,stock:7,price:35,sizes:['M']},
 {id:'b',store_id:'doce',name:'Brigadeiro Gourmet',active:true,show_in_ai:true,stock:5,price:8}
];
const hours=[
 ...[2,6].map(weekday=>({store_id:'pizza-entrega',weekday,opens_at:'11:00',closes_at:'22:00',closed:false})),
 ...[2,0].map(weekday=>({store_id:'pizza-retirada',weekday,opens_at:'11:00',closes_at:'22:00',closed:false}))
];
const data={stores:shops,products,hours,
 reviews:[{store_id:'pizza-entrega',rating:5},{store_id:'pizza-retirada',rating:3}],knowledge:[]};
const opts={today:2};
const now=new Date(2026,10,3,12,0,0);
const position={lat:-23.5,lng:-47.4};
const earlier={...emptyState(),category:'Comida',group:'Pizzaria',
 filters:{delivery:true,day:6},selectedStore:pizzaDelivery,
 lastResults:[{store:pizzaDelivery},{store:pizzaPickup}]};
const lists={...emptyState(),lastResults:[{store:pizzaDelivery},{store:pizzaPickup}]};
function run(spec,i){
 const state=spec.context?earlier:spec.kind==='select'?lists:emptyState();
 const p=interpret(spec.q,taxonomy,categoryAliases,state,opts);
 assert.equal(p.kind,spec.kind,'Intenção esperada '+spec.kind+'; recebida '+p.kind);
 if(spec.group)assert.equal(p.taxon?.group,spec.group,'Grupo esperado '+spec.group+', recebido '+p.taxon?.group);
 if(spec.ask)assert.equal(p.ask,spec.ask,'Tipo de pergunta da loja');
 if(spec.index!==undefined)assert.equal(p.index,spec.index,'Referência de resultado');
 for(const [key,value] of Object.entries(spec.filters||{}))
  assert.deepEqual(p.filters?.[key],value,'Filtro '+key+' incorreto');
 if(spec.kind!=='search')return;
 const next=nextState(state,p);
 if(spec.context){
  assert.equal(next.selectedStore,null,'Nova busca deve limpar a loja selecionada');
  assert.equal(next.filters.delivery,undefined,'Filtro antigo de entrega não deve vazar');
  assert.equal(next.filters.day,undefined,'Filtro antigo de sábado não deve vazar');
 }
 const found=searchStores(data,next,position,{now,limit:90});
 const ids=found.map(x=>x.store.id);
 if(spec.ids){
  assert.deepEqual(ids.slice().sort(),spec.ids.slice().sort(),'Estabelecimentos encontrados incorretamente');
  if(spec.first)assert.equal(ids[0],spec.first,'Ordenação incorreta');
 }else{
  const target=spec.group==='Pizzaria'?'pizza-entrega':spec.group==='Doceria'?'doce':
   shops.find(s=>s.group===spec.group)?.id;
  assert.ok(target,'Grupo de referência não cadastrado nos dados de teste');
  assert.ok(ids.includes(target),'Nenhum estabelecimento pertinente encontrado: '+JSON.stringify(ids));
 }
}
assert.equal(cases.length,100);
for(let i=0;i<cases.length;i++){
 const spec=cases[i];
 test('AUDITORIA-100 #'+String(i+1).padStart(3,'0')+' | '+spec.q,()=>{
  run(spec,i);
 });
}
