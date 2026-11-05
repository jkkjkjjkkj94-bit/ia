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
