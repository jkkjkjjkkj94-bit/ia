const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

export const taxonomy={
  Comida:{
    Pizzaria:['pizzaria','pizza','pizzas','pizzeria','pizzarias','pizza artesanal','pizza delivery','rodízio de pizza','rodizio de pizza'],
    Hamburgueria:['hamburgueria','hambúrguer','hamburguer','hambúrgueres','hamburgueres','burger','burguer','x-burguer','x-salada','fast food'],
    Padaria:['padaria','pão','pães','paes','panificadora','panificação'],
    Pastelaria:['pastelaria','pastel','pastéis','pasteis','pastel frito','pastel de feira'],
    Churrascaria:['churrascaria','churrasco','carne','carnes','espetinho','espetinhos','grelhados','rodízio','rodizio'],
    Japonesa:['japonesa','sushi','sashimi','temaki','yakisoba','comida japonesa','japonês','japones','oriental'],
    Marmita:['marmita','marmitas','marmitex','quentinha','quentinhas','prato feito','pf','prato executivo'],
    Doceria:['doceria','doce','doces','sobremesa','sobremesas','confeitaria','brigadeiro'],
    Sorveteria:['sorveteria','sorvete','sorvetes','gelato','casquinha','milk shake','milkshake'],
    Açaí:['açaí','açai','acai','açaiteria','acaiteria','açaí na tigela','acai na tigela']
  },
  Roupas:{
    Feminina:['roupa feminina','moda feminina','feminina','vestido feminino'],
    Masculina:['roupa masculina','moda masculina','masculina'],
    Infantil:['roupa infantil','moda infantil','infantil','roupa de criança','roupa de crianca'],
    Calçados:['calçados','calcados','calçado','calcado','sapatos','sapato','tênis','tenis'],
    'Moda íntima':['moda íntima','moda intima','lingerie','roupa íntima','roupa intima'],
    Esportiva:['roupa esportiva','moda esportiva','esportiva','fitness'],
    Acessórios:['acessórios de moda','acessorios de moda','bolsas','bolsa','cintos','cinto']
  },
  Farmácia:{
    Drogaria:['drogaria','farmácia convencional','farmacia convencional'],
    Manipulação:['farmácia de manipulação','farmacia de manipulacao','manipulação','manipulacao'],
    'Produtos naturais':['produtos naturais','fitoterápicos','fitoterapicos','ervas medicinais']
  },
  Mercado:{
    Supermercado:['supermercado','supermercados'],
    Mercearia:['mercearia','mercearias'],
    Hortifruti:['hortifruti','hortifrúti','frutas e verduras','verduras e frutas'],
    Conveniência:['loja de conveniência','loja de conveniencia','conveniência','conveniencia']
  },
  Beleza:{
    Salão:['salão de beleza','salao de beleza','salão','salao','cabeleireiro'],
    Barbearia:['barbearia','barbeiro'],
    Estética:['clínica de estética','clinica de estetica','estética','estetica'],
    Manicure:['manicure','pedicure','unhas'],
    Cosméticos:['cosméticos','cosmeticos','loja de cosméticos','loja de cosmeticos']
  },
  Tecnologia:{
    Celulares:['celulares','smartphones','loja de celular','loja de celulares'],
    Informática:['informática','informatica','computadores','notebooks','loja de informática','loja de informatica'],
    Eletrônicos:['eletrônicos','eletronicos','loja de eletrônicos','loja de eletronicos'],
    Acessórios:['acessórios eletrônicos','acessorios eletronicos','acessórios de celular','acessorios de celular'],
    'Assistência técnica':['assistência técnica','assistencia tecnica','conserto de celular','conserto de computador']
  },
  Serviços:{
    'Assistência técnica':['assistência técnica','assistencia tecnica','reparo técnico','reparo tecnico'],
    Manutenção:['manutenção','manutencao','serviço de manutenção','servico de manutencao'],
    Limpeza:['serviço de limpeza','servico de limpeza','limpeza residencial','limpeza comercial'],
    'Serviços profissionais':['serviços profissionais','servicos profissionais','consultoria','assessoria']
  },
  'Pet shop':{
    Veterinária:['clínica veterinária','clinica veterinaria','veterinária','veterinaria','veterinário','veterinario'],
    'Banho e tosa':['banho e tosa','banho tosa','tosa'],
    Rações:['ração','racao','rações','racoes','loja de ração','loja de racao']
  },
  Automóveis:{
    Oficina:['oficina','oficina mecânica','oficina mecanica','mecânica automotiva','mecanica automotiva'],
    Autopeças:['autopeças','autopecas','peças automotivas','pecas automotivas'],
    Pneus:['pneus','pneu','borracharia'],
    'Estética automotiva':['estética automotiva','estetica automotiva','lava rápido','lava rapido','detalhamento automotivo']
  },
  Construção:{
    'Materiais de construção':['materiais de construção','materiais de construcao','material de construção','material de construcao'],
    Ferragens:['ferragens','ferragem','loja de ferragens'],
    Tintas:['tintas','tinta','loja de tintas'],
    Elétrica:['material elétrico','material eletrico','elétrica','eletrica'],
    Hidráulica:['material hidráulico','material hidraulico','hidráulica','hidraulica']
  }
};

