// GURU Planejar 2.0 — estado e contas locais, sem valores inventados.
import {describeNeed} from './guru-needs-v1.mjs?v=1';
const MAX_ITEMS=40;
export function normalizeBudget(raw){
 if(raw===null||raw===undefined||raw==='')return null;
 const value=Number(String(raw).replace(/\s/g,'').replace(',','.'));
 return Number.isFinite(value)&&value>0&&value<=10000000?Math.round(value*100)/100:null;
}
export function createShoppingPlan(need,budget=null){
 const info=describeNeed(need);
 if(!info)return null;
 return {
  version:2,
  need:{key:need.key,variant:need.variant||null},
  budget:normalizeBudget(budget),
  items:info.items.slice(0,MAX_ITEMS).map((name,i)=>({id:'i'+i,name,quantity:1,price:null,done:false})),
  updatedAt:Date.now()
 };
}
export function shoppingPlanTotals(plan){
 const rows=Array.isArray(plan?.items)?plan.items:[];
 let knownTotal=0,priced=0,done=0;
 for(const item of rows){
  if(item.done)done++;
  if(item.price!==null&&item.price!==undefined&&Number.isFinite(Number(item.price))&&Number(item.price)>=0){
   knownTotal+=Number(item.price)*(Number(item.quantity)||1);priced++;
  }
 }
 knownTotal=Math.round(knownTotal*100)/100;
 const budget=normalizeBudget(plan?.budget);
 return {knownTotal,priced,total:rows.length,done,budget,remaining:budget===null?null:Math.round((budget-knownTotal)*100)/100,complete:priced===rows.length&&rows.length>0};
}
export function updateShoppingItem(plan,id,patch){
 if(!plan||!Array.isArray(plan.items))return plan;
 const items=plan.items.map(item=>{
  if(item.id!==id)return item;
  const next={...item};
  if(typeof patch.name==='string'){const n=patch.name.trim().slice(0,110);if(n)next.name=n}
  if(typeof patch.done==='boolean')next.done=patch.done;
  if(patch.quantity!==undefined){
   const q=Number(patch.quantity);
   if(Number.isFinite(q)&&q>=1&&q<=9999)next.quantity=Math.round(q*100)/100;
  }
  if(patch.price!==undefined){
   if(patch.price===''||patch.price===null)next.price=null;
   else{const p=Number(String(patch.price).replace(',','.'));if(Number.isFinite(p)&&p>=0&&p<=10000000)next.price=Math.round(p*100)/100}
  }
  return next;
 });
 return {...plan,items,updatedAt:Date.now()};
}
export function addShoppingItem(plan,name){
 if(!plan||!Array.isArray(plan.items)||plan.items.length>=MAX_ITEMS)return plan;
 const clean=String(name||'').trim().slice(0,110);
 if(!clean)return plan;
 const id='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 return {...plan,items:[...plan.items,{id,name:clean,quantity:1,price:null,done:false}],updatedAt:Date.now()};
}
export function removeShoppingItem(plan,id){
 if(!plan||!Array.isArray(plan.items))return plan;
 return {...plan,items:plan.items.filter(x=>x.id!==id),updatedAt:Date.now()};
}
export function planAsText(plan){
 const info=describeNeed(plan?.need);
 const t=shoppingPlanTotals(plan);
 const lines=['GURU — '+(info?.title||'Planejamento de compra')+(plan?.need?.variant?' · '+plan.need.variant:''),
  'Orçamento: '+(t.budget===null?'Não definido':t.budget.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})),
  ...((plan?.items||[]).map(x=>(x.done?'[x] ':'[ ] ')+x.quantity+' × '+x.name+(x.price===null?'':' — R$ '+Number(x.price).toFixed(2).replace('.',',')+' por unidade'))),
  'Subtotal informado: '+t.knownTotal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
  !t.complete?'Atenção: itens sem preço informado; subtotal parcial.':'',
  'Valores inseridos pelo usuário. Confirme produtos, preços e disponibilidade com as lojas.'
 ].filter(Boolean);
 return lines.join('\n');
}
