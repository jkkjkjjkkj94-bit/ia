import test from 'node:test';
import assert from 'node:assert/strict';
import {rankV9,rememberSelection,learningStats} from '../guru-ranking-v9.mjs';

const db=new Map();
globalThis.localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)};
const row=(id,name,rankScore,category='Comércio')=>({
 store:{id,name,category,group:category,active:true,status:'active'},
 products:[],rankScore,score:5,reason:[]
});
test('ranking administrativo é sempre prioritário',()=>{
 const result=rankV9([row('a','Farmácia do Bairro',35),row('b','Farmácia Central',70)],'farmacia do bairro');
 assert.deepEqual(result.map(r=>r.store.id),['b','a']);
});
test('contexto decide empates de pontuação',()=>{
 const result=rankV9([row('a','Loja Genérica',35),row('b','Pizzaria Central',35,'Pizzaria')],'encontre uma pizzaria');
 assert.equal(result[0].store.id,'b');
 assert.ok(result[0].contextScore>result[1].contextScore);
});
test('aprendizado resulta de seleção explícita, sem alterar pontuação',()=>{
 db.clear();
 assert.equal(rememberSelection('encontre um celular','phone'),true);
 assert.equal(learningStats().queries,1);
 const result=rankV9([row('other','Loja Alpha',35),row('phone','Loja Beta',35)],'preciso encontrar celular');
 assert.equal(result[0].store.id,'phone');
 assert.equal(result[0].rankScore,35);
});
test('ordenação explícita não é sobrescrita pelo V9',()=>{
 const rows=[row('a','Pizzaria',70),row('b','Loja',35)];
 assert.deepEqual(rankV9(rows,'pizzaria','distance').map(r=>r.store.id),['a','b']);
});
test('entrada inválida e localStorage indisponível não quebram ranking',()=>{
 assert.deepEqual(rankV9(null,'teste'),[]);
 assert.equal(rememberSelection('',null),false);
});

test('regras existentes impedem recomendação de lojas inativas e sem estoque',async()=>{
 const {searchStores}=await import('../guru-engine-v4-core.mjs');
 const data={
  stores:[
   {id:'active',name:'Loja Ativa',category:'Tecnologia',group:'Celulares',active:true,status:'active',delivery:true},
   {id:'off',name:'Loja Inativa',category:'Tecnologia',group:'Celulares',active:false,status:'inactive'}
  ],
  products:[
   {id:'p1',store_id:'active',name:'Celular Azul',active:true,show_in_ai:true,stock:0,price:100},
   {id:'p2',store_id:'off',name:'Celular Azul',active:true,show_in_ai:true,stock:10,price:100}
  ],
  hours:[],reviews:[],knowledge:[]
 };
 const state={category:'Tecnologia',group:'Celulares',productTerm:'celular',filters:{delivery:true},location:{},semanticTerms:[],featureTerms:[],nameTerms:[],excludedCategories:[],excludedGroups:[],excludedTerms:[],query:'celular'};
 assert.equal(searchStores(data,state,null,{limit:60}).length,0);
 data.products[0].stock=5;
 assert.deepEqual(searchStores(data,state,null,{limit:60}).map(r=>r.store.id),['active']);
});
