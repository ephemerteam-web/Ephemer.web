// 🧪 Tests locaux sans dépendance, sans .env et sans accès réseau (Node >= 22.13).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8')

// On évalue seulement les fonctions pures ; aucun client Supabase/Resend n'est importé.
function charger(source, noms, contexte = {}) {
  const javascript = stripTypeScriptTypes(source)
    .replace(/^import[^\n]+\n/gm, '')
    .replace(/^export /gm, '')
  return runInNewContext(`${javascript}\n;({ ${noms.join(', ')} })`, contexte)
}

const { echapperHtml } = charger(lire('lib/email-html.ts'), ['echapperHtml'])
const { genererEmailRappel, genererNewsletterMensuelle } = charger(
  lire('lib/email-templates.ts'),
  ['genererEmailRappel', 'genererNewsletterMensuelle'],
  { echapperHtml }
)

const contenuHostile = `<img src="x" onerror="alert('test')"> & Élise`

test('les caractères HTML sont neutralisés sans perdre les accents', () => {
  assert.equal(echapperHtml(`<>&"' Élise`), '&lt;&gt;&amp;&quot;&#39; Élise')
  assert.equal(echapperHtml(null), '')
  assert.equal(echapperHtml(undefined), '')
  assert.equal(echapperHtml(7), '7')
})

test('rappel : identité, message, expéditeur et titre restent du texte', () => {
  const html = genererEmailRappel({
    prenom: contenuHostile,
    nom: contenuHostile,
    typeEvenement: contenuHostile,
    message: contenuHostile,
    dateEnvoi: '2026-09-19',
    ton: null,
    expediteurNom: contenuHostile,
  })
  assert.doesNotMatch(html, /<img\b/i)
  assert.ok(html.includes(echapperHtml(contenuHostile)))
  assert.ok(html.includes('<table'))
  assert.ok(html.includes('https://ephemer.name/dashboard'))
})

test('newsletter : tous les champs des événements sont échappés', () => {
  const html = genererNewsletterMensuelle({
    prenomUtilisateur: contenuHostile,
    moisLibelle: contenuHostile,
    evenements: [{
      prenomContact: contenuHostile,
      nomContact: contenuHostile,
      typeEvenement: contenuHostile,
      jour: 19,
      emoji: contenuHostile,
    }],
  })
  assert.doesNotMatch(html, /<img\b/i)
  assert.ok(html.includes(echapperHtml(contenuHostile)))
  assert.ok(html.includes('<table'))
})

test('newsletter vide et texte français habituel restent lisibles', () => {
  const html = genererNewsletterMensuelle({
    prenomUtilisateur: "Élise D'Angelo",
    moisLibelle: 'septembre 2026',
    evenements: [],
  })
  assert.ok(html.includes('Élise D&#39;Angelo'))
  assert.ok(html.includes('Aucun événement ce mois-ci'))
  assert.ok(!html.includes('&amp;#39;'))
})

for (const route of ['generate-notifications', 'test-notifications']) {
  test(`récapitulatif ${route} : envoi simulé, branches urgentes et normales`, async () => {
    const source = lire(`app/api/cron/${route}/route.ts`)
    const debut = source.indexOf('async function sendRecapEmail(')
    assert.ok(debut >= 0)
    const envois = []
    const { sendRecapEmail } = charger(source.slice(debut), ['sendRecapEmail'], {
      echapperHtml,
      resend: { emails: { send: async (email) => {
        envois.push(email)
        return { data: { id: 'simulation' }, error: null }
      } } },
    })
    await sendRecapEmail({ email: 'simulation@example.invalid', prenom: contenuHostile }, [
      { contact: contenuHostile, date: contenuHostile, jours: 0 },
      { contact: contenuHostile, date: contenuHostile, jours: 7 },
    ])
    assert.equal(envois.length, 1)
    assert.doesNotMatch(envois[0].html, /<img\b/i)
    assert.ok(envois[0].html.includes(echapperHtml(contenuHostile)))
    assert.ok(envois[0].html.includes('J-0'))
    assert.ok(envois[0].html.includes('J-7'))
  })
}

test('ancien endpoint : refus sans lecture du token, DB ou envoi, même en replay', async () => {
  const { POST } = charger(lire('app/api/invitation-notifier/route.ts'), ['POST'], { Response })
  for (let i = 0; i < 2; i++) {
    const reponse = await POST({ json: () => { throw new Error('Ne pas lire le token') } })
    assert.equal(reponse.status, 410)
    assert.equal(reponse.headers.get('cache-control'), 'no-store')
    assert.ok((await reponse.json()).error)
  }
})

test('le formulaire ne déclenche plus l’alerte publique et le QR tiers est absent', () => {
  assert.ok(!lire('app/invitation/[token]/FormulaireInvitation.tsx').includes("fetch('/api/invitation-notifier'"))
  assert.ok(!lire('app/dashboard/inviter/CarteInvitation.tsx').includes('api.qrserver.com'))
})
