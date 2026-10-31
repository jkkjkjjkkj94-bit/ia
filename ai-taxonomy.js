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
  Roupas:{Roupas:['roupa','roupas','camiseta','camisa','calça','calca','vestido','moda','boutique','vestuário','vestuario']},
  Farmácia:{Farmácia:['farmácia','farmacia','drogaria','remédio','remedio','medicamento']},
  Mercado:{Mercado:['mercado','supermercado','mercearia','hortifruti']},
  Beleza:{Beleza:['beleza','salão','salao','barbearia','cabeleireiro','manicure','estética','estetica']},
  Tecnologia:{Tecnologia:['tecnologia','informática','informatica','celular','computador','notebook','eletrônico','eletronico','fone']},
  Serviços:{Serviços:['serviço','servico','serviços','servicos','assistência','assistencia','conserto','manutenção','manutencao']},
  'Pet shop':{'Pet shop':['pet','petshop','pet shop','ração','racao','veterinário','veterinario']},
  Automóveis:{Automóveis:['carro','automóvel','automovel','autopeças','autopecas','oficina','pneu']},
  Construção:{Construção:['construção','construcao','ferragem','tinta','material de construção','material de construcao']}
};

const categoryNames=Object.keys(taxonomy).map(norm);
export const functionalWords=new Set(['quero','queria','preciso','procuro','procurando','onde','achar','encontrar','comprar','loja','lojas','lugar','lugares','local','locais','estabelecimento','estabelecimentos','restaurante','uma','um','uns','umas','que','com','sem','ate','até','agora','perto','mais','menos','tamanho','entrega','delivery','nao','não','em','de','da','do','das','dos','estado','cidade','bairro','pagamento','retirada','promocao','promoção','oferta','desconto','vende','vendem','venda','vender','aberto','aberta','abertos','abertas','abre','abrir','fecha','fechar','funciona','funcionando','hoje','amanha','amanhã','depois','antes','partir','manha','manhã','tarde','noite','domingo','segunda','terca','terça','quarta','quinta','sexta','sabado','sábado','feira',...categoryNames]);

const intentPatterns={
  RESET_ALL:/nova busca|nova pesquisa|novo chat|nova conversa|comecar do zero|começar do zero|resetar|limpar contexto|limpar busca/,
  COMPARE_RESULTS:/compare|comparar|comparação|comparacao|qual.*melhor/,
  ASK_HOURS:/horário|horario|funcionamento|que horas|abre|fecha/,
  ASK_DISTANCE:/distância|distancia|quantos km|fica longe/,
  ASK_DELIVERY:/entrega|delivery|frete/,
  ASK_PAYMENT:/pix|pagamento|crédito|credito|débito|debito|dinheiro|cartão|cartao/,
  ASK_PRODUCTS:/produto|produtos|preço|preco|valor|estoque|tamanho|tam\b/,
  SELECT_RESULT:/^\d+$|primeira|primeiro|segunda|segundo|terceira|terceiro|última|ultima|último|ultimo|mais barata|mais barato|mais perto|mais próxima|mais proxima|mais próximo|mais proximo/
};

const weekDays={domingo:0,segunda:1,'segunda feira':1,terca:2,'terca feira':2,quarta:3,'quarta feira':3,quinta:4,'quinta feira':4,sexta:5,'sexta feira':5,sabado:6};
const genericGroupTerms=new Set(['pizzaria','hamburgueria','padaria','pastelaria','churrascaria','japonesa','comida japonesa','japones','oriental','marmita','doceria','confeitaria','sorveteria','acaiteria','roupas','farmacia','mercado','beleza','tecnologia','servicos','pet shop','automoveis','construcao']);

