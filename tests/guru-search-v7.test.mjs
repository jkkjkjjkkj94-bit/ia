import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {conceptAlternatives,guidedSearchAlternatives,evidenceForRow,rerankSearchResults,noResultGuidance} from '../guru-search-v7.mjs';
import {interpret,nextState,emptyState,searchStores} from '../guru-engine-v4-core.mjs';
import {preserveMandatoryFilters} from '../guru-search-v6.mjs';
const read=path=>readFileSync(fileURLToPath(new URL('../'+path,import.meta.url)),'utf8');
const taxonomy={Comida:{Cafeteria:['café'],Pizzaria:['pizza']},Moda:{Camisetas:['camiseta']},Saude:{Farmacia:['drogaria']}};
const data={
 stores:[
  {id:'cafe',name:'Café do Centro',category:'Comida',group:'Cafeteria',active:true,status:'active',description:'Café e bolos',delivery:false,address:'Centro'},
  {id:'pizza',name:'Pizzaria Central',category:'Comida',group:'Pizzaria',active:true,status:'active',description:'Pizza e refeições',delivery:true,address:'Centro'},
  {id:'moda',name:'Loja de Camisetas',category:'Moda',group:'Camisetas',active:true,status:'active',description:'Camisetas confortáveis',delivery:true,address:'Centro'},
  {id:'farm',name:'Farmácia Popular',category:'Saude',group:'Farmacia',active:false,status:'inactive',description:'Produtos de saúde'}
 ],
 products:[
  {id:'p1',store_id:'moda',name:'Camiseta de algodão',category:'Camiseta',description:'Confortável azul',stock:4,price:70,active:true,show_in_ai:true},
  {id:'p2',store_id:'moda',name:'Camiseta de luxo',category:'Camiseta',stock:2,price:300,active:true,show_in_ai:true},
  {id:'p3',store_id:'moda',name:'Camiseta esgotada',stock:0,price:30,active:true,show_in_ai:true}
 ],
 hours:[],reviews:[],knowledge:[]
};
test('V7 reconhece necessidades em frases sem inventar estabelecimento ou produto',()=>{
 const coffee=conceptAlternatives('Gostaria de tomar um café',data,taxonomy);
 assert.ok(coffee.some(x=>/cafeteria/.test(x.query)));
 const pizza=conceptAlternatives('Quero comer uma pizza',data,taxonomy);
 assert.ok(pizza.some(x=>/pizzaria/.test(x.query)));
 assert.deepEqual(conceptAlternatives('Quero remédios',data,{}),[]);
 assert.deepEqual(conceptAlternatives('Busque uma loja de brinquedos',data,taxonomy),[]);
});
test('V7 mantém o texto e os limites da consulta nas alternativas',()=>{
 const alternatives=guidedSearchAlternatives('Quero comer uma pizza até R$ 45 com entrega',data,taxonomy,{});
 assert.ok(alternatives.length>0);
 assert.ok(alternatives.some(x=>x.mode==='concept'));
 assert.ok(alternatives.every(x=>/45/.test(x.query)));
 assert.ok(alternatives.every(x=>/entrega/.test(x.query)));
 assert.ok(alternatives.length<=5);
});
test('V7 registra evidência somente do produto elegível mostrado',()=>{
 const row={store:data.stores[2],products:[data.products[0]],rankScore:75,reason:['categoria Moda']};
 const value=evidenceForRow('Camiseta confortável',row,data);
 assert.ok(value.matched>0);
 assert.ok(value.relevance>=5);
 assert.ok(value.reasons.some(x=>x.includes('produto disponível')));
 const missing=evidenceForRow('esgotada',row,data);
 assert.equal(missing.matched,0);
});
test('V7 não altera ranking de classificação nem ordenação explícita',()=>{
 const a={store:data.stores[0],products:[],rankScore:90,reason:[]};
 const b={store:data.stores[2],products:[data.products[0]],rankScore:85,reason:[]};
 const ranked=rerankSearchResults([a,b],'camiseta',data);
 assert.equal(ranked[0].store.id,'cafe');
 const tied=rerankSearchResults([{...a,rankScore:85},b],'camiseta',data);
 assert.equal(tied[0].store.id,'moda');
 const explicitlySorted=rerankSearchResults([{...a,rankScore:85},b],'camiseta',data,'distance');
 assert.equal(explicitlySorted[0].store.id,'cafe');
 assert.deepEqual(a.reason,[]);
});
test('V7 oferece alternativas apenas a partir de dados internos',()=>{
 const g=noResultGuidance('cafezinho',data,taxonomy,{});
 assert.ok(g.message.includes('catálogo interno'));
 assert.ok(g.suggestions.length<=3);
 assert.ok(g.suggestions.every(x=>!/^https?:/.test(x)));
 const empty=noResultGuidance('blusa',{stores:[],products:[]},taxonomy,{});
 assert.deepEqual(empty.suggestions,[]);
 const source=read('guru-search-v7.mjs');
 assert.doesNotMatch(source,/fetch\s*\(|https:\/\/|supabase\.co|window\.|document\./);
});
test('V7 preserva disponibilidade e filtros durante consultas complexas',()=>{
 const question='Quero uma camizeta até R$ 100 com entrega';
 const plan=interpret(question,taxonomy,{},emptyState(),{products:data.products});
 const original=nextState(emptyState(),plan);
 const literal=searchStores(data,original);
 assert.ok(Array.isArray(literal));
 let found=[];
 for(const alt of guidedSearchAlternatives(question,data,taxonomy,{})){
  const candidate=interpret(alt.query,taxonomy,{},emptyState(),{products:data.products});
  if(candidate.kind!=='search')continue;
  const state=preserveMandatoryFilters(original,nextState(emptyState(),candidate));
  found=searchStores(data,state);
  if(found.length)break;
 }
 assert.equal(found.length,1);
 assert.equal(found[0].store.id,'moda');
 assert.deepEqual(found[0].products.map(p=>p.id),['p1']);
});
test('V7 separa filtros explícitos e recusa resultados sem estoque',()=>{
 const state={...emptyState(),category:'Moda',group:'Camisetas',productTerm:'camiseta',filters:{maxPrice:20,delivery:true}};
 assert.equal(searchStores(data,state).length,0);
 const missing={...data,products:data.products.map(p=>({...p,stock:0}))};
 assert.equal(searchStores(missing,{...state,filters:{maxPrice:100}}).length,0);
});
test('V7 preserva apenas o catálogo interno e a seleção de resultado',()=>{
 const ui=read('guru-engine-v4.js');
 assert.match(ui,/guidedSearchAlternatives\(text,db,taxonomy,aliases\)/);
 assert.match(ui,/rerankSearchResults\(rows,text,db,state\.filters\?\.sort\)/);
 assert.match(ui,/noResultGuidance\(text,db,taxonomy,aliases\)/);
 assert.match(ui,/if\(!rows.length\)\{\s*for\(const alt of guidedSearchAlternatives/);
 assert.doesNotMatch(ui,/approvedSourceProducts|displayWebProducts|guru-approved-sources/);
});
test('V7 testa 100 maneiras de solicitar o mesmo serviço sem resultados inventados',()=>{
 const verbs=['quero','procuro','gostaria de','por favor, encontre','preciso de','busque',
 'me indique','poderia procurar','onde encontro','existe'];
 const subjects=['tomar um café','comer uma pizza','comprar medicamentos','comprar roupas','cortar cabelo',
 'encontrar livros','comprar um celular','tomar um cafezinho','um lanche','um hambúrguer'];
 let count=0;
 for(const verb of verbs)for(const subject of subjects){
  const query=verb+' '+subject;
  const candidates=guidedSearchAlternatives(query,data,taxonomy,{});
  assert.ok(candidates.length<=5);
  assert.ok(candidates.every(x=>x.query&&!x.query.includes('http')));
  count++;
 }
 assert.equal(count,100);
});
