import {test} from 'node:test';
import assert from 'node:assert/strict';
import {interpret,emptyState,nextState,searchStores,eligibleProduct,scheduleMatches,normalizeQuery,retailFoodConflict} from '../guru-engine-v4-core.mjs';

const tax={
 Comida:{Pizzaria:['pizza','pizzaria'],Japonesa:['comida japonesa','japonesa','sushi'],Doceria:['doces','doce','doceria']},
 Roupas:{Infantil:['roupa infantil','infantil'],Feminina:['roupa feminina','feminina']},
 Tecnologia:{Celulares:['celular','smartphone']}
};
const aliases={Comida:['comida','alimentacao'],Roupas:['roupa','roupas','camiseta'],Tecnologia:['tecnologia','celular']};
const plan=(q,state=emptyState())=>interpret(q,tax,aliases,state,{today:2});
const shop=(id,category,group,extra={})=>({id,name:'Loja '+id,active:true,status:'active',category,group,groups:[group],address:'Rua Teste, Centro, Sorocaba - SP',delivery:false,pickup:false,...extra});
const row=(storeId,name,extra={})=>({id:storeId+'-'+name,store_id:storeId,name,active:true,show_in_ai:true,stock:6,price:50,...extra});
const stores=[
 shop('a','Comida','Pizzaria',{delivery:true,pickup:true,delivery_fee:8,avg_delivery_minutes:35,latitude:-23.5,longitude:-47.4,payment_methods:['Pix']}),
 shop('b','Comida','Pizzaria',{delivery:false,pickup:true}),
 shop('c','Comida','Japonesa',{delivery:true}),
 shop('d','Roupas','Infantil',{delivery:true}),
 shop('e','Comida','Pizzaria',{active:false,delivery:true}),
 shop('f','Comida','Pizzaria',{status:'pending',delivery:true})
];
const products=[
 row('a','Pizza Margherita',{promo_price:38,stock:8}),
 row('b','Pizza Calabresa',{promo_price:35,stock:0}),
 row('c','Sushi de Salmao',{price:45}),
 row('d','Camiseta Infantil',{sizes:['M','G'],price:35}),
 row('d','Vestido',{sizes:['G'],price:60})
];
const hours=[
 {store_id:'a',weekday:2,opens_at:'09:00',closes_at:'22:00',closed:false},
 {store_id:'a',weekday:5,opens_at:'18:00',closes_at:'02:00',closed:false},
 {store_id:'b',weekday:2,opens_at:'09:00',closes_at:'22:00',closed:false}
];
const reviews=[{store_id:'a',rating:5},{store_id:'a',rating:4},{store_id:'b',rating:2}];
const data={stores,products,hours,reviews,knowledge:[]};
const search=(q,s=emptyState(),pos=null,at=new Date('2026-11-03T15:00:00'))=>{
 const p=plan(q,s);assert.equal(p.kind,'search',q);
 return searchStores(data,nextState(s,p),pos,{now:at,limit:6});
};
test('corrige erros de digitação e mantém negócio genérico',()=>{
 assert.equal(normalizeQuery('pizaria'),'pizzaria');
 assert.equal(plan('negócio de comida japonesa').taxon?.group,'Japonesa');
 assert.equal(plan('negócio de comida japonesa').taxon?.category,'Comida');
 assert.equal(plan('loja de comida japonesa').kind,'blocked');
 assert.equal(plan('comércio de comida japonesa').kind,'blocked');
 assert.equal(retailFoodConflict('negócio de comida japonesa'),false);
});
test('interpreta categorias, grupos e exclusões',()=>{
 const p=plan('comida sem pizza');
 assert.equal(p.taxon.category,'Comida');assert.deepEqual(p.excludedGroups,['pizzaria']);
 const p2=plan('roupa infantil');assert.equal(p2.taxon.group,'Infantil');
 assert.equal(plan('lojas com entrega').broad,true);
 assert.equal(plan('pizaria').taxon.group,'Pizzaria');
});
test('contexto preserva filtros em perguntas complementares',()=>{
 const s=nextState(emptyState(),plan('pizzaria'));
 const next=nextState(s,plan('com entrega',s));
 assert.equal(next.category,'Comida');assert.equal(next.group,'Pizzaria');assert.equal(next.filters.delivery,true);
 const picked={...next,lastResults:[{store:stores[0]},{store:stores[1]}]};
 const ref=plan('a segunda abre sábado?',picked);
 assert.equal(ref.kind,'select');assert.equal(ref.index,1);assert.equal(ref.ask,'hours');assert.equal(ref.filters.day,6);
 assert.equal(plan('ela entrega?',next).kind,'clarify');
});
test('filtros obrigatórios eliminam inativas, pendentes, sem entrega e sem estoque',()=>{
 assert.deepEqual(search('pizzaria com entrega').map(x=>x.store.id),['a']);
 assert.deepEqual(search('pizzaria sem entrega').map(x=>x.store.id),['b']);
 const f=plan('pizzaria em promoção até R$ 40');
 const match=searchStores(data,nextState(emptyState(),f),null,{now:new Date('2026-11-03T15:00:00')});
 assert.deepEqual(match.map(x=>x.store.id),['a']);
 assert.equal(eligibleProduct(row('x','Item',{stock:0}),{}),false);
 assert.equal(eligibleProduct(row('x','Item',{promo_price:60}),{promoOnly:true}),false);
});
test('pagamento, retirada e valor de frete precisam estar comprovados',()=>{
 assert.deepEqual(search('pizzaria com retirada').map(x=>x.store.id).sort(),['a','b']);
 assert.deepEqual(search('pizzaria com entrega frete até 9').map(x=>x.store.id),['a']);
 assert.deepEqual(search('pizzaria com entrega frete até 5').map(x=>x.store.id),[]);
 assert.deepEqual(search('pizzaria aceita pix').map(x=>x.store.id),['a']);
});
test('busca de produto respeita tamanho, estoque e cor',()=>{
 const s=nextState(emptyState(),plan('camiseta tamanho M'));
 assert.equal(s.category,'Roupas');assert.equal(s.filters.size,'M');
 assert.equal(searchStores(data,s,null,{now:new Date('2026-11-03T15:00:00')}).map(x=>x.store.id)[0],'d');
 const x=nextState(emptyState(),plan('camiseta tamanho P'));
 assert.equal(searchStores(data,x).length,0);
});
test('horários atravessando meia-noite são avaliados corretamente',()=>{
 const a=stores[0];
 assert.equal(scheduleMatches(a,hours,{openNow:true},new Date('2026-11-07T01:00:00')),true);
 assert.equal(scheduleMatches(a,hours,{openNow:true},new Date('2026-11-07T04:00:00')),false);
 assert.equal(scheduleMatches(a,hours,{day:5,start:1200,end:1260}),true);
});
test('distância máxima sem coordenadas não passa no filtro',()=>{
 const f=plan('pizzaria até 5 km');
 assert.equal(f.filters.maxDistance,5);
 assert.deepEqual(searchStores(data,nextState(emptyState(),f),null),[]);
});
test('avaliação usa valores reais sem nota fictícia',()=>{
 assert.deepEqual(search('pizzaria nota acima de 4').map(x=>x.store.id),['a']);
 assert.deepEqual(search('pizzaria nota acima de 4.9').map(x=>x.store.id),[]);
});

test('busca por doceria aberta no sábado ignora verbos de ligação sem descartar horário',()=>{
 const sweet=shop('sweet','Comida','Doceria',{name:'Doceria Exemplo'});
 const samples={
  stores:[sweet],products:[],reviews:[],knowledge:[],
  hours:[{store_id:'sweet',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false}]
 };
 for(const q of [
  'quero uma doceria que fique aberta no sábado',
  'quero uma doceria que esteja aberta no sábado',
  'encontre uma doceria que funciona no sábado'
 ]){
  const p=plan(q);
  assert.equal(p.kind,'search',q);
  assert.equal(p.taxon?.group,'Doceria',q);
  assert.equal(p.filters.day,6,q);
  assert.deepEqual(p.semanticTerms,[],q);
  const matched=searchStores(samples,nextState(emptyState(),p),null,{now:new Date('2026-11-03T15:00:00')});
  assert.deepEqual(matched.map(x=>x.store.id),['sweet'],q);
 }
 samples.hours[0].closed=true;
 const p=plan('quero uma doceria que fique aberta no sábado');
 assert.deepEqual(searchStores(samples,nextState(emptyState(),p)).map(x=>x.store.id),[]);
});
