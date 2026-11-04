// GURU: 1.000 perguntas determinísticas, com expectativas e dados simulados.
import test from 'node:test';
import assert from 'node:assert/strict';
import {taxonomy,categoryAliases} from '../ai-taxonomy.js';
import {interpret,emptyState,nextState,searchStores} from '../guru-engine-v4-core.mjs';

const groups=Object.entries(taxonomy).flatMap(([category,items])=>
 Object.keys(items).map(group=>({category,group})));
assert.equal(groups.length,50,'a matriz cobre todos os 50 grupos da taxonomia');
const activeStore=(id,category,group,details={})=>({
 id,name:'Estabelecimento '+id,category,group,groups:[group],
 active:true,status:'active',delivery:true,pickup:true,payment_methods:['Pix','Cartão'],
 address:'Rua Central, Centro, Sorocaba - SP',latitude:-23.501,longitude:-47.401,
 ...details
});
const original=groups.map(({category,group},i)=>
 activeStore('g'+i,category,group,{name:'Loja de '+group+' '+category}));
const alternate=groups.slice(0,20).map(({category,group},i)=>
 activeStore('alt'+i,category,group,{
 name:'Outra loja '+group+' '+category,delivery:false,pickup:false,payment_methods:[],
 latitude:-23.6,longitude:-47.6
}));
const all=[...original,...alternate];
const hours=[
 ...original.flatMap(s=>[2,6].map(weekday=>({
 store_id:s.id,weekday,opens_at:'09:00',closes_at:'18:00',closed:false
 }))),
 ...alternate.map(s=>({store_id:s.id,weekday:0,opens_at:'09:00',closes_at:'18:00',closed:false}))
];
const products=original.map((s,i)=>({
 id:'product'+i,store_id:s.id,name:'Kit especial '+s.group,
 active:true,show_in_ai:true,stock:7,price:35,sizes:['M'],description:'Produto cadastrado'
})).concat(original.map((s,i)=>({
 id:'empty'+i,store_id:s.id,name:'Kit econômico '+s.group,
 active:true,show_in_ai:true,stock:0,price:15,sizes:['M']
})));
const reviews=original.map(s=>({store_id:s.id,rating:5}));
const data={stores:all,hours,products,reviews,knowledge:[]};
const today=2,now=new Date(2026,10,3,12,0,0);
const position={lat:-23.5,lng:-47.4};
const interpretOne=(q,prev=emptyState())=>interpret(q,taxonomy,categoryAliases,prev,{today});
const results=(state,subset=data)=>searchStores(subset,state,position,{now,limit:100});
const formats=[
 ({group,category})=>'Por favor, encontre '+group+' em '+category+'.',
 ({group,category})=>'Você pode me indicar uma loja de '+group+' na categoria '+category+'?',
 ({group,category})=>'Gostaria de conhecer estabelecimentos de '+group+', categoria '+category+'.',
 ({group,category})=>'Quais são as opções de '+group+' dentro de '+category+'?',
 ({group,category})=>'Tem algum local de '+category+' especializado em '+group+'?',
 ({group,category})=>'Procure negócios de '+group+' ligados a '+category+'.',
 ({group,category})=>'Me recomende um estabelecimento de '+group+' da categoria '+category+'.',
 ({group,category})=>'Será que existe '+group+' no setor '+category+'?',
 ({group,category})=>'Me apresenta alternativas de '+group+' no ramo de '+category+'.',
 ({group,category})=>'Estou buscando '+group+' do tipo '+category+'.',
 ({group,category})=>'Onde encontro '+group+' na área de '+category+'?',
 ({group,category})=>'Poderia mostrar um comércio de '+group+' na categoria '+category+'?'
];
const cases=[];
for(const g of groups)for(let i=0;i<formats.length;i++){
 cases.push({category:g.category,group:g.group,query:formats[i](g),scenario:'category'});
}
const filters=[
 {phrase:'que abre aos sábados',key:'day',value:6,expected:'main'},
 {phrase:'aberto no domingo',key:'day',value:0,expected:'alt'},
 {phrase:'que funciona na terça',key:'day',value:2,expected:'main'},
 {phrase:'que atende no fim de semana',key:'days',value:[0,6],expected:'both'},
 {phrase:'aberto agora',key:'openNow',value:true,expected:'main'},
 {phrase:'que faça entrega',key:'delivery',value:true,expected:'main'},
 {phrase:'sem entrega',key:'delivery',value:false,expected:'alt'},
 {phrase:'com retirada na loja',key:'pickup',value:true,expected:'main'},
 {phrase:'que aceite Pix',key:'payment',value:'pix',expected:'main'},
 {phrase:'que aceite cartão',key:'payment',value:'cartao',expected:'main'}
];
for(let i=0;i<20;i++)for(const f of filters){
 const g=groups[i];
 cases.push({category:g.category,group:g.group,
 query:'Busque '+g.group+' em '+g.category+' '+f.phrase+'.',
 scenario:'filter',value:f,groupIndex:i});
}
const previous={...emptyState(),category:'Comida',group:'Pizzaria',
 filters:{delivery:true,day:5},selectedStore:original[0],
 lastResults:[{store:original[0]},{store:original[1]}]};