export const categoryAliases={
  Roupas:['roupa','roupas','moda','boutique','vestuário','vestuario','camiseta','camisa','calça','calca','vestido'],
  Farmácia:['farmácia','farmacia','remédio','remedio','medicamento'],
  Mercado:['mercado','compras de mercado'],
  Beleza:['beleza'],
  Tecnologia:['tecnologia','celular','computador','notebook','eletrônico','eletronico','fone'],
  Serviços:['serviço','servico','serviços','servicos','conserto'],
  'Pet shop':['pet','petshop','pet shop','animais de estimação','animais de estimacao'],
  Automóveis:['carro','automóvel','automovel','automóveis','automoveis'],
  Construção:['construção','construcao','obra','reforma'],
  Comida:['comida','alimentação','alimentacao','refeição','refeicao']
};

const categoryExclusionAliases={
  Roupas:['roupa','roupas','vestuário','vestuario'],
  Farmácia:['farmácia','farmacia'],
  Mercado:['mercado'],
  Beleza:['beleza'],
  Tecnologia:['tecnologia'],
  Serviços:['serviço','servico','serviços','servicos'],
  'Pet shop':['pet shop','petshop','pet'],
  Automóveis:['automóveis','automoveis','automóvel','automovel'],
  Construção:['construção','construcao'],
  Comida:['comida','alimentação','alimentacao','refeição','refeicao']
};
let runtimeCategoryAliases=structuredClone(categoryAliases);

const categoryNames=Object.keys(taxonomy).map(norm);
const broadCategoryTerms=new Set(Object.entries(categoryExclusionAliases).flatMap(([category,terms])=>[category,...terms]).map(norm));
export const functionalWords=new Set(['quero','queria','preciso','procuro','procurando','onde','achar','encontrar','comprar','loja','lojas','lugar','lugares','local','locais','estabelecimento','estabelecimentos','restaurante','uma','um','uns','umas','algo','qualquer','tanto','faz','tipo','opcao','opção','que','com','sem','ate','até','agora','perto','mais','menos','tamanho','entrega','delivery','nao','não','em','de','da','do','das','dos','estado','cidade','bairro','pagamento','retirada','promocao','promoção','oferta','desconto','vende','vendem','venda','vender','aberto','aberta','abertos','abertas','abre','abrir','fecha','fechar','funciona','funcionando','hoje','amanha','amanhã','depois','antes','partir','manha','manhã','tarde','noite','domingo','segunda','terca','terça','quarta','quinta','sexta','sabado','sábado','feira',...categoryNames]);

