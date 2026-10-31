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
    Roupas:['roupa','roupas','camiseta','camisa','calça','calca','vestido','moda','boutique','vestuário','vestuario']
  },
  Farmácia:{
    Farmácia:['farmácia','farmacia','drogaria','remédio','remedio','medicamento']
  },
  Mercado:{
    Mercado:['mercado','supermercado','mercearia','hortifruti']
  },
  Beleza:{
    Beleza:['beleza','salão','salao','barbearia','cabeleireiro','manicure','estética','estetica']
  },
  Tecnologia:{
    Tecnologia:['tecnologia','informática','informatica','celular','computador','notebook','eletrônico','eletronico','fone']
  },
  Serviços:{
    Serviços:['serviço','servico','serviços','servicos','assistência','assistencia','conserto','manutenção','manutencao']
  },
  'Pet shop':{
    'Pet shop':['pet','petshop','pet shop','ração','racao','veterinário','veterinario']
  },
  Automóveis:{
    Automóveis:['carro','automóvel','automovel','autopeças','autopecas','oficina','pneu']
  },
  Construção:{
    Construção:['construção','construcao','ferragem','tinta','material de construção','material de construcao']
  }
};

const intentPatterns={
  RESET_ALL:/nova busca|nova pesquisa|novo chat|nova conversa|comecar do zero|começar do zero|resetar|limpar contexto|limpar busca/,
  COMPARE_RESULTS:/compare|comparar|comparação|comparacao|qual.*melhor/,
  ASK_HOURS:/horário|horario|funcionamento|que horas|abre|fecha/,
  ASK_DISTANCE:/distância|distancia|quantos km|fica longe/,
  ASK_DELIVERY:/entrega|delivery|frete/,
  ASK_PAYMENT:/pix|pagamento|crédito|credito|débito|debito|dinheiro|cartão|cartao/,
  ASK_PRODUCTS:/produto|produtos|vende|preço|preco|valor|estoque|tamanho|tam\b/,
  SELECT_RESULT:/^\d+$|primeira|primeiro|segunda|segundo|terceira|terceiro|última|ultima|último|ultimo|mais barata|mais barato|mais perto|mais próxima|mais proxima|mais próximo|mais proximo/
};

export function mergeSynonymsIntoTaxonomy(baseTaxonomy,synonyms={}){
  const out=structuredClone(baseTaxonomy);
  if(!synonyms||typeof synonyms!=='object'||Array.isArray(synonyms))return out;
  for(const[key,values]of Object.entries(synonyms)){
    const all=[key,...(Array.isArray(values)?values:[])].filter(Boolean);
    let matched=false;
    for(const[category,groups]of Object.entries(out)){
      for(const[group,terms]of Object.entries(groups)){
        if(norm(group)===norm(key)){
          groups[group]=[...new Set([...terms,...all])];
          matched=true;
          break;
        }
      }
      if(matched)break;
    }
    if(matched)continue;
    const category=Object.keys(out).find(c=>norm(c)===norm(key));
    if(category){
      const group=Object.keys(out[category])[0]||category;
      out[category][group]=[...new Set([...(out[category][group]||[]),...all])];
    }
  }
  return out;
}

function detectTaxonomy(text,tax=taxonomy){
  const n=norm(text);
  let best=null;
  for(const[category,groups]of Object.entries(tax)){
    for(const[group,terms]of Object.entries(groups)){
      const candidates=[group,...terms].map(x=>({raw:x,n: norm(x)})).filter(x=>x.n);
      for(const term of candidates){
        if(n.includes(term.n)&&(!best||term.n.length>best.term.length))best={category,group,term:term.n};
      }
    }
  }
  return best?{category:best.category,group:best.group}: {category:null,group:null};
}

function detectIntent(text,ctx={}){
  const n=norm(text);
  if(intentPatterns.RESET_ALL.test(n))return'RESET_ALL';
  if(intentPatterns.COMPARE_RESULTS.test(n))return'COMPARE_RESULTS';
  if(intentPatterns.SELECT_RESULT.test(n)&&Array.isArray(ctx.lastResults)&&ctx.lastResults.length)return'SELECT_RESULT';
  if(intentPatterns.ASK_HOURS.test(n))return'ASK_HOURS';
  if(intentPatterns.ASK_DISTANCE.test(n)&&ctx.selectedStore)return'ASK_DISTANCE';
  if(intentPatterns.ASK_DELIVERY.test(n)&&ctx.selectedStore)return'ASK_DELIVERY';
  if(intentPatterns.ASK_PAYMENT.test(n)&&ctx.selectedStore)return'ASK_PAYMENT';
  if(intentPatterns.ASK_PRODUCTS.test(n)&&ctx.selectedStore)return'ASK_PRODUCTS';
  return null;
}

export function analyzeQuery(text,{taxonomy:tax=taxonomy,state={}}={}){
  const n=norm(text);
  const taxResult=detectTaxonomy(text,tax);
  let intent=detectIntent(text,state);
  if(!intent){
    const searchWords=/quero|procuro|preciso|achar|encontrar|comprar|loja/.test(n);
    intent=(taxResult.category||searchWords)?((state.lastResults||[]).length?'REFINE_SEARCH':'SEARCH'):(state.selectedStore?'ASK_STORE':'SEARCH');
  }
  const filters={
    openNow:/abert[oa]s? agora|aberto agora|aberta agora/.test(n),
    delivery:/com entrega|delivery|entrega hoje/.test(n)?true:/sem entrega|nao quero entrega/.test(n)?false:null,
    pickup:/retirada|retirar na loja|buscar na loja/.test(n)?true:null,
    sortBy:/mais perto|mais proxima|mais proximo/.test(n)?'distancia':/mais barata|mais barato|menor preco/.test(n)?'preco':/melhor avaliada|melhor avaliacao|maior nota/.test(n)?'avaliacao':null
  };
  return{intent,category:taxResult.category,group:taxResult.group,filters,normalized:n};
}

window.LocalAITaxonomy={taxonomy,mergeSynonymsIntoTaxonomy,analyzeQuery};
