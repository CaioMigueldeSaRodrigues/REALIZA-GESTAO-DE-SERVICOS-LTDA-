export type RouteStop={id:string;city:string|null;scheduled_at:string|null;latitude:number|null;longitude:number|null;quantity_m3:number|null;vehicle_id:string|null;status:string;address:string};
export function distanceKm(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){
 const rad=Math.PI/180,dl=(b.longitude-a.longitude)*rad,dp=(b.latitude-a.latitude)*rad;
 const s=Math.sin(dp/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dl/2)**2;
 return 12742*Math.asin(Math.min(1,Math.sqrt(s)));
}
export function suggestSequence(orders:RouteStop[]){
 // Heurística: prioridade por data; vizinho mais próximo quando há latitude/longitude.
 const pending=orders.filter(o=>o.status!=='entregue'&&o.status!=='cancelada').slice().sort((a,b)=>
  (a.scheduled_at||'9999').localeCompare(b.scheduled_at||'9999'));
 if(!pending.length)return [];
 const path=[pending.shift()!];
 while(pending.length){
  const last=path[path.length-1];
  if(last.latitude==null||last.longitude==null){path.push(pending.shift()!);continue}
  const candidates=pending.map((x,i)=>({i,d:x.latitude!=null&&x.longitude!=null?
   distanceKm({latitude:last.latitude!,longitude:last.longitude!},{latitude:x.latitude,longitude:x.longitude}):Infinity}));
  candidates.sort((a,b)=>a.d-b.d);
  const n=candidates[0].d===Infinity?0:candidates[0].i;
  path.push(pending.splice(n,1)[0]);
 }
 return path;
}
