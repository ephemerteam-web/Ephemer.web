// 🌐 Recette HTTP réelle du build local, exclusivement en lecture et sans session.
// npm run start -- --hostname 127.0.0.1 --port 3218 ; node tests/cards-http-check.mjs
import assert from 'node:assert/strict'
const origin='http://127.0.0.1:3218'
function privateHeaders(response){
  assert.match(response.headers.get('cache-control'),/no-store/)
  assert.equal(response.headers.get('referrer-policy'),'no-referrer')
  assert.match(response.headers.get('x-robots-tag'),/noindex/)
}
for(const headers of [{},{RSC:'1'}]){
  const response=await fetch(origin+'/carte',{headers});assert.equal(response.status,200);privateHeaders(response)
  assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/)
  const shell=await response.text();assert.doesNotMatch(shell,/secretHash|encryptedSecret|Publié|BROUILLON/)
  if(!headers.RSC){assert.match(shell,/<meta name="robots" content="noindex, nofollow, noarchive"/);assert.match(shell,/<meta property="og:title" content="Une carte pour toi/)}
}
for(const body of [{secret:'A'.repeat(43)},{secret:'malformed'},{}]){
  const response=await fetch(origin+'/api/cartes/consulter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  privateHeaders(response);assert.equal(response.status,404);assert.deepEqual(await response.json(),{error:'Cette carte est indisponible'})
}
const get=await fetch(origin+'/api/cartes/consulter');assert.equal(get.status,405);privateHeaders(get)
for(const path of ['/api/cartes/export-liens','/api/cartes/00000000-0000-0000-0000-000000000000/lien']){
  const response=await fetch(origin+path);assert.equal(response.status,401);privateHeaders(response)
}
console.log('HTTP_CARTES_OK : shell HTML/RSC générique, headers privés, secret inconnu refusé et routes du propriétaire protégées. Aucune écriture distante.')
