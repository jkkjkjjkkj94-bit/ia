import test from 'node:test';
import assert from 'node:assert/strict';
import {validatedAliases,sharedAlternatives} from '../guru-context-v10.mjs';

const data={
 stores:[
  {id:'1',name:'Pizzaria Central',category:'Comida',group:'Pizzaria',active:true,status:'active'},
  {id:'2',name:'Loja Inativa',category:'Tecnologia',group:'Celulares',active:false,status:'inactive'}
 ],products:[]};
const aliases=[
 {phrase:'pizza',replacement:'pizzaria',active:true},
 {phrase:'smartphone',replacement:'celulares',active:true},
 {phrase:'pizzas',replacement:'pizzaria',active:false},
 {phrase:'qualquer coisa',replacement:'produto inventado',active:true}
];
test('vocabulário compartilhado usa somente conceitos do catálogo ativo',()=>{
 assert.deepEqual(validatedAliases(aliases,data),[{phrase:'pizza',replacement:'pizzaria'}]);
});
test('equivalências funcionam com verbos diferentes',()=>{
 assert.equal(sharedAlternatives('por favor encontre pizza',aliases,data)[0].query,'por favor encontre pizzaria');
 assert.equal(sharedAlternatives('gostaria de uma pizza',aliases,data)[0].query,'gostaria de uma pizzaria');
});
test('não transforma negação direta em busca positiva',()=>{
 assert.deepEqual(sharedAlternatives('sem pizza',aliases,data),[]);
});
test('não inventa categoria não cadastrada',()=>{
 assert.deepEqual(sharedAlternatives('quero smartphone',aliases,data),[]);
});
test('não altera frase quando nenhuma equivalência aprovada existe',()=>{
 assert.deepEqual(sharedAlternatives('procuro um notebook',aliases,data),[]);
});
