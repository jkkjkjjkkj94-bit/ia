import assert from 'node:assert/strict';
import { interpret } from '../guru-engine-v4-core.mjs';
const taxonomy={Alimentacao:{Pizzaria:['pizza']}};
function filters(query,prev={}) {
  const result=interpret(query,taxonomy,{}, {filters:prev}, {today:1});
  return result.filters ?? result.state?.filters ?? result;
}
// Regression smoke test: inspect interpreted output and ensure no unexpected throws.
for(const query of ['pizzaria no fim de semana','pizzaria no sabado','pizzaria aberta agora','pizzaria com entrega']) {
  assert.ok(interpret(query,taxonomy,{}, {}, {today:1}),query);
}
console.log('GOOY interpretation smoke tests passed');
