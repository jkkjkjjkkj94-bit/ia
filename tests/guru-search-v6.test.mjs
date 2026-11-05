import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {catalogVocabulary,repairFromCatalog,semanticAlternative,searchAlternatives,preserveMandatoryFilters} from '../guru-search-v6.mjs';
import {emptyState,interpret,nextState,searchStores} from '../guru-engine-v4-core.mjs';
const read=path=>readFileSync(fileURLToPath(new URL('../'+path,import.meta.url)),'utf8');
const taxonomy={Comida:{Cafeteria:['café','cafe']},Moda:{Camisetas:['camisetas']}};
const data={
 stores:[
  {id:'s1',name:'Café da Praça',category:'Comida',group:'Cafeteria',active:true,status:'active',delivery:false,address:'Centro',description:'Café e bebidas quentes'},
  {id:'s2',name:'Loja de Camisetas',category:'Moda',group:'Camisetas',active:true,status:'active',delivery:true,address:'Centro',description:'Moda casual'}
 ],
 products:[
  {id:'p1',store_id:'s2',name:'Camiseta básica azul',description:'Malha confortável',active:true,show_in_ai:true,stock:4,price:75},
  {id:'p2',store_id:'s2',name:'Camiseta de luxo',description:'Tecido fino',active:true,show_in_ai:true,stock:8,price:450},
  {id:'p3',store_id:'s2',name:'Camiseta esgotada',active:true,show_in_ai:true,stock:0,price:30}
 ],
 hours:[],reviews:[],knowledge:[]
};
test('sinônimos são ancorados no banco interno e não em fontes externas',()=>{
 const vocab=catalogVocabulary(data,taxonomy,{});
 assert.ok(vocab.has('cafe'));
 assert.ok(vocab.has('camiseta'));
 const synonym=semanticAlternative('Quero um cafezinho',vocab);
 assert.match(synonym.query,/cafe/);
 assert.deepEqual(semanticAlternative('Quero drone',vocab).changes,[]);
 assert.ok(searchAlternatives('cafezinho',data,taxonomy).length>0);
 const module=read('guru-search-v6.mjs');
 assert.doesNotMatch(module,/fetch\s*\(|supabase\.co|http:\/\/|https:\/\//i);
});
test('erros de digitação são corrigidos somente com vocabulário cadastrado',()=>{
 const lex=catalogVocabulary(data,taxonomy,{});
 assert.equal(repairFromCatalog('camizeta',lex).query,'camiseta');
 assert.equal(repairFromCatalog('cafee',lex).query,'cafe');
 assert.equal(repairFromCatalog('xxxyyyzz',lex).changes.length,0);
 assert.equal(repairFromCatalog('300 reais',lex).changes.length,0);
});
test('busca literal tem precedência e alternativa só tenta depois de zero resultados',()=>{
 const ui=read('guru-engine-v4.js');
 assert.match(ui,/rows=searchStores\(db,draft,position,\{limit:60\}\)/);
 assert.match(ui,/if\(!rows.length\)\{\s*for\(const alt of \[\.\.\.guidedSearchAlternatives/);
 assert.doesNotMatch(ui,/approvedSourceProducts|guru-approved-products|displayWebProducts/);
});
test('uma frase com typo recupera produto apenas com estoque e preço compatíveis',()=>{
 const original='Quero uma camizeta até R$ 100';
 const first=interpret(original,taxonomy,{},emptyState(),{products:data.products});
 const before=nextState(emptyState(),first);
 assert.equal(searchStores(data,before).length,0);
 let recovered=[];
 for(const alt of searchAlternatives(original,data,taxonomy,{})){
  const plan=interpret(alt.query,taxonomy,{},emptyState(),{products:data.products});
  if(plan.kind!=='search')continue;
  const candidate=preserveMandatoryFilters(before,nextState(emptyState(),plan));
  recovered=searchStores(data,candidate);
  if(recovered.length)break;
 }
 assert.equal(recovered.length,1);
 assert.equal(recovered[0].store.id,'s2');
 assert.deepEqual(recovered[0].products.map(p=>p.id),['p1']);
});
test('nenhuma alternativa elimina filtros de preço, entrega, cor ou exclusão',()=>{
 const original={
  filters:{maxPrice:100,delivery:false,color:'preto',quantity:2,payment:'pix'},
  excludedGroups:['sushi'],excludedTerms:['azul'],excludedCategories:['Tecnologia'],
  location:{city:'Sorocaba'}
 };
 const modified=preserveMandatoryFilters(original,{filters:{delivery:true,maxPrice:999},excludedGroups:[],location:{city:'São Paulo'}});
 assert.equal(modified.filters.delivery,false);
 assert.equal(modified.filters.maxPrice,100);
 assert.equal(modified.filters.color,'preto');
 assert.equal(modified.filters.quantity,2);
 assert.equal(modified.filters.payment,'pix');
 assert.equal(modified.location.city,'Sorocaba');
 assert.ok(modified.excludedGroups.includes('sushi'));
 assert.ok(modified.excludedCategories.includes('Tecnologia'));
 assert.ok(modified.excludedTerms.includes('azul'));
});
test('a busca nunca retorna produtos fora do estoque, mesmo após correção',()=>{
 const state={...emptyState(),productTerm:'camiseta',filters:{maxPrice:100,delivery:true}};
 const found=searchStores(data,state);
 assert.equal(found.length,1);
 assert.deepEqual(found[0].products.map(p=>p.id),['p1']);
 const noStock=searchStores({...data,products:data.products.map(p=>({...p,stock:0}))},state);
 assert.equal(noStock.length,0);
 const noDelivery=searchStores({...data,stores:data.stores.map(s=>({...s,delivery:false}))},state);
 assert.equal(noDelivery.length,0);
});
test('cem variações de perguntas conservam a lógica de filtros na recuperação',()=>{
 const subjects=['cafezinho','camizeta','cafee','farmasia','caminhar','sorvetes','hamburgueres','notebooks','drogaria','camisetas'];
 const starts=['quero','procuro','por favor encontre','poderia achar','preciso de','onde tem','me indique','busque','gostaria de','encontre'];
 let checked=0;
 for(const subject of subjects)for(const start of starts){
  const q=start+' '+subject+' até R$ 100';
  const candidates=searchAlternatives(q,data,taxonomy,{});
  assert.ok(candidates.length<=3);
  const source={filters:{maxPrice:100,delivery:false}};
  for(const attempt of candidates){
   const keep=preserveMandatoryFilters(source,{filters:{maxPrice:200,delivery:true}});
   assert.equal(keep.filters.maxPrice,100);
   assert.equal(keep.filters.delivery,false);
   assert.ok(attempt.query.length>0);
  }
  checked++;
 }
 assert.equal(checked,100);
});
