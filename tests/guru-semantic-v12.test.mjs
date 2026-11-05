import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticNeedAlternatives} from '../guru-semantic-v12.mjs';
const data={stores:[{id:1,active:true,status:'active',category:'Serviços',group:'Barbearia'},{id:2,active:true,status:'active',category:'Serviços',group:'Assistência Técnica'},{id:3,active:true,status:'active',category:'Serviços',group:'Borracharia'}]};
test('entende necessidade indireta sem verbo de busca',()=>{
 assert.equal(semanticNeedAlternatives('Meu pneu furou',data)[0]?.query,'borracharia');
 assert.equal(semanticNeedAlternatives('Preciso fazer a barba',data)[0]?.query,'preciso barbearia');
});
test('preserva qualificadores sem inventar estabelecimentos',()=>{
 assert.equal(semanticNeedAlternatives('Quero arrumar meu notebook hoje',data)[0]?.query,'quero assistencia tecnica hoje');
 assert.deepEqual(semanticNeedAlternatives('Quero fazer as unhas',data),[]);
});
test('não utiliza estabelecimentos desativados',()=>{
 const off={stores:[{active:false,status:'active',group:'Barbearia'}]};
 assert.deepEqual(semanticNeedAlternatives('Preciso fazer a barba',off),[]);
});
test('não interpreta negações como solicitação positiva',()=>{
 assert.deepEqual(semanticNeedAlternatives('Não quero fazer a barba',data),[]);
 assert.deepEqual(semanticNeedAlternatives('Sem consertar meu notebook',data),[]);
});
test('não altera consultas que não descrevem necessidade conhecida',()=>{
 assert.deepEqual(semanticNeedAlternatives('Qual a previsão do tempo?',data),[]);
});

test('necessidade complexa usa apenas categorias cadastradas',()=>{
 const extended={stores:[...data.stores,{id:4,active:true,status:'active',group:'Pizzaria',category:'Comida'}]};
 assert.equal(semanticNeedAlternatives('Estou com vontade de pizza',extended)[0]?.query,'pizzaria');
 assert.equal(semanticNeedAlternatives('Preciso trocar a bateria do celular',extended)[0]?.query,'preciso assistencia tecnica');
 assert.deepEqual(semanticNeedAlternatives('Estou com vontade de pizza',data),[]);
});