const intentPatterns={
  RESET_ALL:/nova busca|nova pesquisa|novo chat|nova conversa|comecar do zero|começar do zero|resetar|limpar contexto|limpar busca/,
  COMPARE_RESULTS:/compare|comparar|comparação|comparacao|qual.*melhor|qual dessas|qual deles|qual delas|qual entrega mais rapido|qual entrega mais rápido/,
  ASK_HOURS:/horário|horario|funcionamento|que horas|abre|fecha/,
  ASK_DISTANCE:/distância|distancia|quantos km|fica longe/,
  ASK_DELIVERY:/entrega|delivery|frete/,
  ASK_PAYMENT:/pix|pagamento|crédito|credito|débito|debito|dinheiro|cartão|cartao/,
  ASK_PRODUCTS:/produto|produtos|preço|preco|valor|estoque|tamanho|tam\b/,
  SELECT_RESULT:/^\d+$|primeira|primeiro|segunda|segundo|terceira|terceiro|última|ultima|último|ultimo|mais barata|mais barato|mais perto|mais próxima|mais proxima|mais próximo|mais proximo/
};
const approximateIntents=[
  {re:/algo doce|comer doce|vontade de doce|sobremesa|coisa doce/,category:'Comida',group:'Doceria'},
  {re:/algo gelado|tomar sorvete|sorvete gelado/,category:'Comida',group:'Sorveteria'},
  {re:/comida oriental|comer japones|comer japonês|algo japones|algo japonês/,category:'Comida',group:'Japonesa'},
  {re:/comer pizza|vontade de pizza/,category:'Comida',group:'Pizzaria'},
  {re:/comer hamburguer|comer hambúrguer|vontade de hamburguer|vontade de hambúrguer|um lanche|comer lanche/,category:'Comida',group:'Hamburgueria'},
  {re:/comida caseira|comida pronta|almoco rapido|almoço rápido|prato feito/,category:'Comida',group:'Marmita'},
  {re:/tomar acai|tomar açaí|vontade de acai|vontade de açaí/,category:'Comida',group:'Açaí'}
];
const weekDays={domingo:0,segunda:1,'segunda feira':1,terca:2,'terca feira':2,quarta:3,'quarta feira':3,quinta:4,'quinta feira':4,sexta:5,'sexta feira':5,sabado:6};
const genericGroupTerms=new Set(Object.keys(taxonomy).flatMap(c=>Object.keys(taxonomy[c]||{})).map(norm));
function tomorrowDay(){return(new Date().getDay()+1)%7}
function detectDay(text){const n=norm(text);if(/\bamanha\b/.test(n))return tomorrowDay();if(/\bhoje\b/.test(n))return new Date().getDay();for(const[name,num]of Object.entries(weekDays)){const p=name.replace(/ /g,'\\s+');if(new RegExp(`(?:^|\\s)${p}(?:\\s|$)`).test(n))return num}return null}
function hmToMinutes(h,m='0'){const hh=Number(h),mm=Number(m);return Number.isFinite(hh)&&hh>=0&&hh<=23&&Number.isFinite(mm)&&mm>=0&&mm<=59?hh*60+mm:null}
function detectSchedule(text){const n=norm(text),day=detectDay(text);let period=null,start=null,end=null,openNow=/abert[oa]s? agora|aberto agora|aberta agora|so precisa estar abert|só precisa estar abert/.test(n);if(/\bde manha\b|\bmanha\b/.test(n)){period='morning';start=360;end=720}else if(/\bde tarde\b|\btarde\b/.test(n)){period='afternoon';start=720;end=1080}else if(/\ba noite\b|\bde noite\b|\bnoite\b/.test(n)){period='night';start=1080;end=1439}const after=n.match(/(?:depois das?|apos as?|a partir das?)\s*(\d{1,2})(?::(\d{2}))?\s*h?/);if(after){start=hmToMinutes(after[1],after[2]);period='after'}const before=n.match(/(?:antes das?|ate as?)\s*(\d{1,2})(?::(\d{2}))?\s*h?/);if(before){end=hmToMinutes(before[1],before[2]);period='before'}const exact=n.match(/(?:as)\s*(\d{1,2})(?::(\d{2}))?\s*h\b/);if(exact&&!after&&!before){start=hmToMinutes(exact[1],exact[2]);end=start;period='at'}return{day,openNow,period,start,end}}

