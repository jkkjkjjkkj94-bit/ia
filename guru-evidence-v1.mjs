// GURU 5.3 — transparência de evidências do catálogo.
// Descreve apenas o que o sistema tem registrado; não valida disponibilidade em tempo real.
export function evidenceForStore(row={},data={}){
 const store=row.store||{};
 const products=Array.isArray(row.products)?row.products:[];
 const out=[];
 if(store.active===true&&store.status==='active')out.push('Estabelecimento ativo no cadastro da GURU.');
 if(store.delivery===true)out.push('Entrega informada no cadastro; condições devem ser confirmadas com a loja.');
 else out.push('Entrega não consta como disponível no cadastro.');
 if(Number.isFinite(row.distance)&&row.distance>=0)
  out.push('Distância aproximada em linha reta, calculada com coordenadas cadastradas.');
 else out.push('Distância não calculada para esta consulta.');
 if(Number.isFinite(row.reviewCount)&&row.reviewCount>0)
  out.push('Nota calculada a partir das avaliações registradas na GURU.');
 else out.push('Sem avaliações registradas para esta consulta.');
 if(products.length){
  out.push('Produtos listados no catálogo com estoque informado; disponibilidade pode mudar.');
 }else if(data.productsUnavailable===true){
  out.push('Não foi possível consultar o catálogo de produtos agora.');
 }else{
  out.push('Esta pesquisa não confirmou um produto específico no catálogo.');
 }
 return out;
}

export function evidenceForField(field,store={}){
 switch(field){
 case 'delivery':return store.delivery===true
  ?'Segundo as informações cadastradas, esta loja oferece entrega. Confirme a disponibilidade e as condições diretamente com ela.'
  :'A entrega não está cadastrada como disponível nesta loja.';
 case 'payment':return Array.isArray(store.payment_methods)&&store.payment_methods.length
  ?'Formas de pagamento informadas pela loja: '+store.payment_methods.join(', ')+'. Confirme antes de comprar.'
  :'As formas de pagamento não foram informadas no cadastro.';
 default:return '';
 }
}