const switching=[
 ({category,group})=>'Agora quero '+group+' em '+category+'.',
 ({category,group})=>'Mudando de assunto, preciso encontrar '+group+' na categoria '+category+'.'
];
for(const g of groups)for(const fmt of switching){
 cases.push({category:g.category,group:g.group,scenario:'context',query:fmt(g)});
}
const productFormats=[
 {phrase:'com produtos de até R$ 40',key:'maxPrice',value:40,expected:true},
 {phrase:'com produtos de até R$ 20',key:'maxPrice',value:20,expected:false},
 {phrase:'com produtos acima de R$ 30',key:'minPrice',value:30,expected:true},
 {phrase:'com produtos em promoção',key:'promoOnly',value:true,expected:false},
 {phrase:'com produtos tamanho M',key:'size',value:'M',expected:true}
];
for(let i=0;i<20;i++)for(const f of productFormats){
 const g=groups[i];
 cases.push({category:g.category,group:g.group,scenario:'product',
 query:'Encontre '+g.group+' em '+g.category+' '+f.phrase+'.',
 value:f,groupIndex:i});
}
assert.equal(cases.length,1000,'exatamente mil cenários');
assert.equal(new Set(cases.map(x=>x.query.toLocaleLowerCase('pt-BR'))).size,1000,'1000 perguntas distintas');
const filterDataset=(index)=>({
 ...data,
 stores:[original[index],alternate[index]],
 hours:hours.filter(h=>h.store_id===original[index].id||h.store_id===alternate[index].id)
});
for(let i=0;i<cases.length;i++){
 const spec=cases[i];
 test('GURU-1000 '+String(i+1).padStart(4,'0')+' '+spec.scenario+' | '+spec.query,()=>{
  const prior=spec.scenario==='context'?previous:emptyState();
  const p=interpretOne(spec.query,prior);
  assert.equal(p.kind,'search','intenção incorreta');
  assert.equal(p.taxon?.category,spec.category,'categoria não reconhecida');
  assert.equal(p.taxon?.group,spec.group,'grupo não reconhecido');
  const state=nextState(prior,p);
  assert.equal(state.category,spec.category);
  assert.equal(state.group,spec.group);
  if(spec.scenario==='context'){
   assert.equal(state.selectedStore,null,'não reutilizar a loja anterior');
   assert.equal(state.filters.day,undefined,'sábado anterior não pode ser herdado');
   assert.equal(state.filters.delivery,undefined,'entrega anterior não pode ser herdada');
  }
  if(spec.scenario==='filter'){
   assert.deepEqual(p.filters[spec.value.key],spec.value.value,
    'filtro incorreto '+spec.value.key);
   const selected=results(state,filterDataset(spec.groupIndex)).map(r=>r.store.id).sort();
   const expected=spec.value.expected==='main'?[original[spec.groupIndex].id]:
    spec.value.expected==='alt'?[alternate[spec.groupIndex].id]:
    [original[spec.groupIndex].id,alternate[spec.groupIndex].id];
   assert.deepEqual(selected,expected.sort(),'filtro aceitou/excluiu estabelecimento indevido');
   return;
  }
  if(spec.scenario==='product'){
   assert.deepEqual(p.filters[spec.value.key],spec.value.value,'filtro de produto não reconhecido');
   const row=results(state,{...data,stores:[original[spec.groupIndex]]});
   assert.equal(row.length>0,spec.value.expected,'produto sem estoque ou fora do limite foi sugerido');
   return;
  }
  const matching=results(state).filter(r=>r.store.id===original[groups.findIndex(g=>g.group===spec.group&&g.category===spec.category)].id);
  assert.ok(matching.length>0,'estabelecimento da categoria e grupo deveria ser encontrado');
  assert.ok(matching.every(r=>r.store.category===spec.category&&r.store.group===spec.group));
 });
}