export function mergeSynonymsIntoTaxonomy(baseTaxonomy,synonyms={}){
  const out=structuredClone(baseTaxonomy);
  if(!synonyms||typeof synonyms!=='object'||Array.isArray(synonyms))return out;
  for(const[key,values]of Object.entries(synonyms)){
    const all=[key,...(Array.isArray(values)?values:[])].filter(Boolean);let matched=false;
    for(const groups of Object.values(out))for(const[group,terms]of Object.entries(groups||{})){if(norm(group)===norm(key)){groups[group]=[...new Set([...terms,...all])];matched=true;break}}
    if(matched)continue;
    const category=Object.keys(out).find(c=>norm(c)===norm(key));
    if(category)runtimeCategoryAliases[category]=[...new Set([...(runtimeCategoryAliases[category]||[]),...all])];
  }
  return out;
}
function termRegex(term){return new RegExp(`(?:^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\ /g,'\\s+')}(?:\\s|$)`)}
function detectTaxonomy(text,tax=taxonomy){const n=norm(text);let best=null;for(const[category,groups]of Object.entries(tax))for(const[group,terms]of Object.entries(groups||{}))for(const raw of [group,...terms]){const term=norm(raw);if(term&&termRegex(term).test(n)&&(!best||term.length>best.term.length))best={category,group,term,raw,type:'group'}}for(const category of Object.keys(tax)){const aliases=[category,...(runtimeCategoryAliases[category]||[])];for(const raw of aliases){const term=norm(raw);if(term&&termRegex(term).test(n)&&(!best||term.length>best.term.length))best={category,group:null,term,raw,type:term===norm(category)?'category':'category_alias'}}}if(!best){const approx=approximateIntents.find(x=>x.re.test(n));if(approx)best={category:approx.category,group:approx.group,term:n,raw:text,type:'approximate'}}return best?{category:best.category,group:best.group,matchedTerm:best.raw,matchedNormalized:best.term,matchedType:best.type}:{category:null,group:null,matchedTerm:null,matchedNormalized:null,matchedType:null}}
function detectNegatedTaxonomy(text,tax=taxonomy){
  const n=norm(text),categories=[],groups=[];
  for(const[category,gmap]of Object.entries(tax))for(const[group,terms]of Object.entries(gmap||{}))for(const raw of [group,...terms]){const term=norm(raw);if(!term)continue;const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\ /g,'\\s+');if(new RegExp(`(?:nao quero|nao seja|sem|evitar|excluir|menos|exceto|tirando)\\s+(?:um\\s+|uma\\s+)?(?:[^ ]+\\s+){0,2}${escaped}(?:\\s|$)`).test(n)){groups.push(group);break}}
  for(const[category,terms]of Object.entries(categoryExclusionAliases))for(const raw of [category,...terms]){const term=norm(raw);if(!term)continue;const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\ /g,'\\s+');if(new RegExp(`(?:nao quero|nao seja|sem|evitar|excluir|menos|exceto|tirando)\\s+(?:um\\s+|uma\\s+)?(?:[^ ]+\\s+){0,2}${escaped}(?:\\s|$)`).test(n)){categories.push(category);break}}
  return{categories:[...new Set(categories)],groups:[...new Set(groups)]};
}
function detectIntent(text,ctx={}){const n=norm(text);if(intentPatterns.RESET_ALL.test(n))return'RESET_ALL';if(intentPatterns.COMPARE_RESULTS.test(n)&&Array.isArray(ctx.lastResults)&&ctx.lastResults.length)return'COMPARE_RESULTS';if(intentPatterns.SELECT_RESULT.test(n)&&Array.isArray(ctx.lastResults)&&ctx.lastResults.length)return'SELECT_RESULT';if(intentPatterns.ASK_HOURS.test(n)&&ctx.selectedStore)return'ASK_HOURS';if(intentPatterns.ASK_DISTANCE.test(n)&&ctx.selectedStore)return'ASK_DISTANCE';if(intentPatterns.ASK_DELIVERY.test(n)&&ctx.selectedStore)return'ASK_DELIVERY';if(intentPatterns.ASK_PAYMENT.test(n)&&ctx.selectedStore)return'ASK_PAYMENT';if(intentPatterns.ASK_PRODUCTS.test(n)&&ctx.selectedStore)return'ASK_PRODUCTS';return null}
function detectProductOrSpecialty(text,taxResult){const n=norm(text);if(!taxResult?.matchedNormalized||taxResult.matchedType==='category'||taxResult.matchedType==='approximate')return{product:null,specialty:null};const term=taxResult.matchedNormalized;if(genericGroupTerms.has(term)||broadCategoryTerms.has(term))return{product:null,specialty:null};if(term.split(' ').length<=3&&n.includes(term))return{product:term,specialty:term};return{product:null,specialty:null}}
function confidenceFor({intent,taxResult,product,schedule,negations}){const fields={intent:intent?0.9:0.45,category:taxResult.category?(taxResult.matchedType==='approximate'?0.82:0.96):0,group:taxResult.group?(taxResult.matchedType==='approximate'?0.82:0.96):0,product:product?0.9:0,schedule:(schedule.day!==null||schedule.openNow||schedule.start!==null||schedule.end!==null)?0.94:0,negation:(negations.categories.length||negations.groups.length)?0.92:0};const vals=Object.values(fields).filter(v=>v>0);return{overall:vals.length?Number((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)):0.35,fields}}
export function analyzeQuery(text,{taxonomy:tax=taxonomy,state={}}={}){const n=norm(text),negations=detectNegatedTaxonomy(text,tax),taxResultRaw=detectTaxonomy(text,tax);const isNegated=negations.groups.includes(taxResultRaw.group)||negations.categories.includes(taxResultRaw.category);const taxResult=isNegated?{category:null,group:null,matchedTerm:null,matchedNormalized:null,matchedType:null}:taxResultRaw;let intent=detectIntent(text,state);const schedule=detectSchedule(text);const anyGroup=/\bqualquer\b|tanto faz|qualquer um|qualquer uma|qualquer tipo|pode ser qualquer/.test(n);if(!intent){const searchWords=/quero|procuro|preciso|achar|encontrar|comprar|loja|lugar|local|vende|venda/.test(n);const contextOnly=(schedule.day!==null||schedule.openNow||schedule.start!==null||schedule.end!==null||/mais perto|mais barata|com entrega|sem entrega/.test(n));intent=(taxResult.category||searchWords||contextOnly||anyGroup)?((state.lastResults||[]).length?'REFINE_SEARCH':'SEARCH'):(state.selectedStore?'ASK_STORE':'SEARCH')}const ps=detectProductOrSpecialty(text,taxResult);const filters={openNow:schedule.openNow,day:schedule.day,timeStart:schedule.start,timeEnd:schedule.end,timePeriod:schedule.period,delivery:/com entrega|delivery|entrega hoje/.test(n)?true:/sem entrega|nao quero entrega/.test(n)?false:null,pickup:/retirada|retirar na loja|buscar na loja/.test(n)?true:null,sortBy:/mais perto|mais proxima|mais proximo/.test(n)?'distancia':/mais barata|mais barato|menor preco/.test(n)?'preco':/melhor avaliada|melhor avaliacao|maior nota/.test(n)?'avaliacao':null};const confidence=confidenceFor({intent,taxResult,product:ps.product,schedule,negations});return{intent,category:taxResult.category,group:taxResult.group,matchedType:taxResult.matchedType,product:ps.product,specialty:ps.specialty,schedule,filters,negations,confidence,normalized:n,matchedTerm:taxResult.matchedTerm,clearGroup:anyGroup}}
window.LocalAITaxonomy={taxonomy,categoryAliases,functionalWords,mergeSynonymsIntoTaxonomy,analyzeQuery};