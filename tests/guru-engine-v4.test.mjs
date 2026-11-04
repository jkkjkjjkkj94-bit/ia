import {test} from 'node:test';
import {taxonomy as registeredTaxonomy,categoryAliases as registeredAliases} from '../ai-taxonomy.js';

import assert from 'node:assert/strict';
import {interpret,emptyState,nextState,searchStores,explainEmptySearch,applyStoreHighlight,storeRankingPoints,eligibleProduct,scheduleMatches,distanceKm,normalizeQuery,retailFoodConflict} from '../guru-engine-v4-core.mjs';

const tax={
 Comida:{Pizzaria:['pizza','pizzaria'],Japonesa:['comida japonesa','japonesa','sushi'],Doceria:['doces','doce','doceria','confeitaria']},
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
 assert.equal(plan('loja de comida japonesa').kind,'search');
 assert.equal(plan('loja de comida japonesa').taxon?.group,'Japonesa');
 assert.equal(plan('comércio de comida japonesa').kind,'search');
 assert.equal(plan('comércio de comida japonesa').taxon?.group,'Japonesa');
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

test('dias de funcionamento no plural e nova pesquisa após selecionar loja',()=>{
 const sweet=shop('sweet','Comida','Doceria',{name:'Doceria Exemplo'});
 const data={stores:[sweet],products:[],reviews:[],knowledge:[],hours:[
  {store_id:'sweet',weekday:0,opens_at:'09:00',closes_at:'18:00',closed:false},
  {store_id:'sweet',weekday:1,opens_at:'09:00',closes_at:'18:00',closed:false},
  {store_id:'sweet',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false}
 ]};
 const cases=[
  ['quero uma doceria aberta aos sábados',6],
  ['uma doceria que abre aos domingos',0],
  ['doceria que funciona às segundas-feiras',1]
 ];
 for(const [query,day] of cases){
  const p=plan(query);
  assert.equal(p.kind,'search',query);
  assert.equal(p.taxon?.group,'Doceria',query);
  assert.equal(p.filters.day,day,query);
  assert.deepEqual(p.semanticTerms,[],query);
  const matches=searchStores(data,nextState(emptyState(),p),null,{now:new Date('2026-11-03T15:00:00')});
  assert.deepEqual(matches.map(x=>x.store.id),['sweet'],query);
 }
 const prev={...emptyState(),selectedStore:shop('pizza','Comida','Pizzaria')};
 assert.equal(plan('quero uma doceria que abre aos sábados',prev).kind,'search');
 assert.equal(plan('que horas abre?',prev).kind,'ask');
});

test('dia da semana não é confundido com segunda opção da lista',()=>{
 const prev={...emptyState(),lastResults:[{store:stores[0]},{store:stores[1]}]};
 const monday=plan('pizzaria aberta segunda-feira',prev);
 assert.equal(monday.kind,'search');
 assert.equal(monday.filters.day,1);
 assert.equal(monday.taxon?.group,'Pizzaria');
 const second=plan('a segunda abre sábado?',prev);
 assert.equal(second.kind,'select');
 assert.equal(second.index,1);
 assert.equal(second.filters.day,6);
 const weekday=plan('pizzaria aberta na quarta-feira',prev);
 assert.equal(weekday.kind,'search');
 assert.equal(weekday.filters.day,3);
});
test('nova pesquisa limpa filtros antigos, refinamento conserva contexto',()=>{
 let s=nextState(emptyState(),plan('doceria aberta sábado'));
 assert.equal(s.filters.day,6);
 s=nextState(s,plan('pizzaria'));
 assert.equal(s.category,'Comida');
 assert.equal(s.group,'Pizzaria');
 assert.equal(s.filters.day,undefined);
 s=nextState(s,plan('com entrega',s));
 assert.equal(s.filters.delivery,true);
 s=nextState(s,plan('pizzaria',s));
 assert.equal(s.filters.delivery,undefined);
 s=nextState(s,plan('doceria sem entrega',s));
 assert.equal(s.group,'Doceria');
 assert.equal(s.filters.delivery,false);
 s=nextState(s,plan('doceria',s));
 assert.equal(s.filters.delivery,undefined);
});
test('troca explícita de tipo abre busca e verbos genéricos não viram requisitos',()=>{
 const previous={...emptyState(),selectedStore:shop('pizza','Comida','Pizzaria')};
 const searchNew=plan('doceria abre sábado?',previous);
 assert.equal(searchNew.kind,'search');
 assert.equal(searchNew.taxon?.group,'Doceria');
 const asking=plan('a pizzaria abre sábado?',previous);
 assert.equal(asking.kind,'ask');
 const other=plan('doceria funcionando no sábado');
 assert.equal(other.filters.day,6);
 assert.deepEqual(other.semanticTerms,[]);
 const chosen={...previous,lastResults:[{store:stores[0]},{store:stores[1]}]};
 assert.equal(plan('doceria aberta segunda-feira',chosen).kind,'search');
});

test('linguagem cotidiana e termos equivalentes não eliminam lojas válidas',()=>{
 const sweet=shop('sweet','Comida','Doceria',{name:'Doceria Teste'});
 const pizza=shop('pizza','Comida','Pizzaria',{name:'Pizzaria Teste'});
 const sample={stores:[sweet,pizza],products:[],reviews:[],knowledge:[],hours:[
  {store_id:'sweet',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false},
  {store_id:'pizza',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false}
 ]};
 for(const query of [
  'existe alguma doceria',
  'me indica uma doceria',
  'pode me recomendar uma doceria',
  'conhece uma doceria?',
  'tem uma loja de doces?',
  'confeitaria'
 ]){
  const p=plan(query);
  assert.equal(p.kind,'search',query);
  assert.equal(p.taxon?.group,'Doceria',query);
  assert.equal(p.productTerm,null,query);
  assert.deepEqual(p.semanticTerms,[],query);
  assert.deepEqual(searchStores(sample,nextState(emptyState(),p)).map(x=>x.store.id),['sweet'],query);
 }
 const generic=plan('lojas abertas no sábado');
 assert.equal(generic.filters.day,6);
 assert.deepEqual(searchStores(sample,nextState(emptyState(),generic)).map(x=>x.store.id).sort(),['pizza','sweet']);
});
test('buscar um novo estabelecimento não se transforma em pergunta sobre produtos de loja anterior',()=>{
 const current={...emptyState(),selectedStore:shop('pizza','Comida','Pizzaria')};
 for(const query of ['tem uma doceria?', 'tem alguma loja de doces?']){
  const p=plan(query,current);
  assert.equal(p.kind,'search',query);
  assert.equal(p.taxon?.group,'Doceria',query);
  assert.equal(p.productTerm,null,query);
 }
});

test('nomes de lojas completos, parciais e com uma letra incorreta',()=>{
 const sweet=shop('sweet','Comida','Doceria',{name:'Loja do Misael Teste'});
 const other=shop('other','Comida','Doceria',{name:'Outra Doceria'});
 const sample={stores:[sweet,other],products:[],hours:[],reviews:[],knowledge:[]};
 const queries=['Misael','Misa','Misaell','doceria Misael','doceria Misaell','Loja do Misael Teste'];
 for(const query of queries){
  const p=plan(query);
  const found=searchStores(sample,nextState(emptyState(),p));
  assert.deepEqual(found.map(x=>x.store.id),['sweet'],query+' / plan: '+JSON.stringify(p)+' / state: '+JSON.stringify(nextState(emptyState(),p)));
 }
 assert.deepEqual(searchStores(sample,nextState(emptyState(),plan('doceria'))).map(x=>x.store.id).sort(),['other','sweet']);
});

test('ordenacao de lojas por avaliacoes e preco reconhece flexoes comuns',()=>{
 const a=shop('top','Comida','Pizzaria');
 const b=shop('low','Comida','Pizzaria');
 const samples={stores:[a,b],products:[row('top','Pizza A',{price:60}),row('low','Pizza B',{price:30})],hours:[],
  reviews:[{store_id:'top',rating:5},{store_id:'low',rating:3}],knowledge:[]};
 for(const query of ['pizzaria melhor avaliadas','pizzaria maior nota']){
  const p=plan(query);
  assert.equal(p.filters.sort,'rating',query);
  assert.deepEqual(p.semanticTerms,[],query);
  const found=searchStores(samples,nextState(emptyState(),p));
  assert.deepEqual(found.map(x=>x.store.id),['top','low'],query);
 }
 for(const query of ['pizzaria mais baratas','pizzaria mais economicas']){
  const p=plan(query);
  assert.equal(p.filters.sort,'price',query);
  assert.deepEqual(p.semanticTerms,[],query);
  const found=searchStores(samples,nextState(emptyState(),p));
  assert.deepEqual(found.map(x=>x.store.id),['low','top'],query);
 }
});
test('busca por serviços reconhece sinônimos sem exigir produtos',()=>{
 const taxService={Serviços:{Limpeza:['faxina','limpeza residencial','serviço de limpeza']}};
 const service=shop('clean','Serviços','Limpeza',{name:'Limpeza Exemplo'});
 const samples={stores:[service],products:[],hours:[],reviews:[],knowledge:[]};
 for(const query of ['faxina','empresa de faxina','serviço de limpeza']){
  const p=interpret(query,taxService,{},emptyState(),{today:2});
  assert.equal(p.taxon?.group,'Limpeza',query);
  assert.deepEqual(searchStores(samples,nextState(emptyState(),p)).map(x=>x.store.id),['clean'],query);
 }
});

test('sete formas de perguntar por docerias preservam intenção e horários corretos',()=>{
 const saturday=shop('sweet','Comida','Doceria',{name:'Doceria Exemplo'});
 const weekdayOnly=shop('weekday','Comida','Doceria',{name:'Doceria Fechada no Fim de Semana'});
 const dataset={stores:[saturday,weekdayOnly],products:[],reviews:[],knowledge:[],hours:[
  {store_id:'sweet',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false},
  {store_id:'sweet',weekday:0,opens_at:'09:00',closes_at:'18:00',closed:true},
  {store_id:'weekday',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:true},
  {store_id:'weekday',weekday:0,opens_at:'09:00',closes_at:'18:00',closed:true},
  {store_id:'weekday',weekday:2,opens_at:'09:00',closes_at:'18:00',closed:false}
 ]};
 const cases=[
  ['Quero encontrar uma doceria.',null],
  ['Procure uma loja de doces.',null],
  ['Existe alguma confeitaria?',null],
  ['Quero uma doceria aberta no sábado.',6],
  ['Encontre uma doceria que funcione aos sábados.',6],
  ['Tem alguma loja de doces funcionando no fim de semana?','weekend'],
  ['Quais docerias estão abertas agora?','now']
 ];
 const now=new Date(2026,10,7,11,0,0); // sábado, 11h (hora local do browser)
 for(const [query,when] of cases){
  const p=interpret(query,registeredTaxonomy,registeredAliases,emptyState(),{today:6});
  assert.equal(p.kind,'search',query);
  assert.equal(p.taxon?.category,'Comida',query);
  assert.equal(p.taxon?.group,'Doceria',query);
  assert.equal(p.productTerm,null,query);
  assert.deepEqual(p.semanticTerms,[],query);
  if(when===6)assert.equal(p.filters.day,6,query);
  if(when==='weekend')assert.deepEqual(p.filters.days,[0,6],query);
  if(when==='now')assert.equal(p.filters.openNow,true,query);
  const matches=searchStores(dataset,nextState(emptyState(),p),null,{now});
  assert.deepEqual(matches.map(x=>x.store.id),when===null?['sweet','weekday']:['sweet'],query);
 }
});
test('fim de semana considera sábado OU domingo sem incluir lojas fechadas em ambos',()=>{
 const sunday=shop('sunday','Comida','Doceria',{name:'Domingo'});
 const saturday=shop('saturday','Comida','Doceria',{name:'Sabado'});
 const closed=shop('closed','Comida','Doceria',{name:'Fechado'});
 const ds={stores:[sunday,saturday,closed],products:[],reviews:[],knowledge:[],hours:[
  {store_id:'sunday',weekday:0,opens_at:'08:00',closes_at:'20:00',closed:false},
  {store_id:'saturday',weekday:6,opens_at:'08:00',closes_at:'20:00',closed:false}
 ]};
 const p=interpret('docerias abertas no fim de semana',registeredTaxonomy,registeredAliases);
 assert.deepEqual(p.filters.days,[0,6]);
 assert.deepEqual(searchStores(ds,nextState(emptyState(),p)).map(x=>x.store.id).sort(),['saturday','sunday']);
});
test('todas as 10 categorias e 50 grupos da taxonomia são reconhecidos com contexto explícito',()=>{
 const groups=Object.entries(registeredTaxonomy).flatMap(([category,subgroups])=>Object.keys(subgroups).map(group=>({category,group})));
 assert.equal(Object.keys(registeredTaxonomy).length,10,'quantidade de categorias no AIDB');
 assert.equal(groups.length,50,'quantidade de grupos ativos no AIDB');
 const storesByGroup=groups.map(({category,group},i)=>shop('g'+i,category,group,{name:category+' '+group}));
 const dataByGroup={stores:storesByGroup,products:[],reviews:[],knowledge:[],hours:[]};
 for(let i=0;i<groups.length;i++){
  const {category,group}=groups[i];
  const firstAlias=registeredTaxonomy[category][group].find(alias=>alias!==group);
  const variants=[
   'Quero encontrar '+category+' '+group,
   'Onde encontro '+category+' '+group+'?',
   'Existem estabelecimentos de '+category+' '+group+'?'
  ];
  if(firstAlias)variants.push('Procure '+category+' '+firstAlias);
  for(const question of variants){
   const p=interpret(question,registeredTaxonomy,registeredAliases);
   assert.equal(p.kind,'search',question);
   assert.equal(p.taxon?.category,category,question);
   assert.equal(p.taxon?.group,group,question);
   assert.deepEqual(p.semanticTerms,[],question);
   assert.equal(p.productTerm,null,question);
   const results=searchStores(dataByGroup,nextState(emptyState(),p),null,{limit:60});
   assert.deepEqual(results.map(r=>r.store.id),['g'+i],question);
  }
 }
});


test('conversa consecutiva: busca, proximidade, seleção, entrega, produtos e troca de categoria',()=>{
 const sweetNearby=shop('sweet-near','Comida','Doceria',{name:'Doceria Próxima',latitude:-23.5,longitude:-47.4,delivery:true});
 const sweetFar=shop('sweet-far','Comida','Doceria',{name:'Doceria Distante',latitude:-23.7,longitude:-47.6,delivery:false});
 const pizzeria=shop('pizza-new','Comida','Pizzaria',{name:'Pizzaria Nova',latitude:-23.6,longitude:-47.4,delivery:true});
 const ds={stores:[sweetFar,sweetNearby,pizzeria],products:[
  row('sweet-near','Brigadeiro',{stock:4}),row('sweet-far','Bolo',{stock:0}),
  row('pizza-new','Pizza',{stock:3})
 ],reviews:[],knowledge:[],hours:[
  {store_id:'sweet-near',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false},
  {store_id:'sweet-far',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false}
 ]};
 let s=emptyState();
 const first=plan('Quero uma doceria.',s);
 assert.equal(first.kind,'search');
 s=nextState(s,first);
 assert.equal(s.group,'Doceria');
 s.lastResults=searchStores(ds,s);
 assert.deepEqual(s.lastResults.map(r=>r.store.id).sort(),['sweet-far','sweet-near']);
 const near=plan('Qual fica mais perto?',s);
 assert.equal(near.kind,'search');
 assert.equal(near.filters.sort,'distance');
 s=nextState(s,near);
 s.lastResults=searchStores(ds,s,{lat:-23.5005,lng:-47.4005});
 assert.equal(s.lastResults[0].store.id,'sweet-near');
 const selected=plan('A primeira abre sábado?',s);
 assert.equal(selected.kind,'select');assert.equal(selected.index,0);
 assert.equal(selected.ask,'hours');assert.equal(selected.filters.day,6);
 s.selectedStore=s.lastResults[0].store;
 assert.equal(plan('Ela faz entrega?',s).ask,'delivery');
 assert.equal(plan('Quais produtos vende?',s).ask,'products');
 const switchTopic=plan('Agora quero encontrar uma pizzaria.',s);
 assert.equal(switchTopic.kind,'search');
 s=nextState(s,switchTopic);
 assert.equal(s.group,'Pizzaria');
 assert.equal(s.filters.sort,undefined,'ordenação antiga deve ser descartada');
 assert.equal(s.filters.day,undefined,'dia consultado não deve virar filtro antigo');
 assert.equal(s.selectedStore,null);
 assert.deepEqual(searchStores(ds,s).map(r=>r.store.id),['pizza-new']);
});

test('falso negativo: loja com dois turnos no mesmo dia deve abrir no segundo turno',()=>{
 const st=shop('turnos','Comida','Doceria');
 const slots=[
  {store_id:'turnos',weekday:6,opens_at:'08:00',closes_at:'12:00',closed:false},
  {store_id:'turnos',weekday:6,opens_at:'14:00',closes_at:'19:00',closed:false}
 ];
 assert.equal(scheduleMatches(st,slots,{day:6,start:1020,end:1020}),true,'17h deve corresponder ao segundo turno');
 assert.equal(scheduleMatches(st,slots,{day:6,start:780,end:780}),false,'13h é intervalo fechado');
 assert.equal(scheduleMatches(st,slots,{day:6,start:600,end:600}),true,'10h corresponde ao primeiro turno');
});

test('falso positivo: correspondência no interior de outra palavra não equivale a palavra pesquisada',()=>{
 const barbershop=shop('barber','Beleza','Barbearia',{name:'Barbearia do Centro',description:'Corte de cabelo'});
 const ds={stores:[barbershop],products:[],reviews:[],knowledge:[],hours:[]};
 assert.deepEqual(searchStores(ds,nextState(emptyState(),plan('bar'))).map(r=>r.store.id),[],
  'Bar não deve corresponder apenas ao começo de barbearia');
 const named=shop('named','Comida','Doceria',{name:'Loja do Misael Teste'});
 assert.deepEqual(searchStores({...ds,stores:[named]},nextState(emptyState(),plan('Misa'))).map(r=>r.store.id),['named'],
  'Busca parcial por nome da loja deve continuar funcionando');
});

test('falso positivo: produtos sem publicação ativa comprovada não podem ser recomendados',()=>{
 const base=row('store','Brigadeiro',{stock:5});
 assert.equal(eligibleProduct({...base,active:null}),false);
 assert.equal(eligibleProduct({...base,show_in_ai:null}),false);
 assert.equal(eligibleProduct({...base,active:true,show_in_ai:true}),true);
 assert.equal(eligibleProduct({...base,stock:0}),false);
});

test('falso positivo de localização: coordenadas ausentes, inválidas ou vazias não contam como distância real',()=>{
 const pos={lat:-23.5,lng:-47.4};
 assert.equal(distanceKm(pos,{latitude:'',longitude:''}),null);
 assert.equal(distanceKm(pos,{latitude:100,longitude:-47.4}),null);
 assert.equal(distanceKm({lat:999,lng:0},{latitude:-23.5,longitude:-47.4}),null);
 assert.equal(distanceKm(pos,{latitude:null,longitude:-47.4}),null);
 assert.ok(distanceKm(pos,{latitude:-23.5,longitude:-47.401})>0);
});

test('múltiplos filtros, produto indisponível e ausência de resultados não inventam estabelecimentos',()=>{
 const a=shop('a','Comida','Doceria',{delivery:true,payment_methods:['Pix']});
 const b=shop('b','Comida','Doceria',{delivery:false,payment_methods:['Pix']});
 const dataset={stores:[a,b],hours:[
  {store_id:'a',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false},
  {store_id:'b',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false}
 ],reviews:[{store_id:'a',rating:5},{store_id:'b',rating:3}],
 products:[row('a','Bolo',{stock:0})],knowledge:[]};
 assert.deepEqual(searchStores(dataset,nextState(emptyState(),plan('doceria com entrega aberta sábado nota acima de 4'))).map(r=>r.store.id),['a']);
 assert.deepEqual(searchStores(dataset,nextState(emptyState(),plan('doceria sem entrega aberta sábado nota acima de 4'))).map(r=>r.store.id),[]);
 assert.deepEqual(searchStores(dataset,nextState(emptyState(),plan('pizzaria'))).map(r=>r.store.id),[]);
 assert.deepEqual(searchStores(dataset,nextState(emptyState(),plan('doceria em promoção'))).map(r=>r.store.id),[]);
});


test('filtros simultâneos de nota e preço aplicam quantias separadamente',()=>{
 const st=shop('premium','Comida','Doceria',{delivery:true});
 const ds={stores:[st],hours:[],reviews:[{store_id:'premium',rating:5}],knowledge:[],
  products:[row('premium','Bolo de chocolate',{stock:5,price:35})]};
 const p=plan('doceria com entrega nota acima de 4 e bolo até R$ 40');
 assert.equal(p.filters.minRating,4);
 assert.equal(p.filters.maxPrice,40);
 assert.equal(p.filters.minPrice,undefined);
 assert.deepEqual(searchStores(ds,nextState(emptyState(),p)).map(r=>r.store.id),['premium']);
 const tooCheap=plan('doceria com entrega nota acima de 4 e bolo até R$ 20');
 assert.deepEqual(searchStores(ds,nextState(emptyState(),tooCheap)).map(r=>r.store.id),[]);
});


test('expressões de cortesia não impedem doceria realmente aberta no sábado',()=>{
 const store=shop('misael','Comida','Doceria',{name:'Loja do Misael Teste'});
 const hours=[{store_id:'misael',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false}];
 const samples={stores:[store],hours,products:[],reviews:[],knowledge:[]};
 const queries=[
  'Por favor, quero uma doceria aberta no sábado',
  'Quero uma doceria aberta no sábado, por favor',
  'Pode me indicar, por gentileza, uma doceria aberta aos sábados?',
  'Se possível, quero uma doceria aberta no sábado',
  'Quero uma doceria aberta no sábado, obrigado',
  'pfv, uma doceria aberta no sábado'
 ];
 for(const query of queries){
  const p=plan(query);
  assert.equal(p.kind,'search',query);
  assert.equal(p.taxon?.group,'Doceria',query);
  assert.equal(p.filters.day,6,query);
  assert.deepEqual(p.semanticTerms,[],query);
  assert.equal(p.productTerm,null,query);
  const rows=searchStores(samples,nextState(emptyState(),p),null,{now:new Date('2026-11-07T12:00:00')});
  assert.deepEqual(rows.map(r=>r.store.id),['misael'],query);
 }
 const closed={...samples,hours:[{...hours[0],closed:true}]};
 const q=plan(queries[0]);
 assert.deepEqual(searchStores(closed,nextState(emptyState(),q)).map(r=>r.store.id),[],
  'A correção de cortesia não pode incluir lojas fechadas');
});
test('o nome Favor continua pesquisável quando não é uma expressão de cortesia',()=>{
 const shopNamedFavor=shop('favor','Serviços','Limpeza',{name:'Casa Favor'});
 const p=plan('Favor');
 assert.deepEqual(p.semanticTerms,['favor']);
 const results=searchStores({stores:[shopNamedFavor],products:[],reviews:[],hours:[],knowledge:[]},nextState(emptyState(),p));
 assert.deepEqual(results.map(x=>x.store.id),['favor']);
});

test('pedido simples me diga uma doceria',()=>{ const p=plan('Por favor, me diga uma doceria'); assert.equal(p.taxon?.group,'Doceria'); assert.deepEqual(p.semanticTerms,[]); });

test('formas equivalentes de pedir indicação não acrescentam palavras obrigatórias',()=>{
 const qs=['Por favor, me diga uma doceria','Me fale de uma doceria','Pode me dizer uma doceria?','Você consegue me indicar uma doceria?','Poderia me informar uma doceria?','Me sugira uma doceria','Por gentileza, me conte uma doceria'];
 const s=shop('s','Comida','Doceria',{name:'Doceria Teste'});
 const data={stores:[s],hours:[],products:[],reviews:[],knowledge:[]};
 for(const query of qs){
  const p=plan(query);
  assert.equal(p.kind,'search',query);
  assert.equal(p.taxon?.group,'Doceria',query);
  assert.deepEqual(p.semanticTerms,[],query);
  assert.deepEqual(searchStores(data,nextState(emptyState(),p)).map(r=>r.store.id),['s'],query);
 }
 const named=shop('d','Serviços','Limpeza',{name:'Diga Serviços'});
 const p=plan('Diga');
 assert.deepEqual(p.semanticTerms,['diga']);
 assert.deepEqual(searchStores({...data,stores:[named]},nextState(emptyState(),p)).map(r=>r.store.id),['d']);
});


test('contexto livre não vira exigência literal quando o tipo de loja é conhecido',()=>{
 const doce=shop('doce','Comida','Doceria',{name:'Loja do Misael Teste'});
 const pizza=shop('pizza','Comida','Pizzaria',{name:'Pizza Exemplo'});
 const samples={stores:[doce,pizza],hours:[{store_id:'doce',weekday:6,opens_at:'09:00',closes_at:'18:00',closed:false}],products:[],reviews:[],knowledge:[]};
 const phrasings=[
  'Por favor, me diga uma doceria',
  'Será que você poderia gentilmente me apresentar uma doceria?',
  'Eu adoraria saber se há alguma confeitaria',
  'Por acaso você conhece um lugar de doces?',
  'Gostaria de receber uma indicação de doceria',
  'Me mostre alguma doceria de que você tenha conhecimento',
  'Será que teria alguma doceria aberta no sábado, se não for incômodo?'
 ];
 for(const query of phrasings){
  const p=plan(query);
  assert.equal(p.kind,'search',query);
  assert.equal(p.taxon?.group,'Doceria',query);
  assert.deepEqual(p.nameTerms,[],query);
  const matches=searchStores(samples,nextState(emptyState(),p));
  assert.deepEqual(matches.map(x=>x.store.id),['doce'],query);
 }
 const saturday=plan('Por gentileza, encontre uma doceria aberta no sábado');
 assert.equal(saturday.filters.day,6);
 assert.deepEqual(searchStores(samples,nextState(emptyState(),saturday)).map(r=>r.store.id),['doce']);
 const closed={...samples,hours:[{...samples.hours[0],closed:true}]};
 assert.deepEqual(searchStores(closed,nextState(emptyState(),saturday)).map(r=>r.store.id),[],'filtro explícito de horário permanece obrigatório');
});

test('pesquisa por nome explícito continua restritiva e contexto opcional só ajuda a relevância',()=>{
 const sweet=shop('sweet','Comida','Doceria',{name:'Loja do Misael Teste'});
 const generic=shop('generic','Comida','Doceria',{name:'Doceria Geral'});
 const dataset={stores:[sweet,generic],hours:[],products:[],reviews:[],knowledge:[]};
 for(const query of ['doceria Misael','doceria Misaell','doceria de nome Misael','doceria chamada Misael']){
  const p=plan(query);
  assert.equal(p.taxon?.group,'Doceria',query);
  assert.ok(p.nameTerms.includes(query.includes('Misaell')?'misaell':'misael'),query);
  assert.deepEqual(searchStores(dataset,nextState(emptyState(),p)).map(r=>r.store.id),['sweet'],query);
 }
 const missing=plan('doceria chamada Fantasma');
 assert.deepEqual(searchStores(dataset,nextState(emptyState(),missing)).map(r=>r.store.id),[]);
 const context=plan('Consegue recomendar alguma doceria maravilhosa e interessante?');
 assert.deepEqual(searchStores(dataset,nextState(emptyState(),context)).map(r=>r.store.id).sort(),['generic','sweet']);
});

test('atributos reconhecidos e produtos em estoque permanecem exigências reais',()=>{
 const plain=shop('plain','Comida','Doceria',{name:'Doceria Simples'});
 const handmade=shop('handmade','Comida','Doceria',{name:'Doceria Artesanal',description:'Doces artesanais e ambiente tranquilo'});
 const dataset={stores:[plain,handmade],products:[],reviews:[],hours:[],knowledge:[]};
 const p=plan('Gostaria de conhecer uma doceria artesanal');
 assert.deepEqual(searchStores(dataset,nextState(emptyState(),p)).map(r=>r.store.id),['handmade']);
 const noPizza=plan('Quero comprar uma camiseta tamanho M');
 const shirts={stores:[shop('clothes','Roupas','Infantil')],products:[row('clothes','Camiseta Infantil',{sizes:['M'],stock:0})],hours:[],reviews:[],knowledge:[]};
 assert.deepEqual(searchStores(shirts,nextState(emptyState(),noPizza)).map(r=>r.store.id),[]);
});


test('categoria reconhecida com banco sem docerias informa ausência de cadastro, não falha do interpretador',()=>{
 const pizza=shop('pizza','Comida','Pizzaria',{name:'Loja do Misael Teste'});
 const other=shop('other','Comida','Pizzaria',{name:'Pizzaria'});
 const data={stores:[pizza,other],products:[],hours:[],reviews:[],knowledge:[]};
 const query='Por favor, poderia me recomendar uma doceria';
 const planResult=plan(query);
 assert.equal(planResult.kind,'search');
 assert.equal(planResult.taxon?.category,'Comida');
 assert.equal(planResult.taxon?.group,'Doceria');
 const state=nextState(emptyState(),planResult);
 assert.equal(state.group,'Doceria');
 assert.deepEqual(searchStores(data,state).map(x=>x.store.id),[]);
 assert.match(explainEmptySearch(data,state),/Não há estabelecimentos ativos cadastrados como Doceria/);
 const pizzaPlan=plan('Por favor, poderia me recomendar uma pizzaria');
 assert.deepEqual(searchStores(data,nextState(emptyState(),pizzaPlan)).map(x=>x.store.id).sort(),['other','pizza']);
});
test('retorno vazio por filtro distingue lojas disponíveis de categoria sem cadastro',()=>{
 const sweet=shop('sweet','Comida','Doceria',{delivery:false});
 const data={stores:[sweet],products:[],hours:[],reviews:[],knowledge:[]};
 const state=nextState(emptyState(),plan('doceria com entrega'));
 assert.deepEqual(searchStores(data,state),[]);
 assert.match(explainEmptySearch(data,state),/Há estabelecimentos cadastrados em Doceria, mas nenhum atende/);
 const missingCategory=nextState(emptyState(),plan('pizzaria'));
 assert.match(explainEmptySearch(data,missingCategory),/Não há estabelecimentos ativos cadastrados como Pizzaria/);
 const disabled={...data,stores:[{...sweet,active:false}]};
 assert.match(explainEmptySearch(disabled,state),/Não há estabelecimentos ativos disponíveis/);
});


// Auditoria das 35 frases sugeridas ao usuário: contexto vs. filtro obrigatório.
const pizzaPhrases=[
 ['Por gentileza, você conseguiria me indicar uma pizzaria?',{}],
 ['Gostaria muito de receber uma recomendação de pizzaria.',{}],
 ['Seria possível me apresentar alguma pizzaria?',{}],
 ['Você poderia fazer a gentileza de encontrar uma pizzaria para mim?',{}],
 ['Se não for incômodo, poderia sugerir uma pizzaria?',{}],
 ['Ficaria agradecido se encontrasse uma pizzaria.',{}],
 ['Por acaso você saberia me dizer onde tem uma pizzaria?',{}],
 ['Você teria alguma indicação de pizzaria para me passar?',{}],
 ['Estou pensando em comer pizza, tem algum lugar?',{}],
 ['Bateu vontade de pizza. Onde posso encontrar?',{}],
 ['Tem algum lugar que prepare pizzas?',{}],
 ['Onde consigo pedir uma pizza?',{}],
 ['Queria descobrir um lugar legal para comer pizza.',{}],
 ['Tô procurando uma pizzaria, conhece alguma?',{}],
 ['Me ajuda a achar um lugar que venda pizza?',{}],
 ['Sabe de algum estabelecimento especializado em pizzas?',{}],
 ['Será que existe alguma pizzaria cadastrada por aqui?',{}],
 ['Quais são as minhas opções para comer pizza?',{}],
 ['O que você recomenda para quem está com vontade de pizza?',{}],
 ['Se eu quiser comer pizza, onde devo procurar?',{}],
 ['Você conhece algum restaurante que sirva pizza?',{}],
 ['Que estabelecimentos oferecem pizzas?',{}],
 ['Estou sem ideias de onde comer pizza. Pode ajudar?',{}],
 ['Existe algum comércio voltado para a venda de pizzas?',{}],
 ['Poderia me indicar uma pizaria?',{}],
 ['Quero encontra uma pizzarria.',{}],
 ['Tem alguna pizzaria cadastrada?',{}],
 ['Me recomenda uma pizzaria pfvr',{}],
 ['Por favor, consegue encontrar uma pizzaria que funcione aos sábados?',{day:6,ids:['a']}],
 ['Gostaria de uma pizzaria que faça entrega e aceite Pix.',{delivery:true,payment:'pix',ids:['a']}],
 ['Será que há alguma pizzaria aberta agora?',{openNow:true}],
 ['Procuro uma pizzaria que abra no domingo.',{day:0,ids:['a']}],
 ['Poderia recomendar uma pizzaria bem avaliada?',{sort:'rating'}],
 ['Você tem alguma sugestão de pizzaria que permita retirada?',{pickup:true,ids:['a']}],
 ['Preciso de uma pizzaria com entrega e avaliação acima de 4 estrelas.',{delivery:true,minRating:4,ids:['a']}]
];
const pizzaAuditData={
 stores:[
  shop('a','Comida','Pizzaria',{name:'Pizza Exemplo A',delivery:true,pickup:true,payment_methods:['Pix'],latitude:-23.5,longitude:-47.4}),
  shop('b','Comida','Pizzaria',{name:'Pizza Exemplo B',delivery:false,pickup:false,payment_methods:[],latitude:-23.6,longitude:-47.4})
 ],
 hours:[
  ...[0,2,6].map(weekday=>({store_id:'a',weekday,opens_at:'09:00',closes_at:'18:00',closed:false})),
  {store_id:'b',weekday:2,opens_at:'09:00',closes_at:'18:00',closed:false},
  ...[0,6].map(weekday=>({store_id:'b',weekday,closed:true}))
 ],
 products:[],knowledge:[],
 reviews:[{store_id:'a',rating:5},{store_id:'b',rating:2}]
};
for(const [idx,[query,expected]] of pizzaPhrases.entries()){
 test('auditoria das 35 frases de pizzaria #'+(idx+1),()=>{
  const p=plan(query);
  assert.equal(p.kind,'search',query+' deveria iniciar pesquisa');
  assert.equal(p.taxon?.group,'Pizzaria',query+' deveria identificar a pizzaria');
  assert.equal(p.productTerm,null,query+' não deve virar busca obrigatória de produto');
  assert.deepEqual(p.nameTerms,[],query+' não solicita uma loja pelo nome');
  for(const [key,value] of Object.entries(expected))if(key!=='ids')assert.deepEqual(p.filters[key],value,query+' filtro '+key);
  const state=nextState(emptyState(),p);
  const result=searchStores(pizzaAuditData,state,null,{now:new Date(2026,10,3,12,0,0)});
  assert.deepEqual(result.map(r=>r.store.id).sort(),(expected.ids||['a','b']).slice().sort(),query+' deve retornar apenas lojas que atendem aos filtros');
 });
}


test('explica por que entrega e Pix não coincidem na mesma pizzaria',()=>{
 const pix=shop('pix','Comida','Pizzaria',{name:'Loja do Misael Teste',delivery:false,payment_methods:['Pix']});
 const delivery=shop('delivery','Comida','Pizzaria',{name:'Pizzaria',delivery:true,payment_methods:[]});
 const dataset={stores:[pix,delivery],products:[],hours:[],reviews:[],knowledge:[]};
 const query='Gostaria de uma pizzaria que faça entrega e aceite Pix';
 const p=plan(query);
 assert.equal(p.taxon?.group,'Pizzaria');
 assert.equal(p.filters.delivery,true);
 assert.equal(p.filters.payment,'pix');
 const state=nextState(emptyState(),p);
 assert.deepEqual(searchStores(dataset,state),[],'não pode combinar entrega de uma loja com Pix de outra');
 const message=explainEmptySearch(dataset,state);
 assert.match(message,/que fazem entrega e outros que aceitam Pix/);
 assert.match(message,/nenhum atende aos dois requisitos ao mesmo tempo/);
 const both={...dataset,stores:[pix,{...delivery,payment_methods:['Pix']}]};
 assert.deepEqual(searchStores(both,state).map(r=>r.store.id),['delivery'],'só retorna a loja com ambos os requisitos');
});
test('diagnóstico combinado mantém filtros adicionais e não inventa Pix ou entrega',()=>{
 const pix=shop('pix','Comida','Pizzaria',{name:'Só Pix',delivery:false,payment_methods:['Pix']});
 const delivery=shop('delivery','Comida','Pizzaria',{name:'Só Entrega',delivery:true,payment_methods:[]});
 const q=plan('pizzaria que faça entrega e aceite Pix');
 const state=nextState(emptyState(),q);
 assert.match(explainEmptySearch({stores:[delivery]},state),/fazem entrega, mas nenhum deles atende também à exigência de Pix/);
 assert.match(explainEmptySearch({stores:[pix]},state),/aceitam Pix, mas nenhum deles atende também à exigência de entrega/);
 const noHours={stores:[pix,delivery],hours:[],products:[],reviews:[],knowledge:[]};
 const saturday=nextState(emptyState(),plan('pizzaria que faça entrega e aceite Pix aberta no sábado'));
 assert.match(explainEmptySearch(noHours,saturday),/nenhum atende a todos os critérios/);
});


test('pesquisa por assunto não exige verbos da conversa nem palavras adicionais sem significado comercial',()=>{
 const options={today:2};
 const right=shop('burger','Comida','Hamburgueria',{name:'Hamburgueria Real'});
 const wrong=shop('pizza','Comida','Pizzaria',{name:'Pizzaria Real'});
 const taxonomy={Comida:{Hamburgueria:['hamburgueria','hamburguer','lanche'],Pizzaria:['pizzaria','pizza']}};
 const catalog={stores:[right,wrong],products:[],hours:[],reviews:[],knowledge:[]};
 const qs=[
  'Por favor, localize uma hamburgueria',
  'Se conseguir, busque hamburgueria que exista por aí',
  'Você acha uma hamburgueria?',
  'Poderia me encontrar uma hamburgueria, obrigado?',
  'Há como descobrir algum lugar de hambúrguer?',
  'Queria ver opções de hamburguerias, por gentileza',
  'Por obséquio, me mostre estabelecimentos de hamburgueria',
  'Preciso que você pesquise alguma hamburgueria interessante'
 ];
 for(const q of qs){
  const p=interpret(q,taxonomy,{},emptyState(),options);
  assert.equal(p.taxon?.group,'Hamburgueria',q);
  assert.deepEqual(searchStores(catalog,nextState(emptyState(),p)).map(r=>r.store.id),['burger'],q);
 }
 assert.deepEqual(searchStores({...catalog,stores:[wrong]},nextState(emptyState(),interpret(qs[0],taxonomy,{},emptyState(),options))),[],
 'o GURU não deve inventar hamburguerias se o banco não contém nenhuma');
});

test('contexto do catálogo busca produto específico sem exigir comandos conversacionais',()=>{
 const tech=shop('tech','Tecnologia','Informática',{name:'Loja Digital'});
 const shoes=shop('shoes','Roupas','Calçados',{name:'Calçados Central'});
 const bakery=shop('bakery','Comida','Padaria',{name:'Padaria do Centro'});
 const none=shop('none','Comida','Pizzaria',{name:'Pizzaria Central'});
 const items=[
  row('tech','Notebook Gamer',{stock:2,price:3500}),
  row('tech','Fone Bluetooth',{stock:3}),
  row('shoes','Tênis de Corrida',{stock:2}),
  row('bakery','Pão de Queijo',{stock:8}),
  row('none','Pizza de Chocolate',{stock:0})
 ];
 const catalogue={stores:[tech,shoes,bakery,none],products:items,hours:[],reviews:[],knowledge:[]};
 const questions=[
  ['Por favor, me ajuda a achar notebook gamer?','tech','notebook'],
  ['Consegue descobrir algum lugar onde vende fone bluetooth?','tech','fone'],
  ['Me encontre um tênis de corrida, se possível.','shoes','tenis'],
  ['Você poderia buscar pão de queijo para mim?','bakery','pao'],
  ['Gostaria de saber quem comercializa notebook gamer.','tech','notebook'],
  ['Procure onde tem notebook gamer disponível, por gentileza.','tech','notebook'],
  ['Há por acaso uma loja que tenha fone bluetooth?','tech','fone'],
  ['Pesquise um estabelecimento que vende tênis de corrida.','shoes','tenis']
 ];
 for(const [question,id,word] of questions){
  const p=interpret(question,{}, {}, emptyState(),{today:2,products:items});
  assert.equal(p.kind,'search',question);
  assert.ok(p.productTerm?.includes(word),question+' / produto: '+p.productTerm);
  assert.deepEqual(searchStores(catalogue,nextState(emptyState(),p)).map(r=>r.store.id),[id],question);
 }
 const gone=interpret('Você poderia achar uma pizza de chocolate?',{}, {},emptyState(),{products:items});
 assert.deepEqual(searchStores(catalogue,nextState(emptyState(),gone)),[],'item cadastrado sem estoque não pode ser recomendado');
});

test('palavras soltas não bloqueiam busca por nome e uma nova pesquisa de produto não herda a antiga categoria',()=>{
 const pizza=shop('pizza','Comida','Pizzaria',{name:'Pizzaria da Vila'});
 const store=shop('misael','Serviços','Limpeza',{name:'Loja do Misael'});
 const notebookStore=shop('tech','Tecnologia','Informática',{name:'Loja Digital'});
 const product=row('tech','Notebook Gamer',{stock:5});
 const db={stores:[pizza,store,notebookStore],products:[product],hours:[],reviews:[],knowledge:[]};
 for(const q of [
  'Por favor, procure a Loja do Misael',
  'Conseguiria encontrar o estabelecimento Misael?',
  'Será que você acha a loja Misael na região?'
 ]){
  const p=interpret(q,{}, {},emptyState(),{today:2,products:[product]});
  assert.equal(p.kind,'search',q);
  assert.deepEqual(searchStores(db,nextState(emptyState(),p)).map(r=>r.store.id),['misael'],q);
 }
 const selected={...emptyState(),category:'Comida',group:'Pizzaria',selectedStore:pizza,filters:{delivery:true,day:6}};
 const p=interpret('Agora, por favor, encontre um notebook gamer',{}, {},selected,{today:2,products:[product]});
 const updated=nextState(selected,p);
 assert.equal(updated.category,null);
 assert.equal(updated.group,null);
 assert.deepEqual(updated.filters,{});
 assert.equal(updated.selectedStore,null);
 assert.deepEqual(searchStores(db,updated).map(r=>r.store.id),['tech']);
});

test('pedido de produto sem descrição concreta não inventa catálogo nem bloqueia com palavra encontrar',()=>{
 const p=interpret('Por favor, você pode me ajudar a encontrar um produto?',{}, {},emptyState(),{products:[]});
 assert.equal(p.kind,'clarify');
 assert.equal(p.reason,'product');
 const noStore=interpret('Por favor, pode encontrar uma hamburgueria?',{Comida:{Hamburgueria:['hamburgueria']}}, {},emptyState(),{products:[]});
 assert.equal(noStore.kind,'search');
 assert.equal(noStore.taxon?.group,'Hamburgueria');
});


test('nome próprio de loja prevalece sobre item de catálogo com palavra coincidente',()=>{
 const named=shop('misael','Serviços','Limpeza',{name:'Loja do Misael Teste'});
 const other=shop('other','Comida','Pizzaria',{name:'Pizza Teste'});
 const catalog=[row('other','Teste',{stock:2})];
 const query='Por favor, encontre a Loja do Misael Teste';
 const p=interpret(query,{}, {},emptyState(),{products:catalog});
 assert.equal(p.kind,'search');
 assert.equal(p.productTerm,null,'palavra compartilhada com produto não deve apagar busca por loja nomeada');
 assert.deepEqual(searchStores({stores:[named,other],products:catalog,hours:[],reviews:[],knowledge:[]},nextState(emptyState(),p)).map(r=>r.store.id),['misael']);
});


test('destaque normal nunca mostra verificação, mesmo após aprovação legada',()=>{
 const s=shop('normal','Comida','Pizzaria',{verified:true,sponsored:true});
 const normal=applyStoreHighlight(s,{store_id:'normal',highlight_type:'normal',active:true});
 assert.equal(normal.verified,false);
 assert.equal(normal.sponsored,false);
 assert.equal(s.verified,true,'não alterar a origem apenas para apresentar o card');
 assert.equal(applyStoreHighlight(s).verified,false,'sem destaque não exibe verificação');
});
test('destaque verificada e patrocinada mantém selos mutuamente exclusivos',()=>{
 const s=shop('store','Comida','Pizzaria',{verified:false,sponsored:false});
 const verified=applyStoreHighlight(s,{highlight_type:'verified',active:true});
 assert.equal(verified.verified,true);
 assert.equal(verified.sponsored,false);
 const sponsored=applyStoreHighlight(s,{highlight_type:'sponsored',active:true});
 assert.equal(sponsored.verified,false);
 assert.equal(sponsored.sponsored,true);
});
test('destaques desativados, futuros ou vencidos não geram selo',()=>{
 const s=shop('store','Comida','Pizzaria',{verified:true});
 const now=Date.parse('2026-11-04T12:00:00Z');
 const highlights=[
  {highlight_type:'verified',active:false},
  {highlight_type:'verified',active:true,starts_at:'2026-12-01T00:00:00Z'},
  {highlight_type:'sponsored',active:true,ends_at:'2026-10-01T00:00:00Z'},
  {highlight_type:'verified',active:true,starts_at:'valor inválido'}
 ];
 for(const h of highlights){
  const result=applyStoreHighlight(s,h,now);
  assert.equal(result.verified,false);
  assert.equal(result.sponsored,false);
 }
 assert.equal(applyStoreHighlight(s,{highlight_type:'verified',active:true,starts_at:'2026-11-01T00:00:00Z',ends_at:'2026-12-01T00:00:00Z'},now).verified,true);
});


test('ordenação padrão prioriza Patrocinada, Verificada e Normal nessa ordem',()=>{
 const normal=shop('normal','Comida','Pizzaria',{name:'AAA Normal',delivery:true,verified:false,sponsored:false,latitude:-23.501,longitude:-47.400});
 const verified=shop('verified','Comida','Pizzaria',{name:'ZZZ Verificada',verified:true,sponsored:false,latitude:-23.51,longitude:-47.400});
 const sponsored=shop('sponsored','Comida','Pizzaria',{name:'MMM Patrocinada',verified:false,sponsored:true,latitude:-23.60,longitude:-47.400});
 const data={stores:[normal,verified,sponsored],products:[],hours:[],knowledge:[],reviews:[{store_id:'normal',rating:5},{store_id:'verified',rating:4},{store_id:'sponsored',rating:3}]};
 const state=nextState(emptyState(),plan('pizzaria'));
 const rows=searchStores(data,state,{lat:-23.5,lng:-47.4},{limit:10});
 assert.deepEqual(rows.map(r=>r.store.id),['sponsored','verified','normal'],'categoria do destaque deve preceder relevância, nome, distância e nota no padrão');
});

test('ordenar explicitamente por distância, avaliação ou preço respeita o critério solicitado',()=>{
 const normal=shop('normal','Comida','Pizzaria',{name:'AAA Normal',verified:false,sponsored:false,latitude:-23.5001,longitude:-47.400});
 const verified=shop('verified','Comida','Pizzaria',{name:'Verificada',verified:true,latitude:-23.53,longitude:-47.400});
 const sponsored=shop('sponsored','Comida','Pizzaria',{name:'Patrocinada',sponsored:true,latitude:-23.60,longitude:-47.400});
 const ds={stores:[normal,verified,sponsored],hours:[],knowledge:[],
  products:[row('normal','Pizza',{price:20}),row('verified','Pizza',{price:30}),row('sponsored','Pizza',{price:40})],
  reviews:[{store_id:'normal',rating:5},{store_id:'verified',rating:4},{store_id:'sponsored',rating:3}]};
 const base=nextState(emptyState(),plan('pizzaria'));
 const sorted=sort=>searchStores(ds,{...base,filters:{...base.filters,sort}},{lat:-23.5,lng:-47.4},{limit:10}).map(r=>r.store.id);
 assert.deepEqual(sorted('distance'),['normal','verified','sponsored']);
 assert.deepEqual(sorted('rating'),['normal','verified','sponsored']);
 assert.deepEqual(sorted('price'),['normal','verified','sponsored']);
});

test('classificação nunca contorna filtros de disponibilidade ou status',()=>{
 const verified=shop('verified','Comida','Pizzaria',{verified:true,delivery:false});
 const sponsored=shop('sponsored','Comida','Pizzaria',{sponsored:true,active:false,delivery:true});
 const normal=shop('normal','Comida','Pizzaria',{delivery:true});
 const state=nextState(emptyState(),plan('pizzaria com entrega'));
 const rows=searchStores({stores:[verified,sponsored,normal],hours:[],products:[],reviews:[],knowledge:[]},state);
 assert.deepEqual(rows.map(r=>r.store.id),['normal']);
});


test('score de classificação usa faixas claras e dados verificáveis (0 a 100)',()=>{
 const details={
  name:'Pizzaria Completa',category:'Comida',group:'Pizzaria',
  address:'Rua São José, 100 - Sorocaba - SP',latitude:-23.5,longitude:-47.4,
  description:'Pizzas e massas',phone:'15999999999',logo_url:'https://example.com/logo.png',
  payment_methods:['Pix']
 };
 const catalog={
  products:[row('complete','Pizza Mussarela',{stock:4,active:true,show_in_ai:true})],
  hours:[{store_id:'complete',weekday:6,opens_at:'10:00',closes_at:'20:00',closed:false}],
  reviews:[{store_id:'complete',rating:5}]
 };
 const normal=storeRankingPoints({...details,verified:false,sponsored:false},catalog);
 const verified=storeRankingPoints({...details,verified:true,sponsored:false},catalog);
 const sponsored=storeRankingPoints({...details,verified:false,sponsored:true},catalog);
 assert.deepEqual([normal.total,verified.total,sponsored.total],[30,65,100]);
 assert.equal(normal.tierName,'Normal');
 assert.equal(verified.tierName,'Verificada');
 assert.equal(sponsored.tierName,'Patrocinada');
 assert.equal(normal.details.reduce((sum,p)=>sum+p.earned,0),normal.total);
});

test('pontuação não recompensa estoque inexistente, localização inválida ou dados ausentes',()=>{
 const absent=shop('s','Comida','Pizzaria',{latitude:'',longitude:'',description:'',phone:'',logo_url:'',payment_methods:[]});
 const score=storeRankingPoints(absent,{
  hours:[{store_id:'s',weekday:2,closed:true}],
  products:[row('s','Pizza',{stock:0,active:true,show_in_ai:true})],
  reviews:[{store_id:'s',rating:10}]
 });
 assert.equal(score.details.find(x=>x.label==='Localização válida').earned,0);
 assert.equal(score.details.find(x=>x.label==='Produto disponível').earned,0);
 assert.equal(score.details.find(x=>x.label==='Horário informado').earned,0);
 assert.equal(score.details.find(x=>x.label==='Avaliação dos clientes').earned,0);
 assert.ok(score.total<30);
 assert.equal(score.details.reduce((sum,p)=>sum+p.earned,0),score.total);
});

test('score superior ordena primeiro entre lojas da mesma classificação',()=>{
 const rich=shop('rich','Comida','Pizzaria',{name:'ZZZ Cadastro Completo',description:'Descrição',address:'Rua C, 100 - SP',latitude:-23.5,longitude:-47.4,payment_methods:['Pix'],logo_url:'https://example.com/c.png',phone:'15999999999'});
 const basic=shop('basic','Comida','Pizzaria',{name:'AAA Cadastro Básico',description:'',address:'',payment_methods:[],latitude:null,longitude:null});
 const db={stores:[basic,rich],products:[row('rich','Pizza',{stock:5})],hours:[{store_id:'rich',weekday:6,opens_at:'10:00',closes_at:'18:00',closed:false}],reviews:[{store_id:'rich',rating:5}],knowledge:[]};
 const state=nextState(emptyState(),plan('pizzaria'));
 const found=searchStores(db,state,null,{limit:10});
 assert.deepEqual(found.map(r=>r.store.id),['rich','basic']);
 assert.ok(found[0].rankScore>found[1].rankScore);
});

test('filtros explícitos continuam valendo mesmo com score alto',()=>{
 const sponsored=shop('sponsored','Comida','Pizzaria',{sponsored:true,delivery:false});
 const normal=shop('normal','Comida','Pizzaria',{delivery:true});
 const state=nextState(emptyState(),plan('pizzaria com entrega'));
 const matches=searchStores({stores:[sponsored,normal],products:[],hours:[],reviews:[],knowledge:[]},state);
 assert.deepEqual(matches.map(x=>x.store.id),['normal']);
});
