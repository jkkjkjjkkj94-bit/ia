// GURU Needs V1 — planejamento por necessidade, sem afirmar estoque inexistente.
const normalize=value=>String(value??'').toLowerCase().normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const needs={
 pintura:{
  title:'Pintar um ambiente',
  question:'O que você pretende pintar?',
  choices:['Uma parede','Um cômodo','A casa inteira','Área externa'],
  items:['Tintas para paredes','Massa corrida ou acrílica','Selador ou fundo preparador','Rolos e pincéis','Fita de pintura','Lixas e bandejas'],
  targets:[{category:'Construção',words:['tinta','pintura','materiais de construcao','construcao','acabamento']},{category:'Varejo',words:['tinta','pintura']}]
 },
 reforma:{
  title:'Reformar um ambiente',
  question:'Qual etapa da reforma você precisa resolver primeiro?',
  choices:['Pintura','Pisos e revestimentos','Elétrica','Hidráulica'],
  items:['Materiais de construção','Ferramentas e acessórios','Itens de proteção','Acabamentos'],
  targets:[{category:'Construção',words:['construcao','material','ferragem','revestimento','tinta','eletric','hidraulic']}]
 },
 festa:{
  title:'Organizar uma comemoração',
  question:'O que você procura para a comemoração?',
  choices:['Comidas e bebidas','Decoração','Bolo e doces','Itens descartáveis'],
  items:['Bebidas e alimentos','Doces e sobremesas','Descartáveis','Decoração'],
  targets:[{category:'Mercado',words:['mercado','supermercado','mercearia','bebidas','doces']},{category:'Comida',words:['padaria','doceria','bolo','confeitaria']},{category:'Varejo',words:['festa','decoracao','variedades']}]
 },
 jardim:{
  title:'Cuidar do jardim',
  question:'O que você quer fazer no jardim?',
  choices:['Plantar','Adubar','Regar','Manutenção'],
  items:['Mudas ou sementes','Terra e substrato','Adubo','Ferramentas de jardinagem','Itens de irrigação'],
  targets:[{category:'Agropecuária',words:['agro','jardim','sement','muda','adubo','ferrament','irrig']},{category:'Construção',words:['jardim','ferrament','irrig']}]
 },
 pet:{
  title:'Cuidar do seu pet',
  question:'Qual é sua necessidade?',
  choices:['Ração','Higiene','Brinquedos','Acessórios'],
  items:['Ração adequada ao animal','Produtos de higiene','Acessórios','Brinquedos'],
  targets:[{category:'Pet shop',words:['pet','racao','animal','higiene','acessorio']},{category:'Agropecuária',words:['animal','racao','pet']}]
 },
 limpeza:{
  title:'Organizar a limpeza',
  question:'Que tipo de limpeza você precisa fazer?',
  choices:['Limpeza geral','Lavanderia','Cozinha','Banheiro'],
  items:['Produtos de limpeza','Panos e esponjas','Luvas','Utensílios de limpeza'],
  targets:[{category:'Mercado',words:['mercado','supermercado','mercearia','limpeza']},{category:'Varejo',words:['limpeza','variedades']}]
 }
};
const groups={
 pintura:/\b(pintar|pintura|repintar|pintando)\b/,
 reforma:/\b(reformar|reforma|renovar o quarto|renovar a casa|reformando)\b/,
 festa:/\b(festa|aniversario|comemoracao|confraternizacao)\b/,
 jardim:/\b(jardim|jardinagem|plantar|horta)\b/,
 pet:/\b(cuidar do (meu |seu )?(pet|cachorro|gato)|coisas para (meu |o )?(pet|cachorro|gato))\b/,
 limpeza:/\b(limpar (minha |a )?(casa|cozinha|banheiro)|faxina|limpeza geral)\b/
};
const needCue=/\b(quero|preciso|gostaria|ajude|ajuda|como|vou|tenho que|planejar|comprar|montar|organizar|procurando)\b/;
export function detectNeed(raw){
 const n=normalize(raw);
 if(!needCue.test(n))return null;
 // Um produto simples ("quero tinta") continua sendo busca normal.
 for(const key of ['pintura','reforma','festa','jardim','pet','limpeza']){
  if(groups[key].test(n))return {key,variant:null};
 }
 return null;
}
export function describeNeed(need){
 const record=needs[need?.key];if(!record)return null;
 let items=[...record.items],targets=record.targets;
 const variant=normalize(need.variant||'');
 if(need.key==='pintura'){
  if(variant.includes('externa'))items=['Tintas para exterior','Selador adequado à superfície','Rolos ou trinchas','Fita de pintura','Lixas'];
  if(variant.includes('parede'))items=['Tinta adequada à parede','Rolos ou pincéis','Fita de pintura','Lixas','Bandeja'];
 }
 if(need.key==='reforma'){
  if(variant.includes('pintura')){items=[...needs.pintura.items];targets=needs.pintura.targets}
  else if(variant.includes('pisos'))items=['Pisos e revestimentos','Argamassa','Rejunte','Espaçadores'];
  else if(variant.includes('eletrica'))items=['Cabos e condutores','Tomadas e interruptores','Eletrodutos'];
  else if(variant.includes('hidraulica'))items=['Tubos e conexões','Registros','Vedantes','Ferramentas'];
 }
 if(need.key==='festa'){
  if(variant.includes('decoracao')){items=['Balões','Decoração de mesa','Enfeites e artigos de festa'];targets=[...record.targets].reverse()}
  else if(variant.includes('bolo'))items=['Bolos','Doces','Sobremesas'];
  else if(variant.includes('descartaveis'))items=['Copos','Pratos','Guardanapos','Talheres descartáveis'];
 }
 if(need.key==='pet'){
  if(variant.includes('racao'))items=['Ração para cães ou gatos','Petiscos'];
  if(variant.includes('higiene'))items=['Shampoo para pets','Tapete higiênico','Escovas'];
 }
 return {...record,items,targets};
}
export function choiceForNeed(need,raw){
 const d=describeNeed(need);if(!d)return null;
 const answer=normalize(raw);
 return d.choices.find(choice=>normalize(choice)===answer)||null;
}
export function isFindStoresForNeed(raw){
 return /^(?:encontrar|buscar|procurar|mostrar|ver|achar)(?: as)? lojas(?: para (?:isso|essa necessidade|minha lista))?$/.test(normalize(raw));
}
function candidateScore(store,targets){
 const category=normalize(store.category);
 const material=normalize([store.name,store.group,...(store.groups||[]),...(store.specialties||[]),store.description].join(' '));
 let best=0;
 for(const target of targets){
  if(category!==normalize(target.category))continue;
  const hits=target.words.reduce((sum,word)=>sum+(material.includes(normalize(word))?1:0),0);
  // Para categorias relacionadas, aceitar lojas genéricas mas nunca prometer
  // que vendem algum material específico.
  const score=hits>0?30+Math.min(hits,5)*10:8;
  best=Math.max(best,score);
 }
 return best;
}
export function findStoresForNeed(db,need,city,position,searchStores,emptyState,limit=60){
 const data=describeNeed(need);
 if(!data||!city)return [];
 const state=emptyState();
 state.location={city,uf:null,neighborhood:null};
 state.query='lojas';
 const candidates=searchStores(db,state,position,{limit:Math.max(limit,(db.stores||[]).length)});
 const ranked=candidates.map(row=>({...row,needScore:candidateScore(row.store,data.targets)}))
  .filter(row=>row.needScore>0);
 ranked.sort((a,b)=>b.needScore-a.needScore||b.rankScore-a.rankScore||a.store.name.localeCompare(b.store.name,'pt-BR'));
 return ranked.slice(0,limit);
}
export function catalogVerification(store,db,need,eligibleProduct){
 const d=describeNeed(need);
 const all=(db.products||[]).filter(p=>p.store_id===store.id&&eligibleProduct(p));
 if(!d)return {catalogCount:all.length,matchingNames:[]};
 const tokens=d.items.flatMap(item=>normalize(item).split(' ').filter(w=>w.length>=5&&!['adequada','adequado','produtos','materiais','itens','para','com'].includes(w)));
 const matches=all.filter(p=>tokens.some(t=>normalize(p.name).includes(t))).slice(0,3);
 return {catalogCount:all.length,matchingNames:matches.map(x=>x.name)};
}
