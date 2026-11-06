// Regressão de continuidade conversacional da GURU.
// Executar: node --test tests/guru-context.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {contextualIntent} from '../guru-conversation-v5.mjs';
import {interpret} from '../guru-engine-v4-core.mjs';

const state={
 lastResults:[
  {store:{id:'a',name:'Pizzaria Alfa',category:'Comida',group:'Pizzaria'},minPrice:40},
  {store:{id:'b',name:'Pizzaria Beta',category:'Comida',group:'Pizzaria'},minPrice:25}
 ],
 selectedStore:null
};
for(const query of ['Tem alguma mais barata?','E uma mais barata?','Mais barata']){
 test('continuidade de preço: '+query,()=>{
  assert.deepEqual(contextualIntent(query,state),{kind:'sortPrevious',attribute:'price'});
 });
}
test('continuidade de distância mantém a lista de referência',()=>{
 assert.deepEqual(contextualIntent('E mais perto?',state),{kind:'sortPrevious',attribute:'distance'});
});
test('entrega é filtrada na lista anterior',()=>{
 assert.deepEqual(contextualIntent('Qual dessas tem entrega?',state),{kind:'filterPrevious',attribute:'delivery'});
});
test('referência ordinal pertence ao seletor, não ao filtro de lista',()=>{
 assert.equal(contextualIntent('A segunda entrega?',state),null);
 const selection=interpret('A segunda entrega?',{}, {},state);
 assert.equal(selection.kind,'select');
 assert.equal(selection.index,1);
 assert.equal(selection.ask,'delivery');
});
test('comparação usa as posições indicadas na lista',()=>{
 assert.deepEqual(contextualIntent('Compare a primeira e a segunda',state),{kind:'compare',indices:[0,1]});
});
test('nova consulta não é confundida com refinamento',()=>{
 assert.equal(contextualIntent('Quero outra pizzaria',state),null);
});
test('sem resultados anteriores não há continuação inventada',()=>{
 assert.equal(contextualIntent('Tem alguma mais barata?',{lastResults:[]}),null);
});
