// GURU 14 — relevância verificável, resolução de linguagem e lacunas do catálogo.
// Não cria produtos, estoque, ofertas ou estabelecimentos.
import {normalizeQuery,eligibleProduct} from './guru-engine-v4-core.mjs?v=24';
const stop=new Set('por favor poderia voce voces consegue conseguiria quero queria gostaria preciso necessito me meu minha meus minhas de do da dos das os as um uma o a que onde encontrar encontro achar buscar procure procuro pode mostrar lojas loja estabelecimento estabelecimentos comprar compro algum alguma produtos produto para com sem no na em e ou da cidade aqui qual quais tem existe existem por'.split(' '));
const clean=v=>normalizeQuery(v);
const tokens=v=>[...new Set(clean(v).split(' ').filter(x=>x.length>=3&&!stop.has(x)))];
const expand={
 'racao':['racao','alimentacao animal','pet','pet shop','agropecuaria'],
 'racoes':['racao','pet','pet shop','agropecuaria'],
 'celular':['celular','smartphone','telefonia'],
 'smartphone':['celular','telefonia'],
 'calcados':['sapatos','tenis','calcados'],
 'tenis':['calcados','loja de calcados'],
 'baloes':['artigos para festas','decoracao','baloes'],
 'brigadeiro':['doceria','confeitaria','doces'],
 'cachorro':['cachorro','cao','caes','pet','racao'],
 'gato':['gato','felino','pet','racao'],
 'fome':['comida','restaurante','pizzaria','lanchonete','mercado'],
 'pizza':['pizza','pizzaria','esfiharia'],
 'churrasco':['carnes','acougue','mercado','supermercado'],
 'pintar':['tinta','pintura','materiais de construcao'],
 'pintura':['tinta','pintura','materiais de construcao'],
 'reformar':['material de construcao','construcao','ferramentas'],
 'festa':['artigos para festas','decoracao','baloes','descartaveis'],
 'aniversario':['artigos para festas','decoracao','baloes','doces'],
 'faxina':['limpeza','mercado','supermercado'],
 'limpar':['limpeza','mercado','supermercado'],
 'escola':['material escolar','papelaria','cadernos'],
 'escolar':['material escolar','papelaria'],
 'quintal':['jardinagem','agropecuaria','plantas'],
 'jardim':['jardinagem','agropecuaria','mudas','sementes'],
 'remedio':['farmacia','drogaria'],
 'medicamento':['farmacia','drogaria'],
 'cabelo':['barbearia','salao','cabeleireiro'],
 'unhas':['manicure','salao']
};
const STRICT=/\b(sem|nao|ate|menos de|mais de|exatamente|tamanho|estoque|abert|entrega|retirada|perto de|km|preco|maximo|minimo|reais|r\$)\b/;
const LINEAR=/\b(onde|qual|quais|loja|lojas|comercio|estabelecimento)\b/;
export function semanticAlternatives(raw,data={}){
 const n=clean(raw),available=(data.stores||[]).filter(s=>s.active===true&&s.status==='active');
 if(!n||STRICT.test(n.replace(/\bsem comida\b/g,''))||n.length>160||!available.length)return [];
 const matches=[];
 const present=tokens(n);
 for(const token of present){
  const options=expand[token]||[];
  for(const term of options){
   if(clean(n).includes(clean(term)))continue;
   const word=clean(term);
   const found=available.some(s=>{
    const fields=clean([s.name,s.category,s.group,...(s.specialties||[]),s.description].join(' '));
    return fields.includes(word);
   });
   if(found&&!matches.includes(word))matches.push(word);
  }
 }
 // Expansões retornam candidatos, não substituem a frase original e não criam produtos.
 return matches.slice(0,4).map(term=>({query:term,mode:'semantic-catalog',label:term}));
}
function matching(row,query){
 const store=row.store||{};
 const name=clean(store.name),category=clean([store.category,store.group,...(store.groups||[])].join(' '));
 const specialties=clean([...(store.specialties||[]),store.description].join(' '));
 const productText=clean((row.products||[]).filter(eligibleProduct).map(p=>p.name).join(' '));
 const queryTokens=tokens(query);
 const relevant=queryTokens.filter(t=>t.length>=3);
 let nameHits=0,categoryHits=0,specialtyHits=0,productHits=0;
 for(const term of relevant){
  const hit=field=>field.split(' ').some(word=>word===term||(term.length>=5&&word.startsWith(term))||(word.length>=5&&term.startsWith(word))||(term.length>=5&&word.replace(/s$/,'')===term.replace(/s$/,'')));
  if(hit(name))nameHits++;
  else if(hit(productText))productHits++;
  else if(hit(category))categoryHits++;
  else if(hit(specialties))specialtyHits++;
 }
 const semantic=semanticAlternatives(query,{stores:[store]});
 const semanticHit=semantic.some(alt=>{
  const t=clean(alt.label);
  return category.includes(t)||specialties.includes(t)||name.includes(t);
 });
 let relevance=Math.min(100,nameHits*26+productHits*25+categoryHits*23+specialtyHits*17+(semanticHit?12:0));
 if(!relevant.length&&row.score>0)relevance=15;
 if(row.needScore>0)relevance=Math.max(relevance,Math.min(95,row.needScore));
 const quality=Math.max(0,Math.min(100,Number(row.rankScore)||0));
 const score=Math.round(relevance*.75+quality*.25);
 const reasons=[];
 if(nameHits)reasons.push('Nome da loja corresponde à pesquisa');
 if(productHits)reasons.push('Produto correspondente consta no catálogo');
 if(categoryHits)reasons.push('Categoria ou grupo corresponde à pesquisa');
 if(specialtyHits)reasons.push('Especialidade relacionada ao pedido');
 if(semanticHit&&!categoryHits&&!specialtyHits)reasons.push('Associação semântica com a necessidade');
 if(row.needScore>0)reasons.push('Tipo de loja relacionado ao planejamento');
 return {score,relevance,quality,reasons,signals:{nameHits,productHits,categoryHits,specialtyHits,semanticHit}};
}
export function contextualRank(rows=[],raw='',sort=null){
 const decorated=rows.map((row,index)=>({...row,searchMatch:matching(row,raw),stableIndex:index}));
 if(!['price','distance','rating'].includes(sort)){
  // O score de qualidade cadastral é a prioridade padrão da GURU.
  // Relevância contextual e sinais de busca desempatarão resultados de mesma qualidade.
  // Ordenações explícitas (preço, distância, avaliação) preservam a ordem recebida.
  decorated.sort((a,b)=>
   (Number(b.rankScore)||0)-(Number(a.rankScore)||0)
   ||b.searchMatch.relevance-a.searchMatch.relevance
   ||(Number(b.relevanceEvidence?.relevance)||0)-(Number(a.relevanceEvidence?.relevance)||0)
   ||b.searchMatch.score-a.searchMatch.score
   ||(Number(b.contextScore)||0)-(Number(a.contextScore)||0)
   ||(Number(b.learningSignals)||0)-(Number(a.learningSignals)||0)
   ||a.stableIndex-b.stableIndex);
 }
 return decorated.map(({stableIndex,...row})=>row);
}
export function explainMatch(row){
 const match=row.searchMatch;
 const reasons=match?.reasons||[];
 const output=[...reasons];
 if(row.distance!=null)output.push('Distância calculada a partir das coordenadas cadastradas');
 if(row.store?.delivery===true)output.push('Entrega informada no cadastro');
 if(!row.products?.length)output.push('Nenhum produto específico foi confirmado para essa pesquisa');
 return [...new Set(output)].slice(0,5);
}
export function catalogStatus(data={}){
 const stores=(data.stores||[]).filter(s=>s.active===true&&s.status==='active');
 const products=(data.products||[]).filter(p=>p.active!==false&&p.show_in_ai!==false);
 const availableProducts=products.filter(p=>eligibleProduct(p));
 return {stores:stores.length,products:products.length,availableProducts:availableProducts.length,withCatalog:new Set(products.map(p=>p.store_id)).size};
}
export function clarifyShoppingQuery(raw,data={}){
 const n=clean(raw);
 if(!n||LINEAR.test(n)||STRICT.test(n))return null;
 if(/\b(tinta|pintura|pintar)\b/.test(n)&&!/\b(parede|externa|interna|madeira|piso|tecido)\b/.test(n)){
  return {question:'Você procura tinta para qual superfície?',options:['Tinta para parede interna','Tinta para área externa','Tinta para madeira']};
 }
 if(/\b(racao)\b/.test(n)&&!/\b(cachorro|cao|caes|gato|aves|peixes|animal)\b/.test(n)){
  return {question:'A ração é para qual animal?',options:['Ração para cachorro','Ração para gato','Ração para aves']};
 }
 return null;
}
// Classifica lacunas sem armazenar mensagens pessoais: rótulos agregáveis para análise administrativa.
export function diagnosisForNoResults(raw,data={},plan={}){
 const n=clean(raw),status=catalogStatus(data);
 if(!status.stores)return {reason:'sem_lojas_ativas',label:'Sem lojas ativas'};
 if(plan.productTerm&&status.products===0)return {reason:'catalogo_sem_produtos',label:'Catálogo de produtos vazio'};
 if(plan.productTerm)return {reason:'produto_nao_cadastrado_ou_indisponivel',label:'Produto ausente ou indisponível'};
 if(STRICT.test(n))return {reason:'filtros_restritivos',label:'Nenhuma loja atende a todos os filtros'};
 return {reason:'sem_correspondencia',label:'Sem correspondência nos cadastros'};
}
export function summariseFailures(events=[]){
 const bucket=new Map();
 for(const e of events){
  if(e.matched===true||Number(e.result_count)>0)continue;
  const key=String(e.failure_reason||'sem_resultados').slice(0,60);
  bucket.set(key,(bucket.get(key)||0)+1);
 }
 return [...bucket].map(([reason,count])=>({reason,count})).sort((a,b)=>b.count-a.count);
}