// Casos adversariais independentes da matriz combinatória (pagamento, negação e diálogos).
const paymentStores=[
 activeStore('all','Comida','Pizzaria',{name:'Todos os Pagamentos',delivery:true,pickup:true,payment_methods:['Pix','Cartão','Crédito','Débito','Dinheiro']}),
 activeStore('onlypix','Comida','Pizzaria',{name:'Só Pix',delivery:false,pickup:false,payment_methods:['Pix']}),
 activeStore('onlycard','Comida','Pizzaria',{name:'Só Cartão',delivery:true,pickup:true,payment_methods:['Cartão']}),
 activeStore('none','Comida','Pizzaria',{name:'Sem Pagamento',delivery:false,pickup:true,payment_methods:[]})
];
const paymentHours=paymentStores.flatMap((s,i)=>[
 {store_id:s.id,weekday:i===2?0:6,opens_at:'09:00',closes_at:'20:00',closed:false},
 {store_id:s.id,weekday:2,opens_at:'09:00',closes_at:'20:00',closed:false}
]);
const paymentData={stores:paymentStores,hours:paymentHours,products:[],reviews:[],knowledge:[]};
const paymentCases=[
 ['Pizzaria que não aceita Pix.',{},['onlycard','none']],
 ['Pizzaria sem Pix.',{},['onlycard','none']],
 ['Pizzaria que aceite Pix e cartão.',{},['all']],
 ['Pizzaria que recebe Pix e dinheiro.',{},['all']],
 ['Pizzaria que recebe crédito e débito.',{},['all']],
 ['Pizzaria que entrega em casa.',{delivery:true},['all','onlycard']],
 ['Pizzaria que realiza entregas em domicílio.',{delivery:true},['all','onlycard']],
 ['Pizzaria que não faz delivery.',{delivery:false},['onlypix','none']],
 ['Pizzaria que trabalha com delivery.',{delivery:true},['all','onlycard']],
 ['Pizzaria onde posso buscar no balcão.',{pickup:true},['all','onlycard','none']],
 ['Pizzaria que não permite retirada.',{pickup:false},['onlypix']],
 ['Pizzaria com loja física e sem entrega.',{delivery:false},['onlypix','none']],
 ['Pizzaria que abre sábado ou domingo.',{days:[0,6]},['all','onlypix','onlycard','none']],
 ['Pizzaria que abre sábado e domingo.',{daysAll:[0,6]},[]],
 ['Pizzaria que recebe pagamento no Pix.',{payment:'pix'},['all','onlypix']],
 ['Pizzaria com opção de cartão.',{payment:'cartao'},['all','onlycard']],
 ['Pizzaria que aceita cartão e não aceita Pix.',{},['onlycard']],
 ['Pizzaria sem entrega e com retirada.',{delivery:false,pickup:true},['none']],
 ['Pizzaria que não entrega mas aceita Pix.',{delivery:false,payment:'pix'},['onlypix']],
 ['Pizzaria que faz entrega e aceita Pix.',{delivery:true,payment:'pix'},['all']],
 ['Pizzaria para retirar meu pedido.',{pickup:true},['all','onlycard','none']],
 ['Pizzaria que não recebe cartão.',{},['onlypix','none']],
 ['Pizzaria com cartões aceitos.',{payment:'cartao'},['all','onlycard']],
 ['Pizzaria que não faz entregas.',{delivery:false},['onlypix','none']]
];
for(const [i,[query,filters,expectedIds]] of paymentCases.entries()){
 test('GURU-EXTRA '+String(i+1).padStart(3,'0')+' | '+query,()=>{
  const p=interpretOne(query);
  assert.equal(p.kind,'search','deve pesquisar pizzarias');
  assert.equal(p.taxon?.group,'Pizzaria','grupo incorreto');
  for(const [key,value] of Object.entries(filters))
   assert.deepEqual(p.filters[key],value,'filtro incorreto '+key);
  const matches=results(nextState(emptyState(),p),paymentData).map(r=>r.store.id).sort();
  assert.deepEqual(matches,expectedIds.slice().sort(),'lojas sem critérios foram recomendadas');
 });
}
