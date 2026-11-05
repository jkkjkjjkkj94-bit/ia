import {createShoppingPlan,normalizeBudget,shoppingPlanTotals,updateShoppingItem,addShoppingItem,removeShoppingItem,planAsText} from './guru-planner-v2.mjs?v=2';
import {describeNeed} from './guru-needs-v1.mjs?v=1';
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node};
const money=value=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function mountBudgetPrompt(host,need,onChoose){
 const info=describeNeed(need);if(!info)return;
 const card=el('section','guru-need-card guru-plan-budget-step');
 card.append(el('div','guru-need-eyebrow','GURU · PLANEJAR 2.0'),el('h3','guru-need-heading','Defina seu orçamento'),el('p','guru-need-description','Você tem um valor máximo para essa compra? Pode continuar sem um orçamento.'));
 const buttons=el('div','guru-need-options');
 for(const [label,value] of [['Sem orçamento',null],['Até R$ 300',300],['Até R$ 600',600],['Até R$ 1.000',1000]]){
  const btn=el('button','guru-next-button guru-need-choice',label);btn.type='button';btn.onclick=()=>{card.querySelectorAll('button').forEach(b=>b.disabled=true);onChoose(value)};buttons.append(btn);
 }
 card.append(buttons);
 const custom=el('form','guru-plan-custom-budget');
 const amount=el('input','guru-plan-field');amount.type='number';amount.min='1';amount.max='10000000';amount.step='.01';amount.placeholder='Outro valor em reais';amount.setAttribute('aria-label','Orçamento em reais');
 const confirm=el('button','guru-need-primary','Continuar');confirm.type='submit';
 custom.onsubmit=event=>{event.preventDefault();const value=normalizeBudget(amount.value);if(value===null){amount.setCustomValidity('Informe um valor positivo.');amount.reportValidity();amount.setCustomValidity('');return}onChoose(value)};
 custom.append(amount,confirm);card.append(custom);host.append(card);
}
export function mountShoppingPlanner(host,need,getPlan,setPlan,onFindStores,onNotice){
 const info=describeNeed(need);if(!info)return;
 const card=el('section','guru-need-card guru-plan-editor');host.append(card);
 const update=plan=>{setPlan(plan);render()};
 const render=()=>{
  const plan=getPlan();if(!plan)return;
  const totals=shoppingPlanTotals(plan);
  card.replaceChildren();
  card.append(el('div','guru-need-eyebrow','GURU · PLANEJAR 2.0'),el('h3','guru-need-heading',info.title+(need.variant?' · '+need.variant:'')),el('p','guru-need-description','Edite sua lista. Informe valores apenas se souber — nenhum preço é estimado pela GURU.'));
  const summary=el('div','guru-plan-summary');
  for(const [label,value] of [['Orçamento',totals.budget===null?'Não definido':money(totals.budget)],['Subtotal informado',money(totals.knownTotal)]]){
   const infoBox=el('div','guru-plan-summary-item');infoBox.append(el('span','guru-plan-overline',label),el('strong','guru-plan-main-number',value));summary.append(infoBox);
  }
  card.append(summary);
  const progress=el('div','guru-plan-progress');progress.append(el('span','',totals.done+' de '+totals.total+' itens marcados'),el('span','',totals.priced+' com preço'));
  card.append(progress);
  if(totals.budget!==null){
   const balance=el('div','guru-plan-balance',totals.remaining>=0?'Saldo parcial: '+money(totals.remaining):'Subtotal acima do orçamento em '+money(-totals.remaining));
   if(totals.remaining<0)balance.classList.add('guru-plan-overbudget');
   card.append(balance);
  }
  const legend=el('div','guru-plan-column-labels','Item · Quantidade · Preço unitário');card.append(legend);
  const list=el('div','guru-plan-list');
  for(const item of plan.items){
   const row=el('div','guru-plan-row');
   const checkbox=el('input','guru-plan-check');checkbox.type='checkbox';checkbox.checked=!!item.done;
   checkbox.setAttribute('aria-label','Marcar '+item.name+' como comprado');checkbox.onchange=()=>update(updateShoppingItem(getPlan(),item.id,{done:checkbox.checked}));
   const name=el('input','guru-plan-name');name.type='text';name.maxLength=110;name.value=item.name;
   name.setAttribute('aria-label','Nome do produto');name.onchange=()=>update(updateShoppingItem(getPlan(),item.id,{name:name.value}));
   const quantity=el('input','guru-plan-quantity');quantity.type='number';quantity.min='1';quantity.max='9999';quantity.step='1';quantity.value=item.quantity;
   quantity.setAttribute('aria-label','Quantidade de '+item.name);quantity.onchange=()=>update(updateShoppingItem(getPlan(),item.id,{quantity:quantity.value}));
   const price=el('input','guru-plan-price');price.type='number';price.min='0';price.max='10000000';price.step='.01';price.value=item.price===null?'':item.price;price.placeholder='R$ / un.';
   price.setAttribute('aria-label','Preço unitário de '+item.name);price.onchange=()=>update(updateShoppingItem(getPlan(),item.id,{price:price.value}));
   const remove=el('button','guru-plan-remove','×');remove.type='button';remove.title='Remover item';remove.setAttribute('aria-label','Remover '+item.name);
   remove.onclick=()=>update(removeShoppingItem(getPlan(),item.id));
   if(item.done)row.classList.add('guru-plan-done');
   row.append(checkbox,name,quantity,price,remove);list.append(row);
  }
  card.append(list);
  const addForm=el('form','guru-plan-add');
  const input=el('input','guru-plan-field');input.type='text';input.maxLength=110;input.placeholder='Adicionar produto';input.setAttribute('aria-label','Adicionar produto à lista');
  const addButton=el('button','guru-next-button','Adicionar');addButton.type='submit';
  addForm.onsubmit=event=>{event.preventDefault();const old=getPlan(),next=addShoppingItem(old,input.value);if(old===next){onNotice('Informe um item válido (máximo de 40).');return}update(next)};
  addForm.append(input,addButton);card.append(addForm);
  const actions=el('div','guru-plan-actions');
  const budgetButton=el('button','guru-next-button','Alterar orçamento');budgetButton.type='button';
  budgetButton.onclick=()=>{
   const current=getPlan().budget;
   const response=window.prompt('Orçamento em reais (vazio para remover):',current===null?'':String(current));
   if(response===null)return;
   const amount=normalizeBudget(response);
   if(response.trim()&&amount===null){onNotice('Informe um orçamento válido.');return}
   update({...getPlan(),budget:amount,updatedAt:Date.now()});
  };
  const copy=el('button','guru-next-button','Copiar lista');copy.type='button';
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(planAsText(getPlan()));onNotice('Planejamento copiado.')}catch{onNotice('Não foi possível copiar automaticamente.')}};
  const find=el('button','guru-need-primary','Buscar lojas cadastradas');find.type='button';find.onclick=onFindStores;
  actions.append(budgetButton,copy,find);card.append(actions);
  card.append(el('p','guru-need-description guru-plan-note',totals.complete?'Preços informados manualmente. Confirme os valores com as lojas.':'Subtotal parcial: alguns itens não têm preço. Estoque, preços e disponibilidade precisam ser confirmados.'));
 };
 render();
}
