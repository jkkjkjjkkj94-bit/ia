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
