const form=document.getElementById('chatForm');
const input=document.getElementById('q');
const msgs=document.getElementById('msgs');

const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

const verbs=['reiniciar','reinicie','reinicia','resetar','resete','reset','limpar','limpe','apagar','apague','zerar','zere','recomecar','recomece','refazer','refaca','remover','remova','eliminar','elimine','tirar','retirar','cancelar','cancelar tudo','comecar de novo','iniciar de novo','voltar ao inicio'];
const targets=['filtro','filtros','busca','buscas','pesquisa','pesquisas','chat','conversa','contexto','procura','resultado','resultados','preferencias','criterios','selecao','escolha'];

const explicit=[
'nova busca','nova pesquisa','novo chat','nova conversa','novo contexto','nova procura',
'comecar outra busca','comecar outra pesquisa','comecar outro chat','comecar outra conversa',
'quero outra busca','quero nova busca','quero outra pesquisa','quero nova pesquisa','quero novo chat','quero nova conversa',
'vamos do zero','comecar do zero','quero comecar do zero','voltar do zero','zerar tudo','limpar tudo','apagar tudo','resetar tudo','reiniciar tudo',
'limpar os filtros','limpar meus filtros','limpar todos os filtros','remover os filtros','remover meus filtros','remover todos os filtros',
'reiniciar filtro','reiniciar filtros','reinicie filtro','reinicie filtros','resetar filtro','resetar filtros','resete filtro','resete filtros',
'apagar filtro','apagar filtros','zerar filtro','zerar filtros','eliminar filtro','eliminar filtros','tirar filtro','tirar filtros',
'recomecar filtro','recomecar filtros','recomecar busca','recomecar pesquisa','recomecar chat','recomecar conversa',
'reiniciar busca','reiniciar pesquisa','reiniciar chat','reiniciar conversa','reiniciar contexto','reiniciar procura',
'resetar busca','resetar pesquisa','resetar chat','resetar conversa','resetar contexto','resetar procura',
'limpar busca','limpar pesquisa','limpar chat','limpar conversa','limpar contexto','limpar procura',
'apagar busca','apagar pesquisa','apagar chat','apagar conversa','apagar contexto','apagar procura',
'zerar busca','zerar pesquisa','zerar chat','zerar conversa','zerar contexto','zerar procura',
'cancelar busca','cancelar pesquisa','cancelar chat','cancelar conversa','cancelar contexto','cancelar procura',
'remover busca','remover pesquisa','remover chat','remover conversa','remover contexto','remover procura',
'eliminar busca','eliminar pesquisa','eliminar chat','eliminar conversa','eliminar contexto','eliminar procura',
'refazer busca','refazer pesquisa','refazer chat','refazer conversa','refazer contexto','refazer procura',
'iniciar nova busca','iniciar nova pesquisa','iniciar novo chat','iniciar nova conversa','iniciar novo contexto','iniciar nova procura',
'quero reiniciar a busca','quero reiniciar a pesquisa','quero reiniciar o chat','quero reiniciar a conversa',
'quero limpar a busca','quero limpar a pesquisa','quero limpar o chat','quero limpar a conversa',
'pode reiniciar a busca','pode reiniciar a pesquisa','pode reiniciar o chat','pode reiniciar a conversa',
'pode limpar os filtros','pode remover os filtros','pode zerar os filtros','pode resetar os filtros',
'esquecer filtros','esqueca os filtros','esquecer busca anterior','esqueca a busca anterior','ignorar busca anterior','ignore a busca anterior',
'esquecer conversa','esquecer contexto','limpar historico da busca','limpar contexto atual','remover contexto atual','zerar contexto atual',
'sem filtros','buscar sem filtros','pesquisar sem filtros','tirar todos os criterios','remover criterios','limpar criterios','zerar criterios',
'limpar preferencias','remover preferencias','zerar preferencias','resetar preferencias','reiniciar preferencias',
'voltar para o inicio','voltar ao inicio','voltar para busca inicial','voltar para pesquisa inicial','voltar para o comeco',
'vamos recomecar','vamos reiniciar','vamos de novo','vamos comecar novamente','vamos iniciar novamente',
'comece de novo','comece novamente','inicie de novo','inicie novamente','recomece do zero','reinicie do zero',
'nao quero mais esses filtros','nao quero esses filtros','retire esses filtros','retire os filtros','tire esses filtros','tire os filtros',
'limpe tudo e comece novamente','apague tudo e comece novamente','zere tudo e comece novamente','resete tudo e comece novamente'
].map(norm);

const replies=[
'Pronto. Limpei o contexto. O que você quer procurar agora?',
'Tudo certo. Começamos uma nova busca. O que você procura?',
'Filtros removidos. Pode me dizer o que deseja encontrar agora.',
'Busca reiniciada. O que você quer pesquisar desta vez?',
'Tudo limpo. Podemos começar do zero. O que você precisa?',
'Contexto reiniciado. Me diga sua nova busca.',
'Feito. Apaguei os filtros anteriores. O que vamos procurar?',
'Certo. A conversa de busca foi reiniciada. O que você deseja encontrar?'
];
let lastReply='';
function reply(){const a=replies.filter(x=>x!==lastReply);lastReply=a[Math.floor(Math.random()*a.length)]||replies[0];return lastReply}

function isResetIntent(text){
  const n=norm(text);
  if(!n)return false;
  if(explicit.some(x=>n===x||n.includes(x)))return true;
  const hasVerb=verbs.some(v=>n.includes(v));
  const hasTarget=targets.some(t=>n.includes(t));
  if(hasVerb&&hasTarget)return true;
  if(/\b(do zero|de novo|novamente|outra busca|outra pesquisa|novo chat|nova conversa)\b/.test(n))return true;
  if(/\b(esquecer|ignorar)\b.*\b(anterior|filtros?|contexto|busca|pesquisa|conversa)\b/.test(n))return true;
  return false;
}

function addBot(text){const d=document.createElement('div');d.className='msg bot';d.textContent=text;msgs?.appendChild(d);if(msgs)msgs.scrollTop=msgs.scrollHeight}
function clearVisibleResults(){
  document.getElementById('ctx').textContent='';
  msgs?.querySelectorAll('.normal-result-msg,.hashtag-result-msg,.city-context-result').forEach(x=>x.remove());
}

form?.addEventListener('submit',e=>{
  const text=input?.value?.trim()||'';
  if(!isResetIntent(text))return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const u=document.createElement('div');u.className='msg user';u.textContent=text;msgs?.appendChild(u);
  if(input)input.value='';
  try{window.LocalAIEngine?.reset?.()}catch{}
  clearVisibleResults();
  addBot(reply());
},true);

window.LocalAIResetIntents={isResetIntent,count:explicit.length};
