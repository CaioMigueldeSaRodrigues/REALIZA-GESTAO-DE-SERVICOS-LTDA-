export const dynamic = 'force-dynamic';
export async function GET(){ return Response.json({ status:'ok', service:'realiza-web', timestamp:new Date().toISOString() }); }
