// GURU V6 — recuperação híbrida em três etapas, exclusivamente sobre o catálogo interno.
// A primeira etapa é o motor existente; as demais geram alternativas conservadoras
// para consultas sem resultados. Não inventa produtos nem modifica o estoque.
import {norm,normalizeQuery,eligibleProduct} from './guru-engine-v4-core.mjs';

const STOP=new Set(('quero queria preciso procure procurando procurar procurem encontra encontre encontrar buscar busque buscas '+
 'gostaria poderia voce voces por favor gentileza me mim eu meu minha meus minhas um uma uns umas '+
 'da de do das dos com sem para por que qual quais onde como quem aqui la '+
 'mais menos ate acima abaixo entre reais preco precos custa valor valores '+
 'hoje amanha agora ontem abriu abre abertos aberta entrega delivery retirada '+
 'pix dinheiro cartao credito debito aberto horario horarios tamanho cor nota avaliacao '+
 'perto longe km minutos horas unidade unidades estoque disponivel disponiveis '+
 'na no nos nas e ou nao se tem tem algum alguma algo algo lugar lugares loja lojas').split(' '));
const LEXICAL_ALIASES=new Map([
 ['cafezinho','cafe'],['cafezinhos','cafe'],['cafes','cafe'],
 ['cafe','cafeteria'],['cafeterias','cafeteria'],
 ['drogarias','farmacia'],['drogaria','farmacia'],
 ['farmacias','farmacia'],['pizzarias','pizzaria'],
 ['hamburgueres','hamburguer'],['burguer','hamburguer'],
 ['lanchonetes','lanchonete'],['padarias','padaria'],
 ['camisetas','camiseta'],['calcas','calca'],['tenizes','tenis'],
 ['sapatos','sapato'],['celulares','celular'],['smartphones','smartphone'],
 ['notebooks','notebook'],['sorvetes','sorvete'],['salgadinhos','salgados'],
 ['caminhar','caminhada'],['caminhadas','caminhada'],['caminhando','caminhada'],
 ['correndo','corrida'],['correr','corrida'],
 ['confortaveis','confortavel'],['confortabilidade','conforto'],
 ['fitness','academia'],['academias','academia'],
 ['perfumarias','perfumaria'],['petshops','petshop']
]);
const wordList=value=>norm(value).split(' ').filter(w=>w.length>=4&&w.length<=22&&!STOP.has(w)&&!/\d/.test(w));
const cache=new WeakMap();
export function catalogVocabulary(data={},taxonomy={},aliases={}){
 if(data&&typeof data==='object'&&cache.has(data))return cache.get(data);
 const terms=new Map();
 const add=(text,weight=1)=>{for(const w of wordList(text))terms.set(w,(terms.get(w)||0)+weight)};
 for(const [category,groups] of Object.entries(taxonomy||{})){
  add(category,4);
  for(const a of aliases[category]||[])add(a,3);
  for(const [group,alt] of Object.entries(groups||{})){
   add(group,4);for(const a of Array.isArray(alt)?alt:[])add(a,3);
  }
 }
 for(const store of (data.stores||[]).filter(s=>s.active===true&&s.status==='active').slice(0,2000)){
  add(store.name,4);add(store.category,4);add(store.group,4);
  for(const group of store.groups||[])add(group,3);
  for(const specialty of store.specialties||[])add(specialty,2);
  add(store.description,1);
 }
 for(const product of (data.products||[]).filter(p=>eligibleProduct(p)).slice(0,5000)){
  add(product.name,4);add(product.category,3);add(product.brand,2);
  add(product.description,1);
 }
 // Candidatos sem correspondência no banco nunca serão usados em expansão.
 if(data&&typeof data==='object')cache.set(data,terms);
 return terms;
}
function distanceOne(a,b){
 if(Math.abs(a.length-b.length)>1)return false;
 let i=0,j=0,mismatch=0;
 while(i<a.length&&j<b.length){
  if(a[i]===b[j]){i++;j++;continue}
  if(++mismatch>1)return false;
  if(a.length>b.length)i++;
  else if(b.length>a.length)j++;
  else{i++;j++}
 }
 return mismatch+(a.length-i)+(b.length-j)===1;
}
export function repairFromCatalog(raw,vocabulary){
 const words=normalizeQuery(raw).split(' '),changed=[];
 for(let i=0;i<words.length;i++){
  const token=words[i];
  if(changed.length>=2)break;
  if(token.length<5||token.length>18||STOP.has(token)||/\d/.test(token)||vocabulary.has(token))continue;
  const options=[];
  for(const [candidate,weight] of vocabulary){
   if(candidate.length<5||Math.abs(candidate.length-token.length)>1)continue;
   if(distanceOne(token,candidate))options.push({candidate,weight});
  }
  options.sort((a,b)=>b.weight-a.weight||a.candidate.localeCompare(b.candidate));
  if(!options.length)continue;
  // Evita corrigir nomes de lojas ou palavras pouco claras para vários destinos possíveis.
  if(options.length>1&&options[0].weight<options[1].weight*2)continue;
  words[i]=options[0].candidate;
  changed.push({from:token,to:options[0].candidate});
 }
 return {query:words.join(' '),changes:changed};
}
export function semanticAlternative(raw,vocabulary){
 const words=normalizeQuery(raw).split(' '),changed=[];
 for(let i=0;i<words.length;i++){
  const replacement=LEXICAL_ALIASES.get(words[i]);
  if(!replacement||!vocabulary.has(replacement)||replacement===words[i])continue;
  changed.push({from:words[i],to:replacement});
  words[i]=replacement;
 }
 return {query:words.join(' '),changes:changed};
}
export function searchAlternatives(raw,data={},taxonomy={},aliases={}){
 const dictionary=catalogVocabulary(data,taxonomy,aliases);
 const normalized=normalizeQuery(raw),outputs=[],seen=new Set([normalized]);
 const insert=(candidate,mode)=>{
  if(!candidate.changes.length||!candidate.query||seen.has(candidate.query))return;
  seen.add(candidate.query);
  outputs.push({query:candidate.query,mode,changes:candidate.changes});
 };
 const semantic=semanticAlternative(normalized,dictionary);
 const corrected=repairFromCatalog(normalized,dictionary);
 insert(semantic,'semantic');
 insert(corrected,'correction');
 if(corrected.changes.length){
  const both=semanticAlternative(corrected.query,dictionary);
  insert({query:both.query,changes:[...corrected.changes,...both.changes]},'hybrid');
 }
 return outputs.slice(0,3);
}
export function preserveMandatoryFilters(original={},alternate={}){
 // Filtros da pergunta original têm precedência em qualquer interpretação alternativa.
 return {
  ...alternate,
  filters:{...(original.filters||{})},
  location:{...(alternate.location||{}),...(original.location||{})},
  excludedGroups:[...new Set([...(alternate.excludedGroups||[]),...(original.excludedGroups||[])])],
  excludedCategories:[...new Set([...(alternate.excludedCategories||[]),...(original.excludedCategories||[])])],
  excludedTerms:[...new Set([...(alternate.excludedTerms||[]),...(original.excludedTerms||[])])]
 };
}
