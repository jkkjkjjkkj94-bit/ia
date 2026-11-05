import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://innziuzgtpfsiywqmies.supabase.co','sb_publishable_'+'fJB7zijdznI9ob9l9jSGlQ_6oU_J-d1');
const $=id=>document.getElementById(id);
const text=s=>String(s??'');
const el=(tag,cls,label)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(label!==undefined)x.textContent=text(label);return x};
const notice=s=>{$('message').textContent=text(s)};
const LAT_STEP=0.018,LNG_STEP=0.02;
const offsets=[[0,0],[LAT_STEP,0],[-LAT_STEP,0],[0,LNG_STEP],[0,-LNG_STEP],[LAT_STEP,LNG_STEP],[LAT_STEP,-LNG_STEP],[-LAT_STEP,LNG_STEP],[-LAT_STEP,-LNG_STEP]];
let session=null,googleMap=null,base=null,placesClass=null,markers=[],tracking=[],lastResults=[],busy=false;
async function authorized(){
 const {data:{session:active},error}=await sb.auth.getSession();
 if(error||!active?.user)return false;
 const {data:profile,error:pe}=await sb.from('local_ai_profiles').select('role').eq('user_id',active.user.id).maybeSingle();
 if(pe||profile?.role!=='admin')return false;
 session=active;return true;
}
function mapsUrl(placeId){
 return 'https://www.google.com/maps/search/?api=1&query=Salto%20de%20Pirapora%20SP&query_place_id='+encodeURIComponent(placeId);
}
async function loadTracking(){
 const {data,error}=await sb.from('guru_google_places_tracking').select('*').eq('city','Salto de Pirapora').order('created_at',{ascending:false}).limit(1000);
 if(error)throw error;
 tracking=data||[];$('trackingCount').textContent=tracking.length+' ID(s) armazenado(s)';
 const list=$('tracked');list.replaceChildren();
 if(!tracking.length){list.append(el('p','muted','Nenhum ID salvo. Execute uma busca e escolha um estabelecimento.'));return}
 for(const item of tracking){
  const div=el('article','entry'),label=el('h3','','ID: '+item.place_id),status=el('select');
  for(const [key,name] of Object.entries({identified:'Identificado',contacted:'Contatado',interested:'Interessado',verified:'Dados confirmados',discarded:'Descartado'})){
   const opt=el('option','',name);opt.value=key;status.append(opt)
  }
  status.value=item.status;
  const note=el('textarea');note.placeholder='Observação própria, sem copiar dados do Google Maps';note.value=item.notes||'';note.maxLength=1000;
  const row=el('div','row'),save=el('button','','Salvar acompanhamento'),remove=el('button','','Remover ID'),link=el('a','btn','Abrir no Google Maps');
  const register=el('a','btn','Cadastrar loja na GURU');register.href='admin.html?view=merchants';
  const details=el('button','','Ver ficha no Google Maps');details.type='button';
  details.onclick=async()=>{
   if(!placesClass){notice('Conecte sua chave do Google Maps antes de consultar a ficha pela API.');return}
   details.disabled=true;
   try{
    const place=new placesClass({id:item.place_id});
    await place.fetchFields({fields:['displayName','formattedAddress']});
    label.textContent=place.displayName||'Comércio sem nome';
    const existing=div.querySelector('.live-google-address');if(existing)existing.remove();
    div.insertBefore(el('p','muted live-google-address',place.formattedAddress||'Endereço não disponível'),status);
    notice('Ficha consultada no Google Maps. Confirme os dados com o responsável antes de cadastrar.');
   }catch(e){notice('Não foi possível consultar a ficha: '+e.message)}
   finally{details.disabled=false}
  };
  link.href=mapsUrl(item.place_id);link.target='_blank';link.rel='noopener noreferrer';
  save.onclick=async()=>{
   save.disabled=true;
   try{
    const {data,error}=await sb.from('guru_google_places_tracking').update({status:status.value,notes:note.value.trim()||null,updated_at:new Date().toISOString()}).eq('place_id',item.place_id).select('place_id').maybeSingle();
    if(error)throw error;if(!data)throw Error('Registro não encontrado.');
    notice('Acompanhamento atualizado.');await loadTracking();
   }catch(e){notice('Não foi possível salvar: '+e.message)}finally{save.disabled=false}
  };
  remove.onclick=async()=>{
   if(!window.confirm('Remover o ID desta lista de acompanhamento?'))return;
   remove.disabled=true;
   try{
    const {error}=await sb.from('guru_google_places_tracking').delete().eq('place_id',item.place_id);
    if(error)throw error;notice('ID removido.');await loadTracking();
   }catch(e){notice(e.message)}finally{remove.disabled=false}
  };
  row.append(link,details,register,save,remove);div.append(label,status,note,row);list.append(div);
 }
}
function loadGoogleScript(key){
 return new Promise((resolve,reject)=>{
  if(window.google?.maps?.importLibrary){resolve();return}
  const existing=document.getElementById('guru-google-maps-script');
  if(existing){reject(Error('Já existe uma tentativa de conexão. Atualize a página para trocar a chave.'));return}
  const script=document.createElement('script');
  script.id='guru-google-maps-script';script.async=true;
  script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=weekly&libraries=places';
  script.onload=()=>window.google?.maps?.importLibrary?resolve():reject(Error('SDK do Google Maps não carregou.'));
  script.onerror=()=>reject(Error('Não foi possível carregar o Google Maps. Verifique chave, APIs e restrição por domínio.'));
  document.head.append(script);
 });
}
$('connect').onclick=async()=>{
 const key=$('apiKey').value.trim();
 if(!key){notice('Informe uma chave Google Maps do seu Google Cloud.');return}
 const button=$('connect');button.disabled=true;
 try{
  await loadGoogleScript(key);
  const {Place}=await google.maps.importLibrary('places');
  const {Map}=await google.maps.importLibrary('maps');
  const {Geocoder}=await google.maps.importLibrary('geocoding');
  const geo=await new Geocoder().geocode({address:'Salto de Pirapora, São Paulo, Brasil'});
  if(!geo.results?.[0]?.geometry?.location)throw Error('Não foi possível localizar Salto de Pirapora.');
  base={lat:geo.results[0].geometry.location.lat(),lng:geo.results[0].geometry.location.lng()};
  placesClass=Place;
  googleMap=new Map($('map'),{center:base,zoom:13,streetViewControl:false,mapTypeControl:false,fullscreenControl:true});
  $('search').disabled=false;$('next').disabled=false;
  $('apiKey').value='';
  notice('Google Maps conectado. Selecione uma categoria e região para pesquisar.');
 }catch(e){notice('Erro na conexão: '+e.message);button.disabled=false}
};
function point(){
 if($('zone').value==='map'&&googleMap){const center=googleMap.getCenter();return {lat:center.lat(),lng:center.lng()}}
 const [dy,dx]=offsets[Number($('zone').value)||0];
 return {lat:base.lat+dy,lng:base.lng+dx};
}
async function search(){
 if(!placesClass||busy)return;
 busy=true;$('search').disabled=true;$('next').disabled=true;
 const center=point(),radius=Number($('radius').value)||2000,type=$('category').value;
 notice('Consultando Google Maps: '+$('category').selectedOptions[0].textContent+', '+$('zone').selectedOptions[0].textContent+'...');
 try{
  const {places}=await placesClass.searchNearby({
   fields:['id','displayName','formattedAddress','location','googleMapsURI'],
   locationRestriction:{center,radius},...(type?{includedPrimaryTypes:[type]}:{}),
   maxResultCount:20,rankPreference:$('rank').value
  });
  lastResults=(places||[]).filter(p=>p.id&&
   String(p.formattedAddress||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('salto de pirapora'));
  for(const marker of markers)marker.setMap(null);
  markers=[];googleMap.setCenter(center);googleMap.setZoom(13);
  const box=$('results');box.replaceChildren();
  if(!lastResults.length)box.append(el('p','muted','Nenhum estabelecimento com endereço em Salto de Pirapora encontrado nesta consulta.'));
  for(const p of lastResults){
   const card=el('article','entry');
   card.append(el('h3','',p.displayName||'Comércio sem nome'),el('p','',p.formattedAddress||'Endereço indisponível'));
   const link=el('a','btn','Abrir no Google Maps');
   link.href=p.googleMapsURI||mapsUrl(p.id);link.target='_blank';link.rel='noopener noreferrer';
   const saved=tracking.some(item=>item.place_id===p.id);
   const save=el('button',saved?'':'primary',saved?'Já acompanhado':'Acompanhar ID');
   save.disabled=saved;
   save.onclick=async()=>{
    save.disabled=true;
    try{
     const {error}=await sb.from('guru_google_places_tracking').upsert({
      place_id:p.id,city:'Salto de Pirapora',state_code:'SP',
      created_by:session.user.id,status:'identified'
     },{onConflict:'place_id',ignoreDuplicates:true});
     if(error)throw error;await loadTracking();save.textContent='Já acompanhado';
     notice('ID armazenado. As informações do lugar continuam sendo consultadas no Google Maps.');
    }catch(e){save.disabled=false;notice('Não foi possível registrar o ID: '+e.message)}
   };
   const row=el('div','row');row.append(link,save);card.append(row);box.append(card);
   if(p.location){
    const m=new google.maps.Marker({position:{lat:p.location.lat(),lng:p.location.lng()},map:googleMap,title:String(p.displayName||'Comércio')});
    markers.push(m);
   }
  }
  $('count').textContent=lastResults.length+' resultado(s) nesta consulta';
  notice('Busca concluída. Para ampliar a cobertura, alterne categorias e regiões; a lista não é exaustiva.');
 }catch(e){notice('Erro ao consultar a API Places: '+e.message)}
 finally{busy=false;$('search').disabled=false;$('next').disabled=false}
}
$('search').onclick=search;
$('next').onclick=()=>{
 const zone=$('zone');zone.selectedIndex=(zone.selectedIndex+1)%zone.options.length;
 search();
};
$('refresh').onclick=()=>loadTracking().catch(e=>notice(e.message));
if(await authorized()){
 $('work').classList.remove('hidden');
 try{await loadTracking()}catch(e){notice('Não foi possível carregar os IDs: '+e.message)}
}else $('unauth').style.display='block';