function tomorrowDay(){return(new Date().getDay()+1)%7}
function detectDay(text){const n=norm(text);if(/\bamanha\b/.test(n))return tomorrowDay();if(/\bhoje\b/.test(n))return new Date().getDay();for(const[name,num]of Object.entries(weekDays)){const p=name.replace(/ /g,'\\s+');if(new RegExp(`(?:^|\\s)${p}(?:\\s|$)`).test(n))return num}return null}
function hmToMinutes(h,m='0'){const hh=Number(h),mm=Number(m);return Number.isFinite(hh)&&hh>=0&&hh<=23&&Number.isFinite(mm)&&mm>=0&&mm<=59?hh*60+mm:null}
function detectSchedule(text){const n=norm(text),day=detectDay(text);let period=null,start=null,end=null,openNow=/abert[oa]s? agora|aberto agora|aberta agora/.test(n);
  if(/\bde manha\b|\bmanha\b/.test(n)){period='morning';start=6*60;end=12*60}
  else if(/\bde tarde\b|\btarde\b/.test(n)){period='afternoon';start=12*60;end=18*60}
  else if(/\ba noite\b|\bde noite\b|\bnoite\b/.test(n)){period='night';start=18*60;end=24*60-1}
  const after=n.match(/(?:depois das?|apos as?|após as?|a partir das?)\s*(\d{1,2})(?::(\d{2}))?\s*h?/);if(after){start=hmToMinutes(after[1],after[2]);period='after'}
  const before=n.match(/(?:antes das?|ate as?|até as?)\s*(\d{1,2})(?::(\d{2}))?\s*h?/);if(before){end=hmToMinutes(before[1],before[2]);period='before'}
  const exact=n.match(/(?:as|às)\s*(\d{1,2})(?::(\d{2}))?\s*h\b/);if(exact&&!after&&!before){start=hmToMinutes(exact[1],exact[2]);end=start;period='at'}
  return{day,openNow,period,start,end};
}

export function mergeSynonymsIntoTaxonomy(baseTaxonomy,synonyms={}){
  const out=structuredClone(baseTaxonomy);if(!synonyms||typeof synonyms!=='object'||Array.isArray(synonyms))return out;
  for(const[key,values]of Object.entries(synonyms)){const all=[key,...(Array.isArray(values)?values:[])].filter(Boolean);let matched=false;for(const[category,groups]of Object.entries(out)){for(const[group,terms]of Object.entries(groups)){if(norm(group)===norm(key)){groups[group]=[...new Set([...terms,...all])];matched=true;break}}if(matched)break}if(matched)continue;const category=Object.keys(out).find(c=>norm(c)===norm(key));if(category){const group=Object.keys(out[category])[0]||category;out[category][group]=[...new Set([...(out[category][group]||[]),...all])]}}
  return out;
}

