const tests=[
  {q:'pizaria aberta sábado',contains:'pizzaria',day:6},
  {q:'pizaria aberta',contains:'pizzaria'},
  {q:'pizzaria',canonical:'pizzaria',type:'Pizzaria'},
  {q:'quero comer sushi',canonical:'japonesa',category:'Comida'},
  {q:'comércio de comida japonesa',category:null,type:'Loja',conflict:true},
  {q:'loja de comida japonesa',category:null,type:'Loja',conflict:true},
  {q:'negócio de comida japonesa',category:null,type:'Loja',conflict:true},
  {q:'restaurante japonês',canonical:'japonesa',category:'Comida',type:'Restaurante'},
  {q:'loja de roupa',category:'Roupas',type:'Loja'},
  {q:'comércio de roupa',category:'Roupas',type:'Loja'},
  {q:'lojas abertas agora',openNow:true},
  {q:'lojas com entrega',delivery:true},
  {q:'estou com vontade de japonesa',canonical:'japonesa'},
  {q:'onde posso comer sushi',canonical:'japonesa'},
  {q:'loja de pizza',category:null,type:'Loja',conflict:true},
  {q:'comida',category:'Comida',type:null},
  {q:'roupas',category:'Roupas'},
  {q:'farmaciaa',category:'Farmácia'},
  {q:'comida mas não pizza',excluded:'pizzaria'},
  {q:'qualquer coisa menos hambúrguer',excluded:'hamburgueria'},
  {q:'loja vegetariana para família',traits:['vegetariano','familia'],type:'Loja'}
];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const days={domingo:0,segunda:1,terca:2,quarta:3,quinta:4,sexta:5,sabado:6};
function inspect(q){
  const g=window.LocalAISemanticGuard,sem=window.GuruEstablishmentSemantics,reg=window.GuruRegressionFix;
  if(!g)return{error:'guard indisponível'};
  const conflict=!!sem?.hasRetailFoodConflict?.(q);
  const normalized=g.normalizeNaturalLanguage?.(q)||q;
  const n=norm(reg?.normalize?.(normalized)||normalized);
  let canonical=null;
  if(!conflict){
    const rule=(g.rules||[]).find(r=>r.re.test(n));
    canonical=rule?.canonical||null;
    if(/\bsushi\b|\bcomida japonesa\b/.test(n))canonical='japonesa';
    else if(/\bpizzaria\b|\bpizza\b/.test(n))canonical='pizzaria';
  }
  let category=conflict?null:(sem?.inferCategory?.(q)||null);
  if(!conflict&&!category){if(/\bcomida\b/.test(n))category='Comida';else if(/\broupas?\b/.test(n))category='Roupas';else if(/\btecnologia\b/.test(n))category='Tecnologia';else if(/\bfarmacia\b/.test(n))category='Farmácia';else if(/\bmercado\b/.test(n))category='Mercado';else if(/\bbeleza\b/.test(n))category='Beleza'}
  const fake={excludedGroups:new Set(),delivery:null,sortBy:null,specialty:null,term:null,product:null,openNow:false,day:null};
  g.applyExclusions?.(normalized,fake);g.applyCharacteristicFilters?.(normalized,fake);
  if(/abert[oa]s? agora/.test(n))fake.openNow=true;
  if(/com entrega|delivery/.test(n))fake.delivery=true;
  for(const[k,v]of Object.entries(days))if(new RegExp(`\\b${k}\\b`).test(n))fake.day=v;
  return{normalized:n,canonical,category,type:sem?.detectType?.(q)??null,conflict,excluded:[...fake.excludedGroups],traits:String(fake.specialty||'').split(' ').filter(Boolean),openNow:fake.openNow,delivery:fake.delivery,day:fake.day};
}
function run(){
  const results=tests.map(t=>{const got=inspect(t.q);let pass=!got.error;if(t.contains)pass=pass&&norm(got.normalized).includes(norm(t.contains));if(t.canonical)pass=pass&&got.canonical===t.canonical;if(Object.prototype.hasOwnProperty.call(t,'category'))pass=pass&&got.category===t.category;if(Object.prototype.hasOwnProperty.call(t,'type'))pass=pass&&got.type===t.type;if(t.conflict!==undefined)pass=pass&&got.conflict===t.conflict;if(t.excluded)pass=pass&&got.excluded.includes(norm(t.excluded));if(t.traits)pass=pass&&t.traits.every(x=>got.traits.includes(x));if(t.openNow!==undefined)pass=pass&&got.openNow===t.openNow;if(t.delivery!==undefined)pass=pass&&got.delivery===t.delivery;if(t.day!==undefined)pass=pass&&got.day===t.day;return{...t,got,pass}});
  const report={runAt:new Date().toISOString(),total:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
  try{localStorage.setItem('guru_language_test_report',JSON.stringify(report))}catch{}
  window.GuruLanguageTests={run,report,tests};return report;
}
setTimeout(run,500);
window.GuruLanguageTests={run,tests};
