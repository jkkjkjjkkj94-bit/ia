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
  targets:[{category:'Mercado',words:['mercado','supermercado','mercearia','bebidas','doces']},{category:'Comida',words:['padaria','doceria','bolo','confeitaria']},{category:'Varejo',words:['festa','decoracao','artigos para festas']}]
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
  targets:[{category:'Mercado',words:['mercado','supermercado','mercearia','limpeza']},{category:'Varejo',words:['limpeza','produtos de limpeza']}]
 }
};
// Novos cenários de necessidade, sem adicionar produtos falsos ao catálogo.
needs.churrasco={
 title:'Preparar um churrasco',question:'O que você precisa organizar?',
 choices:['Carnes e acompanhamentos','Bebidas','Carvão e utensílios','Tudo para o churrasco'],
 items:['Carnes e acompanhamentos','Bebidas não alcoólicas','Carvão','Utensílios'],
 targets:[{category:'Mercado',words:['mercado','supermercado','carne','bebidas']},{category:'Comida',words:['acougue','carnes']},{category:'Varejo',words:['churrasco','carvao','utensilios']}]
};
needs.escola={
 title:'Comprar material escolar',question:'Para qual finalidade você procura materiais?',
 choices:['Escola','Faculdade','Escritório','Artes e desenho'],
 items:['Cadernos ou blocos','Lápis e canetas','Pastas','Papel'],
 targets:[{category:'Varejo',words:['papelaria','material escolar','escritorio','livraria','artes']}]
};
needs.mudanca={
 title:'Organizar uma mudança',question:'O que você precisa fazer primeiro?',
 choices:['Empacotar','Organizar','Limpar o imóvel','Pequenos reparos'],
 items:['Caixas para embalagem','Fita de embalagem','Marcadores','Materiais de proteção'],
 targets:[{category:'Construção',words:['embalagem','caixa','material','construcao']},{category:'Varejo',words:['caixas','embalagem','organizacao','utilidades']}]
};
const groups={
 pintura:/\b(pintar|pintura|repintar|pintando|pintasse)\b/,
 reforma:/\b(reformar|reforma|renovar o quarto|renovar a casa|reformando)\b/,
 festa:/\b(festa|aniversario|comemoracao|confraternizacao)\b/,
 churrasco:/\b(churrasco|churras)\b/,
 escola:/\b(material escolar|materiais escolares|volta as aulas|lista escolar|compras para escola)\b/,
 mudanca:/\b(mudanca de casa|me mudar|mudar de casa|organizar uma mudanca|empacotar mudanca)\b/,
 jardim:/\b(jardim|jardinagem|plantar|horta)\b/,
 pet:/\b(cuidar do (meu |seu )?(pet|cachorro|gato)|coisas para (meu |o )?(pet|cachorro|gato))\b/,
 limpeza:/\b(limpar (minha |a )?(casa|cozinha|banheiro)|faxina|limpeza geral)\b/
};
const needCue=/\b(quero|preciso|gostaria|ajude|ajuda|como|vou|tenho|planejar|comprar|montar|organizar|procurando|desejo|pretendo|necessito|poderia|pode|fazer|tenho que)\b/;
const directLookup=/\b(onde (tem|encontro|acho|fica)|lojas? de|encontre lojas|buscar lojas|qual loja|quais lojas)\b/;
const variantClues={
 pintura:[['Uma parede',/\b(uma parede|parede interna)\b/],['Um cômodo',/\b(quarto|comodo|sala)\b/],['A casa inteira',/\b(casa inteira|casa toda)\b/],['Área externa',/\b(area externa|fachada|parede externa|muro externo)\b/]],
 reforma:[['Pintura',/\b(pintura|pintar)\b/],['Pisos e revestimentos',/\b(piso|pisos|revestimento)\b/],['Elétrica',/\b(eletrica|fiacao|tomada)\b/],['Hidráulica',/\b(hidraulica|encanamento)\b/]],
 festa:[['Comidas e bebidas',/\b(comidas e bebidas|comida e bebida)\b/],['Decoração',/\b(decoracao|decorar)\b/],['Bolo e doces',/\b(bolo|doces)\b/],['Itens descartáveis',/\b(descartaveis)\b/]],
 jardim:[['Plantar',/\b(plantar|plantio)\b/],['Adubar',/\b(adubar|adubo)\b/],['Regar',/\b(regar|irrigar)\b/],['Manutenção',/\b(manutencao|podar)\b/]],
 pet:[['Ração',/\b(racao)\b/],['Higiene',/\b(higiene|banho)\b/],['Brinquedos',/\b(brinquedos)\b/],['Acessórios',/\b(acessorios|coleira)\b/]],
 limpeza:[['Lavanderia',/\b(lavanderia|lavar roupas)\b/],['Cozinha',/\b(cozinha)\b/],['Banheiro',/\b(banheiro)\b/],['Limpeza geral',/\b(faxina|limpeza geral)\b/]],
 churrasco:[['Carnes e acompanhamentos',/\b(carne|acompanhamentos)\b/],['Bebidas',/\b(bebidas)\b/],['Carvão e utensílios',/\b(carvao|grelha)\b/],['Tudo para o churrasco',/\b(tudo para)\b/]],
 escola:[['Faculdade',/\b(faculdade)\b/],['Escritório',/\b(escritorio)\b/],['Artes e desenho',/\b(artes|desenho)\b/],['Escola',/\b(escola|escolar)\b/]],
 mudanca:[['Empacotar',/\b(empacotar|embalar)\b/],['Organizar',/\b(organizar)\b/],['Limpar o imóvel',/\b(limpar)\b/],['Pequenos reparos',/\b(reparos)\b/]]
};
export function detectNeed(raw){
 const n=normalize(raw);
 if(!n||directLookup.test(n))return null;
 // Não transformar uma pesquisa simples de produto em planejamento.
 if(!needCue.test(n)&&n.split(' ').length<=2)return null;
 for(const key of ['pintura','reforma','festa','churrasco','jardim','pet','limpeza','escola','mudanca']){
  if(!groups[key].test(n))continue;
  const variant=(variantClues[key]||[]).find(([,pattern])=>pattern.test(n))?.[0]||null;
  return {key,variant};
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
 if(need.key==='churrasco'){
  if(variant.includes('carnes'))items=['Carnes conforme preferência','Pães e acompanhamentos','Temperos'];
  else if(variant.includes('bebidas'))items=['Bebidas não alcoólicas','Gelo'];
  else if(variant.includes('carvao'))items=['Carvão','Grelha ou utensílios','Acendedor apropriado'];
 }
 if(need.key==='escola'){
  if(variant.includes('escritorio'))items=['Papel','Canetas','Pastas e organizadores'];
  else if(variant.includes('artes'))items=['Papel para desenho','Lápis ou tintas próprias','Pincéis'];
 }
 if(need.key==='mudanca'){
  if(variant.includes('empacotar'))items=['Caixas de papelão','Fita de embalagem','Material de proteção'];
  else if(variant.includes('organizar'))items=['Caixas organizadoras','Etiquetas','Marcadores'];
  else if(variant.includes('limpar')){items=['Produtos de limpeza','Panos','Luvas'];targets=needs.limpeza.targets}
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
 const exact=d.choices.find(choice=>normalize(choice)===answer);
 if(exact)return exact;
 if(answer.length>45||answer.split(' ').length>7)return null;
 return (variantClues[need.key]||[]).find(([choice,pattern])=>d.choices.includes(choice)&&pattern.test(answer))?.[0]||null;
}
export function isFindStoresForNeed(raw){
 const n=normalize(raw);
 return /^(?:quero |pode |por favor |me mostra |mostra |mostrar |ver |buscar |encontrar |procurar |achar )?(?:as |umas |algumas )?lojas?(?: para (?:isso|essa necessidade|minha lista|esses materiais))?$/.test(n)
 || /^(onde (eu )?(encontro|compro|acho|posso comprar)|onde comprar) (esses|estes|os) (itens|materiais|produtos)$/.test(n);
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
  if(!hits&&target.category==='Varejo')continue;
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
 const tokens=d.items.flatMap(item=>normalize(item).split(' ').filter(w=>w.length>=5&&!['adequada','adequado','produtos','materiais','itens','para','com','superficie','apropriada','apropriado','conforme'].includes(w)));
 const matches=all.filter(p=>tokens.some(t=>normalize(p.name).split(' ').some(w=>w===t||w.startsWith(t)&&t.length>=5))).slice(0,3);
 return {catalogCount:all.length,matchingNames:matches.map(x=>x.name)};
}
