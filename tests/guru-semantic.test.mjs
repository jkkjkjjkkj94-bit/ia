// Testes de necessidades indiretas da GURU.
import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticNeedAlternatives} from '../guru-semantic-v12.mjs';

const store=(category,active=true)=>({category,group:category,active,status:'active'});
const data={stores:[
 store('Artigos para Festas'),store('Construção'),store('Pet Shop'),store('Mercado')
]};
const first=(query,db=data)=>semanticNeedAlternatives(query,db)[0]?.query||'';

test('organizar festa localiza categoria ativa de festas',()=>{
 assert.match(first('Vou organizar uma festa'),/artigos para festas/);
});
test('pintar e reformar ambiente associam construção',()=>{
 assert.match(first('Quero pintar minha casa'),/construcao/);
 assert.match(first('Preciso reformar meu quarto'),/construcao/);
});
test('pedido indireto para pet identifica pet shop sem alegar estoque',()=>{
 const matches=semanticNeedAlternatives('Preciso de algo para meu cachorro',data);
 assert.match(matches[0].query,/pet shop/);
 assert.ok(!JSON.stringify(matches).includes('estoque confirmado'));
});
test('necessidade de faxina encontra mercado cadastrado',()=>{
 assert.match(first('Vou fazer faxina na casa'),/mercado/);
});
test('negações impedem expansão positiva',()=>{
 assert.deepEqual(semanticNeedAlternatives('Não quero produtos para cachorro',data),[]);
});
test('categorias ausentes e lojas inativas não são inventadas',()=>{
 assert.deepEqual(semanticNeedAlternatives('Vou organizar uma festa',{stores:[store('Artigos para Festas',false)]}),[]);
 assert.deepEqual(semanticNeedAlternatives('Vou organizar uma festa',{stores:[]}),[]);
});
test('requisitos no texto permanecem na alternativa',()=>{
 const alt=first('Quero pintar minha casa com entrega');
 assert.match(alt,/com entrega/);
});
