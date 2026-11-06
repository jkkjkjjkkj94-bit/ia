// Testes de regressão do ranking GURU (Node.js >= 18).
// Executar: node --test tests/guru-ranking.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {contextualRank} from '../guru-intelligence-v14.mjs';
import {rankV9} from '../guru-ranking-v9.mjs';
import {rerankSearchResults} from '../guru-search-v7.mjs';
import {searchStores} from '../guru-engine-v4-core.mjs';

const store=(id,name,category='Pizzaria')=>({
 id,name,category,group:category,groups:[],specialties:[],description:'',
 active:true,status:'active',delivery:true,pickup:true
});
const row=(id,name,rankScore,category='Pizzaria',rest={})=>({
 store:store(id,name,category),products:[],rankScore,score:40,reason:[],...rest
});
const pipeline=(rows,query,sort=null)=>
 contextualRank(
  rankV9(
   rerankSearchResults(rows,query,{stores:rows.map(r=>r.store)},sort),
   query,sort
  ),
  query,sort
 );

test('qualidade cadastral prevalece sobre relevância na ordenação padrão',()=>{
 const rows=[row('a','Pizza Central',60),row('b','Loja Central',95,'Loja')];
 assert.deepEqual(pipeline(rows,'pizza').map(r=>r.store.id),['b','a']);
});

test('relevância contextual desempata notas cadastrais iguais',()=>{
 const rows=[row('a','Loja Genérica',85,'Loja'),row('b','Pizza Central',85)];
 assert.deepEqual(pipeline(rows,'pizza').map(r=>r.store.id),['b','a']);
});

test('ordenação por preço, distância e avaliação não é alterada pelo pipeline',()=>{
 const rows=[row('a','Pizza Central',40),row('b','Loja Central',95,'Loja')];
 for(const sort of ['price','distance','rating']){
  assert.deepEqual(pipeline(rows,'pizza',sort).map(r=>r.store.id),['a','b']);
 }
});

test('etapas intermediárias apenas acrescentam evidência e aprendizado',()=>{
 const rows=[row('a','Pizza Central',20),row('b','Loja Central',95,'Loja')];
 const evidence=rerankSearchResults(rows,'pizza');
 assert.deepEqual(evidence.map(r=>r.store.id),['a','b']);
 assert.ok(evidence.every(r=>r.relevanceEvidence));
 const learned=rankV9(evidence,'pizza');
 assert.deepEqual(learned.map(r=>r.store.id),['a','b']);
 assert.ok(learned.every(r=>typeof r.contextScore==='number'));
});

test('não reintroduz lojas inativas nem elimina filtros obrigatórios',()=>{
 const active=store('a','Pizzaria Ativa');
 const inactive={...store('b','Pizzaria Inativa'),active:false};
 const noDelivery={...store('c','Pizzaria sem entrega'),delivery:false};
 const data={stores:[active,inactive,noDelivery],products:[],hours:[],reviews:[],knowledge:[]};
 const results=searchStores(data,{query:'pizzaria',filters:{delivery:true}},null,{limit:20});
 assert.deepEqual(results.map(r=>r.store.id),['a']);
});

test('buscas vazias não geram resultados inventados',()=>{
 assert.deepEqual(pipeline([],'pizza'),[]);
 assert.deepEqual(searchStores({stores:[],products:[]},{query:'pizza'},null,{limit:20}),[]);
});
