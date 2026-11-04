// Conversação social local da GURU: não consulta o catálogo nem a API da OpenAI.
// Correspondência de mensagens completas para não confundir cumprimentos com pesquisas.
const normalize=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const GREETING=/^(?:oi+|ola+|opa|e ai|eae|hey|bom dia|boa tarde|boa noite|salve|oie)(?: (?:guru|pessoal|tudo bem|tudo bom|como vai|como voce esta|como esta|beleza|td bem|td bom))*$/;
const HOW_ARE_YOU=/^(?:tudo bem|tudo bom|ta tudo bem|esta tudo bem|como vai|como voce esta|como esta|voce esta bem|como vao as coisas|beleza|de boa|td bem|td bom)(?: (?:com voce|por ai|guru|e voce))*$/;
const THANKS=/^(?:obrigad[oa]|muito obrigad[oa]|obrigad[oa] mesmo|valeu|valeu mesmo|agradeco|gratidao|brigad[oa]|show obrigado|perfeito obrigado|beleza obrigado)(?: (?:guru|pela ajuda|por ajudar|pela indicacao|pela dica|demais|mesmo))*$/;
const GOODBYE=/^(?:tchau|ate mais|ate logo|ate breve|ate a proxima|falou|flw|fui|adeus|boa noite ate mais|valeu tchau|obrigado tchau)(?: guru)?$/;
const WELL=/^(?:estou bem|to bem|tudo certo|tudo otimo|tudo tranquilo|tudo joia|bem tambem|tambem estou bem|otimo|legal|beleza|maravilha)(?: (?:obrigad[oa]|e voce|e por ai|guru|por perguntar))*$/;
const INTRO=/^(?:quem e voce|voce e quem|qual seu nome|como voce se chama|voce e uma ia|voce e um robo|o que e a guru|o que voce faz|como funciona a guru|o que voce sabe fazer|voce pode me ajudar|pode me ajudar|me ajuda|preciso de ajuda)$/;
const greetingPrefix=/^(?:(?:oi+|ola+|opa|e ai|eae|hey|bom dia|boa tarde|boa noite|salve|oie)(?: guru)?|tudo bem|tudo bom|beleza|td bem)\b[\s,.!?;:–-]*/i;
function socialAnswer(normalized){
 if(GREETING.test(normalized)||HOW_ARE_YOU.test(normalized)){
  if(/tudo bem|tudo bom|como|td bem|td bom|beleza/.test(normalized))return 'Oi! Tudo certo por aqui 😊 E com você? Se precisar, posso ajudar a encontrar lojas, produtos ou serviços.';
  if(/bom dia/.test(normalized))return 'Bom dia! 😊 Que bom te ver por aqui. O que você gostaria de encontrar hoje?';
  if(/boa tarde/.test(normalized))return 'Boa tarde! Posso te ajudar a encontrar uma loja, produto ou serviço. O que você procura?';
  if(/boa noite/.test(normalized))return 'Boa noite! 😊 Posso te ajudar a encontrar algo por aqui. O que você está procurando?';
  return 'Oi! 😊 Que bom ter você por aqui. Quer encontrar alguma loja, produto ou serviço?';
 }
 if(THANKS.test(normalized))return 'Por nada! 😊 Se precisar de mais alguma coisa, é só me dizer.';
 if(GOODBYE.test(normalized))return 'Até mais! Foi um prazer ajudar. 👋';
 if(WELL.test(normalized))return 'Que bom! 😊 Me conta: tem alguma coisa que você gostaria de encontrar?';
 if(INTRO.test(normalized))return 'Eu sou a GURU, sua assistente para encontrar lojas, produtos e serviços. Você pode me pedir uma pizzaria com entrega, procurar uma loja pelo nome ou perguntar sobre as opções encontradas.';
 return null;
}
/**
 * @returns {{kind:'social',answer:string}|{kind:'search',query:string}}
 * Retorna 'search' para qualquer pedido que não seja uma mensagem social completa.
 * Nunca descarta o contexto da conversa.
 */
export function routeConversation(text){
 const raw=String(text||'').trim(),normalized=normalize(raw);
 if(!normalized)return{kind:'search',query:raw};
 const answer=socialAnswer(normalized);
 if(answer)return{kind:'social',answer};
 // Saudações no começo de uma pesquisa não devem contaminar os termos de busca.
 const match=raw.match(greetingPrefix);
 if(match){
  const rest=raw.slice(match[0].length).trim();
  if(rest&&normalize(rest)&&!socialAnswer(normalize(rest)))return{kind:'search',query:rest};
 }
 return{kind:'search',query:raw};
}
