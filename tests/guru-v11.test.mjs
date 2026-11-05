import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedAnswerFor,patternKey} from '../guru-knowledge-v11.mjs';

test('apenas conhecimento revisado e ativo pode responder',()=>{
 const rows=[
  {id:'off',question:'Onde fica a loja?',answer:'Resposta antiga',active:false},
  {id:'ok',question:'Como funciona o programa?',variations:['Explique o programa'],answer:'Informação aprovada.',active:true}
 ];
 assert.equal(approvedAnswerFor('explique o programa',rows)?.id,'ok');
 assert.equal(approvedAnswerFor('onde fica a loja?',rows),null);
});
test('busca exata impede respostas a perguntas similares porém diferentes',()=>{
 const rows=[{id:'ok',question:'Tem entrega?',answer:'Sim.',active:true}];
 assert.equal(approvedAnswerFor('Tem entrega gratuita?',rows),null);
 assert.equal(approvedAnswerFor('Tem entrega?',rows)?.answer,'Sim.');
});
test('perguntas com expressões diferentes formam um mesmo padrão',()=>{
 assert.equal(patternKey('Por favor, encontre uma pizzaria'),patternKey('Quero encontrar pizzaria'));
});
test('perguntas semanticamente diferentes permanecem separadas',()=>{
 assert.notEqual(patternKey('pizzaria entrega'),patternKey('pizzaria retirada'));
});
test('conteúdos inválidos são ignorados com segurança',()=>{
 assert.equal(approvedAnswerFor('',[]),null);
 assert.equal(approvedAnswerFor('teste',[{question:'teste',answer:'',active:true}]),null);
 assert.equal(patternKey(''), '');
});

test('resposta geral não intercepta perguntas direcionadas a lojas',()=>{
 const rows=[
  {id:'delivery',question:'Tem entrega?',answer:'Texto genérico não confiável',context_type:'delivery',active:true},
  {id:'general',question:'Como funciona a GURU?',answer:'Resposta geral revisada',context_type:'general',active:true}
 ];
 assert.equal(approvedAnswerFor('Tem entrega?',rows),null);
 assert.equal(approvedAnswerFor('Como funciona a GURU?',rows)?.id,'general');
});
test('tipo aprovado direciona resposta para fonte estruturada da loja',async()=>{
 const {approvedStoreContextFor}=await import('../guru-knowledge-v11.mjs');
 const rows=[
  {id:'h',question:'Qual o horário?',answer:'Não deve usar texto estático',context_type:'hours',active:true},
  {id:'d',question:'Tem entrega?',answer:'Não deve usar texto estático',context_type:'delivery',active:true},
  {id:'p',question:'Quais produtos?',answer:'Não deve usar texto estático',context_type:'product',active:true},
  {id:'g',question:'Qual o CEP?',answer:'Resposta geral',context_type:'general',active:true}
 ];
 assert.equal(approvedStoreContextFor('Qual o horário?',rows)?.ask,'hours');
 assert.equal(approvedStoreContextFor('Tem entrega?',rows)?.ask,'delivery');
 assert.equal(approvedStoreContextFor('Quais produtos?',rows)?.ask,'products');
 assert.equal(approvedStoreContextFor('Qual o CEP?',rows),null);
});
test('contexto direcionado requer correspondência exata e registro ativo',async()=>{
 const {approvedStoreContextFor}=await import('../guru-knowledge-v11.mjs');
 const rows=[{id:'x',question:'Tem entrega?',answer:'Sim',context_type:'delivery',active:false}];
 assert.equal(approvedStoreContextFor('Tem entrega?',rows),null);
 rows[0].active=true;
 assert.equal(approvedStoreContextFor('Tem entrega grátis?',rows),null);
});
