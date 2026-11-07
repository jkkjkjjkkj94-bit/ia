import {outingTrophyMatch,requiredTrophies} from './gooy-trophies-v1.mjs?v=2';
// GOOY Rolês v1 — descoberta por companhia, clima e cidade, sem inventar locais.
export const outingNormalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const contains=(text,pattern)=>pattern.test(outingNormalize(text));
const COMPANIONS=[
 ['casal',/\b(namorad[ao]|espos[ao]|marid[oa]|companheir[ao]|parceir[ao]|crush|casal|romantico|romantica)\b/],
 ['amigos',/\b(amig[oa]s?|galera|turma|colegas?)\b/],
 ['familia',/\b(familia|familiares|filh[oa]s?|criancas|pais|mae|pai)\b/]
];
const MOODS=[
 ['natureza',/\b(natureza|parque|trilha|ar livre|passeio ao ar livre|praca|jardim)\b/],
 ['cultura',/\b(cultura|cultural|museu|teatro|exposicao|historia|cinema)\b/],
 ['comida',/\b(comer|jantar|almocar|cafe|cafeteria|restaurante|pizza|sobremesa|lanche|acai)\b/],
 ['animado',/\b(animado|divertido|diversao|boliche|jogos|arcade|karaoke|aventura)\b/],
 ['tranquilo',/\b(tranquilo|calmo|sossegado|relaxar|conversar|de boa|romantico|romantica)\b/],
 ['musica',/\b(musica ao vivo|musica|show musical|banda ao vivo)\b/],
 ['aconchegante',/\b(aconchegante|acolhedor|acolhedora)\b/],
 ['vista',/\b(vista bonita|vista panoramica|mirante|paisagem bonita)\b/],
 ['educativo',/\b(educativo|educativa|aprender|educacional)\b/],
 ['aventura',/\b(aventura|radical|escalada|arvorismo)\b/],
 ['acessivel',/\b(acesso facilitado|acessibilidade|acessivel)\b/]
];
const OUTING=/\b(role|roles|rolinho|rol[eê]|passeio|passear|programa|programacao|date|encontro|sair|levar|onde ir|o que fazer|lugar para ir|lugares para ir|diversao|divertir)\b/;
const REFINEMENT=/\b(barato|barata|economico|economica|gratuito|gratis|tranquilo|calmo|animado|natureza|cultura|cinema|comer|jantar|evento|eventos|hoje|amanha|sabado|domingo|mais opcoes|pet|pets|cachorro|cachorra|gato|gata|musica|aventura|aconchegante|educativo|acessibilidade)\b/;
export function detectOuting(raw,previous=null) {
 const normalized=outingNormalize(raw);
 const pet=/\b(pet|pets|cachorr[oa]s?|caes|cao|dog|dogs|gat[oa]s?|animal de estimacao|animais de estimacao)\b/.test(normalized);
 const children=/\b(espaco infantil|espaco para criancas|brinquedoteca|area infantil|parquinho)\b/.test(normalized);
 const companion=COMPANIONS.find(([,regex])=>regex.test(normalized))?.[0]||null;
 const mood=MOODS.find(([,regex])=>regex.test(normalized))?.[0]||null;
 const explicit=(OUTING.test(normalized)&&(!!companion||pet||/\b(role|roles|rolinho|passeio|passear|date|o que fazer|lugares para ir|lugar para ir|onde ir|programacao)\b/.test(normalized)))||(/\b(evento|eventos|festival|feira|exposicao)\b/.test(normalized)&&/\b(quero|tem|buscar|procuro|hoje|amanha|final de semana|fim de semana|programacao)\b/.test(normalized));
 const followup=!!previous&&normalized.length<85&&/^(mais |algo |opcoes |lugares |eventos?\b|hoje\b|amanha\b|sabado\b|domingo\b|barat|gratuit|tranquil|animad|natureza|cultura|cinema|comida|jantar|pet|cachorr|gat|musica|aventura|aconchegante|educativ|acessibil)/.test(normalized)&&REFINEMENT.test(normalized)&&!(/\b(comprar|preco de|produto|loja de|entrega)\b/.test(normalized));
 const experienceSearch=/\b(quero|procuro|busco|buscando|indique|recomende|encontre|me indica|tem)\b.*\b(lugar|lugares|local|locais)\b.*\b(tranquilo|calmo|romantico|familia|ao ar livre|natureza|musica ao vivo|pet|pets|cachorro|gato|aconchegante|aventura|educativo|acessivel)\b/.test(normalized)
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
 return (events||[]).filter(e=>{
  const when=Date.parse(e.starts_at),until=e.ends_at?Date.parse(e.ends_at):when;
  if(e.active!==true||!e.name||!e.address||!e.city||outingNormalize(e.city)!==outingNormalize(city)||!Number.isFinite(when)||!Number.isFinite(until)||until<start||when>limit)return false;
  if(outing.date==='hoje'&&new Date(when).toDateString()!==now.toDateString())return false;
  if(outing.date==='amanha'&&new Date(when).toDateString()!==new Date(start+86400000).toDateString())return false;
  if(outing.budget==='gratis'&&e.free_entry!==true)return false;
  return true;
 }).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)).slice(0,6);
}
