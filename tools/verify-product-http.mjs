// Contrôle local du build démarré avec npm run start ; aucune session ni secret.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const base = new URL(process.argv[2] || 'http://localhost:3013')
assert.ok(['localhost','127.0.0.1','[::1]'].includes(base.hostname), 'Utiliser uniquement un serveur local')
const response = path => fetch(new URL(path,base), { redirect: 'manual' })
const routes = JSON.parse(readFileSync('.next/server/app-paths-manifest.json','utf8'))
assert.ok(!Object.keys(routes).some(path=>/nouveau_old|generate_old|contacts\/rapide/.test(path)))
console.log('Routes anciennes absentes du manifeste de production')

const [home,notFound,legacy,manifest] = await Promise.all(['/', '/p3-page-inexistante', '/dashboard/contacts/rapide','/site.webmanifest'].map(response))
assert.equal(home.status,200)
const html = await home.text()
assert.equal(notFound.status,404);assert.match(await notFound.text(),/Page introuvable/)
assert.equal(legacy.status,308);assert.match(legacy.headers.get('location'),/\/dashboard\/contacts\/nouveau$/)
assert.equal(manifest.status,200)
const manifestData=await manifest.json()
const assets = new Set(['/og-image.png','/safari-pinned-tab.svg','/offline.html','/sw.js',...manifestData.icons.map(icon=>icon.src)])
function sources(folder) {
  return readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sources(join(folder,entry.name)):/\.(tsx|ts|css)$/.test(entry.name)?[join(folder,entry.name)]:[])
}
for(const file of [...sources('app'),...sources('components')]){
  const content=readFileSync(file,'utf8')
  for(const match of content.matchAll(/['"](\/[^'"\s]+\.(?:png|svg|ico|webmanifest))['"]/g))assets.add(match[1])
}
for(const match of html.matchAll(/href="([^"]+\.woff2[^"]*)"/g))assets.add(match[1].replaceAll('&amp;','&'))
for(const asset of assets){
  const result=await response(asset)
  assert.equal(result.status,200,asset)
  if(asset==='/og-image.png'){
    const png=Buffer.from(await result.arrayBuffer());assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630)
    assert.match(result.headers.get('content-type'),/image\/png/)
  } else if(asset==='/safari-pinned-tab.svg')assert.match(result.headers.get('content-type'),/image\/svg\+xml/)
  else if(asset==='/offline.html')assert.match(await result.text(),/Reconnectez-vous pour consulter vos contacts/)
}
console.log(`${assets.size} références d’assets accessibles ; image sociale 1200 × 630, Safari, PWA et polices`)
assert.doesNotMatch(html,/fonts\.googleapis\.com|fonts\.gstatic\.com/)
const cssFiles=sources('.next/static').filter(file=>file.endsWith('.css'))
assert.ok(cssFiles.some(file=>readFileSync(file,'utf8').includes('unicode-range')))
const protectedPage=await response('/dashboard/contacts');assert.equal(protectedPage.status,307);assert.match(protectedPage.headers.get('location'),/\/connexion$/)
assert.match(protectedPage.headers.get('cache-control'),/private, no-store/)
for(const endpoint of ['/api/envoyer-rappels','/api/cron/generate-notifications','/api/envoyer-newsletter','/api/evenements-mois'])assert.equal((await response(endpoint)).status,401,endpoint)
const diagnostic=await fetch(new URL('/api/cron/test-notifications',base),{method:'POST'});assert.equal(diagnostic.status,401)
console.log('404, redirection 308, protection serveur et refus des API sans authentification vérifiés')
