export const brl=(v:number|string|null|undefined)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
export const numberBr=(v:number|string|null|undefined)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(Number(v||0));
export function dateBr(v:string|null|undefined){return v?new Date(v).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—'}
export function dateTimeBr(v:string|null|undefined){return v?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—'}
export function isoDay(){return new Date().toISOString().slice(0,10)}
