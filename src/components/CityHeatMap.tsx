'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {numberBr} from '@/lib/format';

export type HeatCity={city:string;state:string;demands:number;volume:number;orders:number;value:number};
type Pin=HeatCity&{lat:number;lon:number};
const normalize=(x:string)=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const world=(lat:number,lon:number,zoom:number)=>{
 const scale=256*Math.pow(2,zoom);
 const y=0.5-Math.log((1+Math.sin(lat*Math.PI/180))/(1-Math.sin(lat*Math.PI/180)))/(4*Math.PI);
 return {x:(lon+180)/360*scale,y:y*scale};
};
const near=(lat:number,lon:number)=>Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-34&&lat<=6&&lon>=-75&&lon<=-31;
const key=(c:HeatCity)=>normalize(c.city)+'|'+normalize(c.state);
const brazilStates:Record<string,string>={
 AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',
 ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',
 MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',
 RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',
 RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'
};
const maxPins=16;

export function CityHeatMap({cities,metric,onSelect}:{cities:HeatCity[];metric:'demands'|'volume';onSelect?:(city:string)=>void}){
 const [pins,setPins]=useState<Pin[]>([]);
 const [pending,setPending]=useState(false);
 const [size,setSize]=useState({w:720,h:360});
 const [center,setCenter]=useState({lat:-14.7,lon:-53.2,zoom:4});
 const mapRef=useRef<HTMLDivElement|null>(null);
 const citiesKey=useMemo(()=>cities.map(c=>key(c)).sort().join('~'),[cities]);
 const selected=cities.filter(c=>c.city&&c.city!=='Não informado').sort((a,b)=>b.demands-a.demands).slice(0,maxPins);
 useEffect(()=>{
  const node=mapRef.current;
  if(!node)return;
  const obs=new ResizeObserver(entries=>{
   const width=entries[0]?.contentRect.width||720;
   setSize({w:Math.max(width,280),h:width<540?300:360});
  });
  obs.observe(node);
  return()=>obs.disconnect();
 },[]);
 useEffect(()=>{
  let cancelled=false;
  async function geocode(){
   setPending(true);
   const results:Pin[]=[];
   for(const city of selected){
    if(cancelled)break;
    try{
     const qs=new URLSearchParams({name:city.city,count:'10',language:'pt',format:'json',countryCode:'BR'});
     const controller=new AbortController();
     const timeout=setTimeout(()=>controller.abort(),5000);
     let data:{results?:Array<{name:string;latitude:number;longitude:number;admin1?:string;country_code?:string}>};
     try{
      const res=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+qs,{signal:controller.signal});
      if(!res.ok)continue;
      data=await res.json();
     }finally{clearTimeout(timeout)}
     const matches=(data.results||[]).filter(c=>c.country_code==='BR'&&near(c.latitude,c.longitude));
     const exactMatches=matches.filter(c=>normalize(c.name)===normalize(city.city));
     const expected=brazilStates[city.state.toUpperCase()]||city.state;
     const matchingState=expected?exactMatches.filter(c=>normalize(c.admin1||'')===normalize(expected)):exactMatches;
     // UF desconhecida + localidades homônimas: não posicionar no município errado.
     const exact=matchingState.length===1?matchingState[0]:undefined;
     if(exact)results.push({...city,lat:exact.latitude,lon:exact.longitude});
    }catch{/* Cidade permanece no ranking se geocodificação indisponível. */}
   }
   if(!cancelled){setPins(results);setPending(false)}
  }
  setPins([]);void geocode();
  return()=>{cancelled=true};
 // A coordenada geográfica é independente das mudanças de contagem/volume.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[citiesKey]);
 const locations=pins.map(p=>{
  const updated=cities.find(c=>key(c)===key(p));
  return updated?{...p,...updated}:p;
 });
 const focus=world(center.lat,center.lon,center.zoom);
 const sizeMax=Math.pow(2,center.zoom);
 const startX=Math.floor((focus.x-size.w/2)/256);
 const endX=Math.ceil((focus.x+size.w/2)/256);
 const startY=Math.max(0,Math.floor((focus.y-size.h/2)/256));
 const endY=Math.min(sizeMax-1,Math.ceil((focus.y+size.h/2)/256));
 const tiles:{x:number;y:number;src:string;left:number;top:number}[]=[];
 for(let x=startX;x<endX;x++)for(let y=startY;y<=endY;y++){
  const wrapped=((x%sizeMax)+sizeMax)%sizeMax;
  tiles.push({
   x,y,src:'https://tile.openstreetmap.org/'+center.zoom+'/'+wrapped+'/'+y+'.png',
   left:x*256-focus.x+size.w/2,top:y*256-focus.y+size.h/2
  });
 }
 const strongest=Math.max(1,...locations.map(p=>Number(p[metric])||0));
 const unresolved=selected.length-locations.length;
 function zoom(delta:number){setCenter(c=>({...c,zoom:Math.max(3,Math.min(10,c.zoom+delta))}))}
 function reposition(pin:Pin){
  setCenter(c=>({lat:pin.lat,lon:pin.lon,zoom:Math.max(c.zoom,7)}));
  onSelect?.(pin.city);
 }
 return <div>
  <div className="heatmap-legend"><span><i className="heat-dot heat-low"/> Menor concentração</span><span><i className="heat-dot heat-high"/> Maior concentração</span><span>Agregado municipal · sem localização de clientes</span></div>
  <div ref={mapRef} className="city-map" style={{height:size.h}}>
   {tiles.map(t=><img key={t.x+'/'+t.y+'/'+center.zoom}
    src={t.src} alt="" loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
    className="city-map-tile" draggable={false}
    style={{left:t.left,top:t.top}}/>)}
   {locations.map(p=>{
    const pt=world(p.lat,p.lon,center.zoom);
    const left=pt.x-focus.x+size.w/2,top=pt.y-focus.y+size.h/2;
    if(left< -70||left>size.w+70||top< -70||top>size.h+70)return null;
    const measure=Math.max(0,Number(p[metric])||0);
    const radius=22+44*Math.sqrt(measure/strongest);
    return <button key={key(p)} className="city-map-pin" type="button"
     title={p.city+': '+numberBr(measure)+(metric==='volume'?' m³':' demandas')}
     aria-label={p.city+', '+numberBr(measure)+(metric==='volume'?' metros cúbicos':' demandas')+'. Ampliar mapa'}
     onClick={()=>reposition(p)} style={{
      left,top,width:radius,height:radius,
      background:'rgba(226,89,35,'+(0.2+0.52*(measure/strongest))+')',
      borderColor:'rgba(165,58,25,0.7)'
     }}>
     <span>{p.demands}</span>
    </button>;
   })}
   <div className="city-map-controls">
    <button type="button" onClick={()=>zoom(1)} aria-label="Ampliar mapa">+</button>
    <button type="button" onClick={()=>zoom(-1)} aria-label="Reduzir mapa">−</button>
    <button type="button" onClick={()=>setCenter({lat:-14.7,lon:-53.2,zoom:4})} aria-label="Mostrar Brasil">⌂</button>
   </div>
   {pending&&<span className="city-map-loading">Localizando municípios…</span>}
   <div className="city-map-attribution">
    © <a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a target="_blank" rel="noopener noreferrer" href="https://open-meteo.com/">Geocodificação Open-Meteo</a>
   </div>
  </div>
  {locations.length===0&&!pending&&<p className="dashboard-hint">Nenhuma cidade pôde ser localizada no mapa. Consulte os municípios no ranking abaixo.</p>}
  {unresolved>0&&!pending&&<p className="dashboard-hint">{unresolved} município(s) sem localização verificada permanecem no ranking; não foram inventadas coordenadas.</p>}
  <p className="dashboard-hint">Concentração baseada em dados registrados. O círculo representa o centro do município, não a posição de uma entrega.</p>
 </div>;
}
