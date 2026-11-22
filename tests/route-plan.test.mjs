import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('roteirização tem função explícita e não depende de provedor externo',()=>{
 const source=readFileSync(new URL('../src/lib/route-plan.ts',import.meta.url),'utf8');
 assert.match(source,/suggestSequence/);
 assert.match(source,/distanceKm/);
 assert.doesNotMatch(source,/fetch\(/);
});
test('não publicar segredo no bundle público',()=>{
 const env=readFileSync(new URL('../.env.example',import.meta.url),'utf8');
 assert.match(env,/SUPABASE_SECRET_KEY=/);
 assert.doesNotMatch(env,/NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
});
