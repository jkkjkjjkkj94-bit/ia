// Troféus GOOY: características confirmadas pelo administrador, nunca inferidas do nome da loja.
export const GOOY_TROPHIES=Object.freeze([
 {code:'ideal_casais',label:'Ideal para casais',icon:'🏆'},
 {code:'ao_ar_livre',label:'Ao ar livre',icon:'🏆'},
 {code:'ambiente_tranquilo',label:'Ambiente tranquilo',icon:'🏆'},
 {code:'programa_familia',label:'Programa em família',icon:'🏆'},
 {code:'rolê_amigos',label:'Rolê com amigos',icon:'🏆'},
 {code:'experiencia_gastronomica',label:'Experiência gastronômica',icon:'🏆'},
 {code:'programa_cultural',label:'Programa cultural',icon:'🏆'},
 {code:'aceita_pets',label:'Aceita pets',icon:'🏆'},
 {code:'espaco_infantil',label:'Espaço para crianças',icon:'🏆'},
 {code:'atividades_em_grupo',label:'Atividades em grupo',icon:'🏆'},
 {code:'musica_ao_vivo',label:'Música ao vivo',icon:'🏆'},
 {code:'ambiente_aconchegante',label:'Ambiente aconchegante',icon:'🏆'},
 {code:'vista_bonita',label:'Vista bonita',icon:'🏆'},
 {code:'passeio_educativo',label:'Passeio educativo',icon:'🏆'},
 {code:'programa_aventura',label:'Programa de aventura',icon:'🏆'},
 {code:'acesso_facilitado',label:'Acesso facilitado',icon:'🏆'}
]);
const CODES=new Set(GOOY_TROPHIES.map(x=>x.code));
export const trophyInfo=code=>GOOY_TROPHIES.find(x=>x.code===code)||null;
export function activeStoreTrophies(records,storeId){
 return [...new Set((records||[]).filter(x=>x.store_id===storeId&&x.active===true&&CODES.has(x.trophy_code)).map(x=>x.trophy_code))];
}
const COMPANION={casal:'ideal_casais',amigos:'rolê_amigos',familia:'programa_familia'};
const MOOD={natureza:'ao_ar_livre',tranquilo:'ambiente_tranquilo',comida:'experiencia_gastronomica',cultura:'programa_cultural',animado:'atividades_em_grupo',musica:'musica_ao_vivo',aconchegante:'ambiente_aconchegante',vista:'vista_bonita',educativo:'passeio_educativo',aventura:'programa_aventura',acessivel:'acesso_facilitado'};
export function requiredTrophies(outing={}){
 const c=COMPANION[outing.companion],m=MOOD[outing.mood];
 return [...new Set([c,m,outing.pet?'aceita_pets':null,outing.withChildren?'espaco_infantil':null].filter(Boolean))];
}
export function outingTrophyMatch(codes=[],outing={}){
 const required=requiredTrophies(outing);
 // Um passeio genérico ainda exige pelo menos um troféu de experiência.
 return required.length?required.every(code=>codes.includes(code)):codes.length>0;
}
