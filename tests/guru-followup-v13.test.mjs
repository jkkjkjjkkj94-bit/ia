import test from 'node:test';
import assert from 'node:assert/strict';
import {followupRefinement} from '../guru-followup-v13.mjs';
import {interpret,emptyState,nextState,searchStores} from '../guru-engine-v4-core.mjs';
const taxonomy={Serviços:{Barbearia:[]}};
const data={stores:[
 {id:1,name:'Barbearia Um',active:true,status:'active',category:'Serviços',group:'Barbearia',address:'Salto de Pirapora - SP',delivery:true,pickup:true},
 {id:2,name:'Barbearia Dois',active:true,status:'active',category:'Serviços',group:'Barbearia',address:'Salto de Pirapora - SP',delivery:false,pickup:false}
],products:[],hours:[],reviews:[]};
function setup(){
 const state=nextState(emptyState(),interpret('encontre barbearia',taxonomy,{}));
 state.location.city='Salto de Pirapora';
 state.lastResults=searchStores(data,state);
 return state;
}
test('busca anterior é mantida ao refinar com entrega',()=>{
 const previous=setup();
 const follow=followupRefinement('E só com entrega?',previous);
 assert.equal(follow?.query,'com entrega');
 const next=nextState(previous,interpret(follow.query,taxonomy,{}));
 assert.equal(next.group,'Barbearia');
 assert.equal(next.filters.delivery,true);
 assert.deepEqual(searchStores(data,next).map(row=>row.store.id),[1]);
});
test('pedidos sucessivos preservam filtros cumulativos',()=>{
 let state=setup();
 state=nextState(state,interpret(followupRefinement('Só com entrega',state).query,taxonomy,{}));
 state.lastResults=searchStores(data,state);
 const follow=followupRefinement('E com retirada',state);
 assert.equal(follow?.query,'com retirada');
 const next=nextState(state,interpret(follow.query,taxonomy,{}));
 assert.equal(next.filters.delivery,true);
 assert.equal(next.filters.pickup,true);
});
test('entende pedido combinado de entrega e horário',()=>{
 const state=setup();
 const follow=followupRefinement('E apenas com entrega e abertas agora',state);
 assert.equal(follow?.query,'com entrega e abertas agora');
 const next=nextState(state,interpret(follow.query,taxonomy,{}));
 assert.equal(next.filters.delivery,true);
 assert.equal(next.filters.openNow,true);
});
test('não altera perguntas sobre lojas, assuntos novos ou buscas sem histórico',()=>{
 const state=setup();
 assert.equal(followupRefinement('Ela entrega?',state),null);
 assert.equal(followupRefinement('Encontre uma pizzaria',state),null);
 assert.equal(followupRefinement('Quero uma loja de roupas',state),null);
 assert.equal(followupRefinement('E só com entrega?',emptyState()),null);
});
test('negação de entrega é preservada',()=>{
 const state=setup();
 const follow=followupRefinement('E sem entrega',state);
 assert.equal(follow?.query,'sem entrega');
 const next=nextState(state,interpret(follow.query,taxonomy,{}));
 assert.equal(next.filters.delivery,false);
});
