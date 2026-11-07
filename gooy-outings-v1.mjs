import {outingTrophyMatch,requiredTrophies} from './gooy-trophies-v1.mjs?v=2';
// GOOY Rolês v1 — descoberta por companhia, clima e cidade, sem inventar locais.
export const outingNormalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const contains=(text,pattern)=>pattern.test(outingNormalize(text));
const COMPANIONS=[
 ['casal',/\b(namorad[ao]|espos[ao]|marid[oa]|companheir[ao]|parceir[ao]|crush|casal|romantico|romantica|a dois|para dois)\b/],
 ['amigos',/\b(amig[oa]s?|galera|turma|colegas?)\b/],
 ['familia',/\b(familia|familiares|filh[oa]s?|criancas|pais|mae|pai)\b/]
];
const MOODS=[
 ['natureza',/\b(natureza|parque|trilha|ar livre|passeio ao ar livre|praca|jardim)\b/],
 ['cultura',/\b(cultura|cultural|museu|teatro|exposicao|historia|cinema)\b/],
 ['comida',/\b(comer|jantar|almocar|cafe|cafeteria|restaurante|pizza|sobremesa|lanche|acai)\b/],
 ['animado',/\b(animado|divertido|diversao|boliche|jogos|arcade|karaoke|aventura)\b/],
 ['tranquilo',/\b(tranquilo|calmo|sossegado|relaxar|conversar|de boa|romantico|romantica|bater papo|colocar conversa em dia|intimista)\b/],
 ['musica',/\b(musica ao vivo|musica|show musical|banda ao vivo)\b/],
 ['aconchegante',/\b(aconchegante|acolhedor|acolhedora)\b/],
 ['vista',/\b(vista bonita|vista panoramica|mirante|paisagem bonita)\b/],
 ['educativo',/\b(educativo|educativa|aprender|educacional)\b/],
 ['aventura',/\b(aventura|radical|escalada|arvorismo)\b/],
 ['acessivel',/\b(acesso facilitado|acessibilidade|acessivel)\b/]
];
const OUTING=/\b(role|roles|rolinho|rol[eê]|passeio|passear|programa|programacao|date|encontro|sair|levar|onde ir|o que fazer|lugar para ir|lugares para ir|diversao|divertir|impressionar|surpreender|conversar|comemorar|celebrar)\b/;
const REFINEMENT=/\b(barato|barata|economico|economica|gratuito|gratis|tranquilo|calmo|animado|natureza|cultura|cinema|comer|jantar|evento|eventos|hoje|amanha|sabado|domingo|mais opcoes|pet|pets|cachorro|cachorra|gato|gata|musica|aventura|aconchegante|educativo|acessibilidade)\b/;
export function detectOuting(raw,previous=null) {
 const normalized=outingNormalize(raw);
 // Pedidos de compra e serviços veterinários permanecem na busca comum.
 if(/\b(comprar|compro|preco de|produto|produtos|racao|pet shop|gaiola|veterinario|veterinaria|remedio|medicamento)\b/.test(normalized)&&!/\b(passeio|passear|role|roles|rolinho)\b/.test(normalized))return null;
 const pet=/\b(pet|pets|cachorr[oa]s?|caes|cao|dog|dogs|gat[oa]s?|animal de estimacao|animais de estimacao)\b/.test(normalized);
 const children=/\b(espaco infantil|espaco para criancas|brinquedoteca|area infantil|parquinho)\b/.test(normalized);
 const companion=COMPANIONS.find(([,regex])=>regex.test(normalized))?.[0]||null;
 const mood=MOODS.find(([,regex])=>regex.test(normalized))?.[0]||(/\b(impressionar|surpreender|celebrar|comemorar)\b/.test(normalized)?'aconchegante':null);
 const explicit=(OUTING.test(normalized)&&(!!companion||pet||/\b(role|roles|rolinho|passeio|passear|date|o que fazer|lugares para ir|lugar para ir|onde ir|programacao|impressionar|surpreender|comemorar|celebrar)\b/.test(normalized)))||(/\b(evento|eventos|festival|feira|exposicao)\b/.test(normalized)&&/\b(quero|tem|buscar|procuro|hoje|amanha|final de semana|fim de semana|programacao)\b/.test(normalized));
 const followup=!!previous&&normalized.length<85&&/^(mais |algo |opcoes |lugares |eventos?\b|hoje\b|amanha\b|sabado\b|domingo\b|barat|gratuit|tranquil|animad|natureza|cultura|cinema|comida|jantar|pet|cachorr|gat|musica|aventura|aconchegante|educativ|acessibil)/.test(normalized)&&REFINEMENT.test(normalized)&&!(/\b(comprar|preco de|produto|loja de|entrega)\b/.test(normalized));
 const experienceSearch=/\b(quero|procuro|busco|buscando|indique|recomende|encontre|me indica|tem)\b.*\b(lugar|lugares|local|locais)\b.*\b(tranquilo|calmo|romantico|familia|ao ar livre|natureza|musica ao vivo|pet|pets|cachorro|gato|aconchegante|aventura|educativo|acessivel|conversar|comemorar)\b/.test(normalized)
  &&!/\b(comprar|vender|produto|racao|preco de|consertar)\b/.test(normalized);
 if(!explicit&&!followup&&!experienceSearch)return null;
 const budget=/\b(gratis|gratuito|gratuita|de graca|sem gastar)\b/.test(normalized)?'gratis':/\b(barat[oa]|economico|economica|baixo custo|pouco dinheiro)\b/.test(normalized)?'economico':followup?previous?.budget||null:null;
 return {companion:companion||(followup?previous?.companion:null)||'geral',mood:mood||(followup?previous?.mood:null)||null,budget,
  pet:pet||(followup&&previous?.pet===true),withChildren:children||(followup&&previous?.withChildren===true),
  eventsOnly:/\b(evento|eventos|show|shows|festival|feira|exposicao)\b/.test(normalized),
  date:/\b(hoje|amanha|sabado|domingo|fim de semana)\b/.exec(normalized)?.[0]||null,
  original:raw};
}
const VENUE=/(restaurante|pizzaria|cafeteria|cafe|sorveteria|acai|hamburgueria|lanchonete|doceria|confeitaria|padaria|cinema|teatro|museu|parque|praca|jardim|boliche|jogos|arcade|karaoke|centro cultural|livraria|shopping|passeio|turismo|atrac[aã]o|lazer|entretenimento|sesc|zoologico|aquario|planetario|galeria|sushi|temakeria|pastelaria|chocolateria|brinquedoteca|parque de diversoes)/;
const GROUPS={
 casal:/(restaurante|pizzaria|cafeteria|cafe|doceria|confeitaria|cinema|teatro|parque|praca|jardim|sorveteria|acai|museu|livraria|shopping|chocolateria)/,
 amigos:/(pizzaria|hamburgueria|lanchonete|boliche|jogos|arcade|cinema|parque|shopping|sorveteria|acai|cafeteria|livraria|teatro|museu|karaoke)/,
 familia:/(parque|praca|jardim|cinema|museu|sorveteria|acai|restaurante|shopping|zoologico|aquario|planetario|lazer|brinquedoteca|teatro)/,
 geral:VENUE
};
const MOOD_TERMS={
 natureza:/(parque|praca|jardim|ar livre|natureza|trilha|ecologico|passeio)/,
 cultura:/(cinema|teatro|museu|galeria|exposicao|cultura|cultural|livraria|planetario)/,
 comida:/(restaurante|pizzaria|cafeteria|cafe|doceria|sorveteria|acai|hamburgueria|confeitaria|padaria|lanche|comida)/,
 animado:/(boliche|jogos|arcade|karaoke|cinema|diversao|entretenimento|shopping)/,
 tranquilo:/(cafeteria|cafe|parque|jardim|praca|livraria|museu|doceria|sorveteria|restaurante)/
};
export function outingRankRows(rows,outing,trophies=[]){
 return rows.map(row=>{
  const s=row.store||{};
  const activeCodes=(trophies||[]).filter(t=>t.store_id===s.id&&t.active===true).map(t=>t.trophy_code);
  if(!outingTrophyMatch(activeCodes,outing))return null;
  if(outing.budget==='gratis'&&!/\b(gratis|gratuito|entrada franca)\b/.test(outingNormalize([s.description,s.additional_info].join(' '))))return null;
  const matched=requiredTrophies(outing).length;
  return {...row,outingScore:80+matched*10+(Number(row.rankScore)||0)*.1,outingTrophies:activeCodes};
 }).filter(Boolean).sort((a,b)=>b.outingScore-a.outingScore||b.rankScore-a.rankScore).slice(0,40);
}
export function outingRankPlaces(places,outing,city){
 return (places||[]).filter(p=>outingNormalize(p.city)===outingNormalize(city)&&p.name&&p.address)
 .map(p=>{
  const n=outingNormalize([p.name,p.category,p.hours].join(' '));
  if(!VENUE.test(n))return null;
  if(outing.budget==='gratis'&&!/\b(gratis|gratuito|entrada franca)\b/.test(n))return null;
  const compatible=(GROUPS[outing.companion]||VENUE).test(n);
  const mood=!outing.mood||(MOOD_TERMS[outing.mood]||VENUE).test(n);
  return {...p,score:(compatible?50:0)+(mood?20:0)};
 }).filter(p=>p&&p.score>=50).sort((a,b)=>b.score-a.score).slice(0,8);
}
export function outingUpcomingEvents(events,outing,city,now=new Date()){
 const start=now.getTime(),limit=start+1000*60*60*24*90;
 const matchesDay=(date,label)=>{
  if(label==='sabado')return date.getDay()===6;
  if(label==='domingo')return date.getDay()===0;
  if(label==='fim de semana')return date.getDay()===6||date.getDay()===0;
  return true;
 };
 return (events||[]).filter(e=>{
  const when=Date.parse(e.starts_at),until=e.ends_at?Date.parse(e.ends_at):when;
  if(e.active!==true||!e.name||!e.address||!e.city||outingNormalize(e.city)!==outingNormalize(city)||!Number.isFinite(when)||!Number.isFinite(until)||until<start||when>limit)return false;
  if(outing.date==='hoje'&&new Date(when).toDateString()!==now.toDateString())return false;
  if(outing.date==='amanha'&&new Date(when).toDateString()!==new Date(start+86400000).toDateString())return false;
  if(!matchesDay(new Date(when),outing.date))return false;
  // "Sábado", "domingo" e "fim de semana" significam a próxima ocorrência,
  // não todos os eventos de sábados e domingos dos próximos três meses.
  if(['sabado','domingo','fim de semana'].includes(outing.date)){
   const target=new Date(now.getFullYear(),now.getMonth(),now.getDate());
   const max=new Date(target.getTime()+7*86400000);
   if(new Date(when)>max)return false;
  }
  if(outing.budget==='gratis'&&e.free_entry!==true)return false;
  return true;
 }).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)).slice(0,6);
}

