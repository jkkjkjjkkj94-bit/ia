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
 ['tranquilo',/\b(tranquilo|calmo|sossegado|relaxar|conversar|de boa|romantico|romantica)\b/]
];
const OUTING=/\b(role|roles|rolinho|rol[eê]|passeio|passear|programa|programacao|date|encontro|sair|levar|onde ir|o que fazer|lugar para ir|lugares para ir|diversao|divertir)\b/;
const REFINEMENT=/\b(barato|barata|economico|economica|gratuito|gratis|tranquilo|calmo|animado|natureza|cultura|cinema|comer|jantar|evento|eventos|hoje|amanha|sabado|domingo|mais opcoes)\b/;
export function detectOuting(raw,previous=null) {
 const normalized=outingNormalize(raw);
 const companion=COMPANIONS.find(([,regex])=>regex.test(normalized))?.[0]||null;
 const mood=MOODS.find(([,regex])=>regex.test(normalized))?.[0]||null;
 const explicit=OUTING.test(normalized)&&(!!companion||/\b(role|roles|rolinho|passeio|passear|date|encontro|o que fazer|lugares para ir|lugar para ir|onde ir|programacao)\b/.test(normalized));
 const followup=!!previous&&normalized.length<85&&REFINEMENT.test(normalized)&&!(/\b(comprar|preco de|produto|loja de|entrega)\b/.test(normalized));
 if(!explicit&&!followup)return null;
 const budget=/\b(gratis|gratuito|gratuita|de graca|sem gastar)\b/.test(normalized)?'gratis':/\b(barat[oa]|economico|economica|baixo custo|pouco dinheiro)\b/.test(normalized)?'economico':previous?.budget||null;
 return {companion:companion||previous?.companion||'geral',mood:mood||previous?.mood||null,budget,
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
export function outingRankRows(rows,outing){
 return rows.map(row=>{
  const s=row.store||{};
  const n=outingNormalize([s.name,s.category,s.main_category,s.group,...(s.groups||[]),...(s.specialties||[]),s.description,s.additional_info].join(' '));
  if(!VENUE.test(n))return null;
  const goodCompanion=(GROUPS[outing.companion]||VENUE).test(n);
  const fitsMood=!outing.mood||(MOOD_TERMS[outing.mood]||VENUE).test(n);
  if(outing.mood&&!fitsMood)return null;
  const base=(goodCompanion?45:0)+(fitsMood?25:0);
  const costHint=/\b(gratis|gratuito|gratuita|entrada franca)\b/.test(n);
  if(outing.budget==='gratis'&&!costHint)return null; // não presume acesso gratuito
  const score=base+(outing.budget==='gratis'&&costHint?20:0)+(row.distance!=null?Math.max(0,12-row.distance):0)+(Number(row.rankScore)||0)*.1;
  return {...row,outingScore:score};
 }).filter(Boolean).filter(row=>row.outingScore>=45).sort((a,b)=>b.outingScore-a.outingScore||b.rankScore-a.rankScore).slice(0,40);
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
