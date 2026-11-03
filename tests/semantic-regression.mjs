import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

function loadBrowserModule(file) {
  const sandbox={
    window:{LocalAIEngine:{state:{}}},
    document:{getElementById:()=>null},
    console
  };
  const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  runInNewContext(source,sandbox,{filename:file,timeout:1000});
  return sandbox.window;
}

const semantics=loadBrowserModule('establishment-semantics.js').GuruEstablishmentSemantics;
const guard=loadBrowserModule('semantic-query-guard.js').LocalAISemanticGuard;

test('Loja e comércio continuam bloqueados quando combinados com alimentação',()=>{
  for(const q of ['loja de comida japonesa','comércio de comida japonesa','lojas de pizza']){
    assert.equal(semantics.hasRetailFoodConflict(q),true,q);
    assert.equal(semantics.inferCategory(q),null,q);
  }
});

test('Negócio é termo genérico, não uma loja de varejo',()=>{
  for(const q of ['negócio de comida japonesa','negocio de comida japonesa','negócios de comida japonesa']){
    assert.equal(semantics.hasRetailFoodConflict(q),false,q);
    assert.equal(semantics.inferCategory(q),'Comida',q);
    assert.equal(semantics.detectType(q),null,q);
    const normalized=guard.normalizeNaturalLanguage(q);
    assert.doesNotMatch(normalized,/\blojas?\b/i);
    const canonical=guard.rules.find(r=>r.re.test(guard.normalize(normalized)))?.canonical;
    assert.equal(canonical,'japonesa',q);
  }
});

test('Outros negócios mantêm categoria correta',()=>{
  assert.equal(semantics.inferCategory('negócio de roupas'),'Roupas');
  assert.equal(semantics.inferCategory('negócio de pizzaria'),'Comida');
  assert.equal(semantics.hasRetailFoodConflict('negócio de pizzaria'),false);
});