/* GOOY Descobertas: roteiro editorial sem inventar horários, distâncias ou atrações.
   Usa apenas estabelecimentos com troféus já compatíveis com a ocasião. */
const outingStopType=store=>{
 const taxon=outingNormalize([store.category,store.main_category,store.group,...(store.groups||[]),...(store.specialties||[])].join(' '));
 const name=outingNormalize(store.name);
 const classify=n=>{
  if(/\b(cafeteria|cafe|padaria)\b/.test(n))return 'cafe';
  if(/\b(sorveteria|sorvete|acai|doceria|confeitaria|chocolateria|sobremesa)\b/.test(n))return 'sobremesa';
  if(/\b(restaurante|pizzaria|hamburgueria|lanchonete|sushi|temakeria|pastelaria|gastronomia)\b/.test(n))return 'refeicao';
  if(/\b(cinema|teatro|museu|centro cultural|galeria|exposicao|livraria|planetario)\b/.test(n))return 'cultura';
  if(/\b(parque|praca|jardim|natureza|trilha|ecologico|area verde|ar livre)\b/.test(n))return 'ar_livre';
  if(/\b(boliche|arcade|jogos|karaoke|lazer|entretenimento|shopping)\b/.test(n))return 'diversao';
  return null;
 };
 // Categoria declarada tem prioridade: "Café Jardim" não vira parque por causa do nome.
 return classify(taxon)||classify(name)||'outro';
};
export function outingStraightKm(a,b){
 const pts=[a?.latitude,a?.longitude,b?.latitude,b?.longitude];
 if(pts.some(v=>v===null||v===undefined||String(v).trim()===''))return null;
 const nums=pts.map(Number);
 if(nums.some(v=>!Number.isFinite(v))||Math.abs(nums[0])>90||Math.abs(nums[2])>90||Math.abs(nums[1])>180||Math.abs(nums[3])>180||(nums[0]===0&&nums[1]===0)||(nums[2]===0&&nums[3]===0))return null;
 const [la1,lo1,la2,lo2]=nums.map(v=>v*Math.PI/180);
 const x=Math.sin((la2-la1)/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin((lo2-lo1)/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
export function reorderOutingStops(stops=[]){
 if(stops.length<3)return [...stops];
 if(stops.some(r=>!r.store||r.store.latitude==null||r.store.longitude==null))return [...stops];
 // Primeira parada mantém preferência editorial; as próximas reduzem deslocamento aproximado.
 const remaining=stops.slice(1),result=[stops[0]];
 while(remaining.length){
  const last=result[result.length-1];
  remaining.sort((a,b)=>(outingStraightKm(last.store,a.store)??Infinity)-(outingStraightKm(last.store,b.store)??Infinity));
  result.push(remaining.shift());
 }
 return result;
}
export function editOutingStops(text,stops=[],pool=[]){
 const n=outingNormalize(text);
 const add=/\b(adicione|adicionar|adiciona|acrescente|acrescentar|acrescenta|inclua|incluir|coloque|colocar|ponha|por|mais uma parada|mais um lugar|outra parada|outro lugar)\b/.test(n);
 const remove=/\b(tira|tire|tirar|remova|remove|remover|exclua|excluir|retira|retire|retirar)\b/.test(n);
 const reroute=/\b(refaca|refazer|reorganize|reorganizar|reordene|reordenar|mais perto|menos deslocamento|rota mais curta)\b/.test(n);
 const legacyReplace=/\b(troca|troque|trocar|substitua|substituir|muda|mude|mudar|altera|altere|alterar)\b/.test(n);
 if(!add&&!remove&&!reroute&&!legacyReplace)return null;
 if(legacyReplace&&!add&&!remove)return {kind:'choose_action',stops};
 if(reroute&&!add&&!remove)return {kind:'reorder',stops:reorderOutingStops(stops),needsCoordinates:stops.some(r=>r.store?.latitude==null||r.store?.longitude==null)};
 const orderWords={primeiro:0,primeira:0,segundo:1,segunda:1,terceiro:2,terceira:2,quarto:3,quarta:3,quinto:4,quinta:4,sexto:5,sexta:5,setimo:6,setima:6,oitavo:7,oitava:7};
 const positions=Object.entries(orderWords).find(([word])=>new RegExp('\\b'+word+'\\b').test(n))?.[1];
 const numeric=/\b([1-8])\s*(?:a|o)?\s*(?:parada|lugar|local)\b/.exec(n);
 const position=positions??(numeric?Number(numeric[1])-1:null);
 const types=[
  ['ar_livre',/\b(parque|praca|jardim|natureza|ar livre|trilha)\b/],
  ['cultura',/\b(cinema|museu|teatro|cultura|livraria)\b/],
  ['refeicao',/\b(restaurante|jantar|almoco|pizzaria|hamburgueria|comer)\b/],
  ['cafe',/\b(cafe|cafeteria|padaria)\b/],
  ['sobremesa',/\b(sorvete|sorveteria|acai|doce|sobremesa)\b/],
  ['diversao',/\b(boliche|jogos|karaoke|diversao|shopping)\b/]
 ];
 const intendedType=types.find(([,rx])=>rx.test(n))?.[0]||null;
 if(add){
  if(stops.length>=8)return {kind:'limit',stops};
  const used=new Set(stops.map(r=>String(r.store?.id)));
  const eligible=pool.filter(r=>r.store?.id&&r.store?.name&&r.store?.address&&!used.has(String(r.store.id)));
  // Nomes explícitos só são aceitos se o estabelecimento estiver no conjunto verificado.
  const requested=eligible.find(r=>outingNormalize(r.store.name).length>3&&n.includes(outingNormalize(r.store.name)));
  const candidates=requested?[requested]:intendedType?eligible.filter(r=>outingStopType(r.store)===intendedType):eligible;
  if(!candidates.length)return {kind:'unavailable_add',stops,requestedType:intendedType};
  const scored=[...candidates].sort((a,b)=>{
   const distance=r=>stops.length?outingStraightKm(stops[stops.length-1].store,r.store):null;
   const value=r=>(Number(r.outingScore)||0)+Math.max(0,12-(distance(r)??12));
   return value(b)-value(a);
  });
  const next=[...stops];
  // "Depois da segunda parada" insere na posição 3; sem posição adiciona ao final.
  const insertAfter=/\b(depois|apos|em seguida)\b/.test(n)&&position!=null;
  const insertBefore=/\b(antes)\b/.test(n)&&position!=null;
  const at=insertAfter?Math.min(position+1,next.length):insertBefore?Math.min(position,next.length):next.length;
  next.splice(at,0,scored[0]);
  return {kind:'add',stops:next,added:scored[0],index:at};
 }
 if(!stops.length)return {kind:'empty',stops};
 if(remove){
  let index=position;
  if(index==null){
   const matches=stops.map((row,i)=>({i,kind:outingStopType(row.store),name:outingNormalize(row.store?.name)}));
   const found=types.find(([,rx])=>rx.test(n));
   if(found)index=matches.find(x=>x.kind===found[0])?.i??null;
   if(index==null)index=matches.find(x=>x.name&&n.includes(x.name))?.i??null;
  }
  if(index==null||index<0||index>=stops.length)return {kind:'clarify',stops};
  return {kind:'remove',stops:stops.filter((_,i)=>i!==index),index};
 }
 return null;
}
export function buildOutingItinerary(rows=[],outing={},maxStops=3){
 const candidates=rows.filter(r=>r?.store?.id&&r.store?.name&&String(r.store.address||'').trim()&&!/^\s*[^,]+\s*-\s*[a-z]{2}\s*$/i.test(String(r.store.address||'')));
 const types=new Set(),seen=new Set(),selected=[];
 // Preserva a qualidade das recomendações, mas privilegia experiências diferentes.
 const ordered=[...candidates].sort((a,b)=>(b.outingScore||0)-(a.outingScore||0));
 for(let step=0;step<Math.min(3,maxStops);step++){
  // Após a primeira parada, prioriza lugares próximos com uma experiência diferente.
  const options=ordered.filter(r=>!seen.has(r.store.id)&&!types.has(outingStopType(r.store)));
  if(!options.length)break;
  if(selected.length){
   const previous=selected[selected.length-1].store;
   options.sort((a,b)=>{
    const score=row=>Number(row.outingScore)||0;
    const km=row=>outingStraightKm(previous,row.store);
    const benefit=row=>{const d=km(row);return score(row)+(d==null?0:Math.max(-20,15-d*2))};
    return benefit(b)-benefit(a);
   });
  }
  const row=options[0];
  const type=outingStopType(row.store);
  if(type==='outro'&&selected.length)break;
  selected.push({...row,outingStopType:type});types.add(type);seen.add(row.store.id);
  if(selected.length>=Math.min(3,maxStops))break;
 }
 if(selected.length<2)return [];
 // Ordem sugerida de experiência, não rota otimizada por distância.
 const order={ar_livre:1,cultura:2,diversao:3,refeicao:4,cafe:5,sobremesa:6,outro:7};
 return reorderOutingStops(selected.sort((a,b)=>(order[a.outingStopType]||7)-(order[b.outingStopType]||7)));
}