function termRegex(term){return new RegExp(`(?:^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\ /g,'\\s+')}(?:\\s|$)`) }
function detectTaxonomy(text,tax=taxonomy){
  const n=norm(text);let best=null;
  for(const[category,groups]of Object.entries(tax))for(const[group,terms]of Object.entries(groups))for(const raw of [group,...terms]){const term=norm(raw);if(!term)continue;if(termRegex(term).test(n)&&(!best||term.length>best.term.length))best={category,group,term,raw,type:'group'}}
  for(const category of Object.keys(tax)){const term=norm(category);if(term&&termRegex(term).test(n)&&(!best||term.length>best.term.length))best={category,group:null,term,raw:category,type:'category'}}
  return best?{category:best.category,group:best.group,matchedTerm:best.raw,matchedNormalized:best.term,matchedType:best.type}:{category:null,group:null,matchedTerm:null,matchedNormalized:null,matchedType:null};
}
function detectNegatedTaxonomy(text,tax=taxonomy){const n=norm(text),categories=[],groups=[];for(const[category,gmap]of Object.entries(tax)){for(const[group,terms]of Object.entries(gmap)){for(const raw of [group,...terms]){const term=norm(raw);if(!term)continue;const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\ /g,'\\s+');if(new RegExp(`(?:nao quero|nao seja|sem|evitar|excluir)\\s+(?:um\\s+|uma\\s+)?(?:[^ ]+\\s+){0,2}${escaped}(?:\\s|$)`).test(n)){groups.push(group);categories.push(category);break}}}}return{categories:[...new Set(categories)],groups:[...new Set(groups)]}}
function detectIntent(text,ctx={}){const n=norm(text);if(intentPatterns.RESET_ALL.test(n))return'RESET_ALL';if(intentPatterns.COMPARE_RESULTS.test(n))return'COMPARE_RESULTS';if(intentPatterns.SELECT_RESULT.test(n)&&Array.isArray(ctx.lastResults)&&ctx.lastResults.length)return'SELECT_RESULT';if(intentPatterns.ASK_HOURS.test(n)&&ctx.selectedStore)return'ASK_HOURS';if(intentPatterns.ASK_DISTANCE.test(n)&&ctx.selectedStore)return'ASK_DISTANCE';if(intentPatterns.ASK_DELIVERY.test(n)&&ctx.selectedStore)return'ASK_DELIVERY';if(intentPatterns.ASK_PAYMENT.test(n)&&ctx.selectedStore)return'ASK_PAYMENT';if(intentPatterns.ASK_PRODUCTS.test(n)&&ctx.selectedStore)return'ASK_PRODUCTS';return null}
function detectProductOrSpecialty(text,taxResult){const n=norm(text);if(!taxResult?.matchedNormalized||taxResult.matchedType==='category')return{product:null,specialty:null};const term=taxResult.matchedNormalized;if(genericGroupTerms.has(term))return{product:null,specialty:null};if(term.split(' ').length<=3&&n.includes(term))return{product:term,specialty:term};return{product:null,specialty:null}}
function confidenceFor({intent,taxResult,product,schedule,negations}){const fields={intent:intent?0.9:0.45,category:taxResult.category?0.96:0,group:taxResult.group?0.96:0,product:product?0.9:0,schedule:(schedule.day!==null||schedule.openNow||schedule.start!==null||schedule.end!==null)?0.94:0,negation:(negations.categories.length||negations.groups.length)?0.92:0};const vals=Object.values(fields).filter(v=>v>0);return{overall:vals.length?Number((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)):0.35,fields}}

export function analyzeQuery(text,{taxonomy:tax=taxonomy,state={}}={}){
  const n=norm(text),negations=detectNegatedTaxonomy(text,tax),taxResultRaw=detectTaxonomy(text,tax);const isNegated=negations.groups.includes(taxResultRaw.group);const taxResult=isNegated?{category:null,group:null,matchedTerm:null,matchedNormalized:null,matchedType:null}:taxResultRaw;let intent=detectIntent(text,state);
  const schedule=detectSchedule(text);if(!intent){const searchWords=/quero|procuro|preciso|achar|encontrar|comprar|loja|lugar|local|vende|venda/.test(n);const contextOnly=(schedule.day!==null||schedule.openNow||schedule.start!==null||schedule.end!==null||/mais perto|mais barata|com entrega|sem entrega/.test(n));intent=(taxResult.category||searchWords||contextOnly)?((state.lastResults||[]).length?'REFINE_SEARCH':'SEARCH'):(state.selectedStore?'ASK_STORE':'SEARCH')}
  const ps=detectProductOrSpecialty(text,taxResult);
  const filters={openNow:schedule.openNow,day:schedule.day,timeStart:schedule.start,timeEnd:schedule.end,timePeriod:schedule.period,delivery:/com entrega|delivery|entrega hoje/.test(n)?true:/sem entrega|nao quero entrega|não quero entrega/.test(n)?false:null,pickup:/retirada|retirar na loja|buscar na loja/.test(n)?true:null,sortBy:/mais perto|mais proxima|mais proximo/.test(n)?'distancia':/mais barata|mais barato|menor preco/.test(n)?'preco':/melhor avaliada|melhor avaliacao|maior nota/.test(n)?'avaliacao':null};
  const confidence=confidenceFor({intent,taxResult,product:ps.product,schedule,negations});
  return{intent,category:taxResult.category,group:taxResult.group,matchedType:taxResult.matchedType,product:ps.product,specialty:ps.specialty,schedule,filters,negations,confidence,normalized:n,matchedTerm:taxResult.matchedTerm};
}

window.LocalAITaxonomy={taxonomy,functionalWords,mergeSynonymsIntoTaxonomy,analyzeQuery};
