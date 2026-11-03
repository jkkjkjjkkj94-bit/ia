const tests=[
  {q:'pizaria aberta sábado',contains:'pizzaria'},
  {q:'comércio de comida japonesa',canonical:'japonesa'},
  {q:'negócio de comida japonesa',canonical:'japonesa'},
  {q:'estou com vontade de japonesa',canonical:'japonesa'},
  {q:'onde posso comer sushi',canonical:'japonesa'},
  {q:'loja de pizza',canonical:'pizzaria'},
  {q:'comida',category:'Comida'},
  {q:'roupas',category:'Roupas'},
  {q:'farmaciaa',category:'Farmácia'},
  {q:'comida mas não pizza',excluded:'pizzaria'},
  {q:'qualquer coisa menos hambúrguer',excluded:'hamburgueria'},
  {q:'loja vegetariana para família',traits:['vegetariano','familia']}
];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
function inspect(q){
  const g=window.LocalAISemanticGuard;if(!g)return{error:'guard indisponível'};
  const normalized=g.normalizeNaturalLanguage?.(q)||q;const n=norm(normalized);
  const rule=(g.rules||[]).find(r=>r.re.test(n));
  let category=null;if(/\bcomida\b/.test(n))category='Comida';else if(/\broupas?\b/.test(n))category='Roupas';else if(/\btecnologia\b/.test(n))category='Tecnologia';else if(/\bfarmacia\b/.test(n))category='Farmácia';else if(/\bmercado\b/.test(n))category='Mercado';else if(/\bbeleza\b/.test(n))category='Beleza';
  const fake={excludedGroups:new Set(),delivery:null,sortBy:null,specialty:null,term:null,product:null};
  g.applyExclusions?.(normalized,fake);g.applyCharacteristicFilters?.(normalized,fake);
  return{normalized,canonical:rule?.canonical||null,category,excluded:[...fake.excludedGroups],traits:String(fake.specialty||'').split(' ').filter(Boolean)};
}
function run(){
  const results=tests.map(t=>{const got=inspect(t.q);let pass=!got.error;if(t.contains)pass=pass&&norm(got.normalized).includes(norm(t.contains));if(t.canonical)pass=pass&&got.canonical===t.canonical;if(t.category)pass=pass&&got.category===t.category;if(t.excluded)pass=pass&&got.excluded.includes(norm(t.excluded));if(t.traits)pass=pass&&t.traits.every(x=>got.traits.includes(x));return{...t,got,pass}});
  const report={runAt:new Date().toISOString(),total:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
  try{localStorage.setItem('guru_language_test_report',JSON.stringify(report))}catch{}
  window.GuruLanguageTests={run,report,tests};return report;
}
setTimeout(run,350);
window.GuruLanguageTests={run,tests};
