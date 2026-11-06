// GURU 5.3 — testes de transparência de dados cadastrados.
import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceForStore,evidenceForField} from '../guru-evidence-v1.mjs';

const store={id:'1',name:'Loja A',active:true,status:'active',delivery:true,payment_methods:['Pix']};
test('dado declarado de entrega não é apresentado como disponibilidade em tempo real',()=>{
 const answer=evidenceForField('delivery',store);
 assert.match(answer,/Segundo as informações cadastradas/);
 assert.match(answer,/Confirme/);
});
test('loja sem entrega não recebe afirmação positiva',()=>{
 assert.match(evidenceForField('delivery',{delivery:false}),/não está cadastrada/);
});
test('pagamentos são informação cadastrada, sujeitos a confirmação',()=>{
 const answer=evidenceForField('payment',store);
 assert.match(answer,/Pix/);
 assert.match(answer,/Confirme/);
});
test('pagamentos ausentes são tratados como não informados',()=>{
 assert.match(evidenceForField('payment',{}),/não foram informadas/);
});
test('produto cadastrado não vira estoque garantido',()=>{
 const statements=evidenceForStore({store,products:[{name:'Item'}],distance:3,reviewCount:2});
 assert.ok(statements.some(x=>x.includes('disponibilidade pode mudar')));
 assert.ok(statements.some(x=>x.includes('linha reta')));
 assert.ok(statements.some(x=>x.includes('registradas na GURU')));
});
test('não confundir ausência de produto com falha ao consultar catálogo',()=>{
 const empty=evidenceForStore({store,products:[]});
 const unavailable=evidenceForStore({store,products:[]},{productsUnavailable:true});
 assert.ok(empty.some(x=>x.includes('não confirmou um produto')));
 assert.ok(unavailable.some(x=>x.includes('Não foi possível consultar')));
});
