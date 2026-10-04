// 🧪 Vrais handlers, base et Auth simulés : aucun compte réel ni accès réseau.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const lire = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const identifiant = 'utilisateur-verifie'

function serveur(options = {}) {
  const appels = []
  const tables = {
    contacts: [{ id: 1, user_id: identifiant }, { id: 2, user_id: 'autre' }],
    profiles: [{ id: identifiant }, { id: 'autre' }],
  }
  const comptes = new Set([identifiant, 'autre'])
  function erreur(etape) {
    if (options.exception === etape) throw new Error('Détail interne simulé')
    return options.echec === etape ? { code: 'SIMULATION', message: 'Détail interne simulé' } : null
  }
  const supabaseAdmin = {
    auth: {
      async getUser(token) {
        appels.push(['session', token])
        return { data: { user: options.sansUtilisateur ? null : { id: identifiant } }, error: erreur('session') }
      },
      admin: { async deleteUser(id) {
        appels.push(['auth', id])
        const error = erreur('auth')
        if (!error) comptes.delete(id)
        return { error }
      } },
    },
    from(table) {
      return { delete: () => ({ async eq(colonne, valeur) {
        appels.push([table, colonne, valeur])
        const error = erreur(table)
        if (!error) tables[table] = tables[table].filter(ligne => ligne[colonne] !== valeur)
        return { error }
      } }) }
    },
  }
  const source = stripTypeScriptTypes(lire('app/api/delete-account/route.ts'))
    .replace(/^import[^\n]+\n/gm, '').replace(/^export /gm, '')
  const { DELETE } = runInNewContext(`${source}\n;({ DELETE })`, {
    supabaseAdmin, NextResponse: Response, console: { error() {} },
  })
  const requete = (authorization = 'Bearer jeton-simule') => new Request('https://ephemer.invalid/api/delete-account', {
    method: 'DELETE', headers: authorization ? { Authorization: authorization } : {},
    body: JSON.stringify({ userId: 'autre' }),
  })
  return { DELETE, requete, appels, tables, comptes }
}

async function verifierEchec(reponse) {
  assert.equal(reponse.status, 500)
  const resultat = await reponse.json()
  assert.equal(resultat.success, undefined)
  assert.ok(resultat.error)
  assert.doesNotMatch(resultat.error, /Détail interne|SIMULATION/)
  return resultat.error
}

test('en-tête absent ou mal formé : aucun appel Supabase', async () => {
  for (const header of [null, 'Basic jeton-simule', 'Bearer', 'Bearer un deux', 'jeton-simule']) {
    const h = serveur()
    assert.equal((await h.DELETE(h.requete(header))).status, 401)
    assert.equal(h.appels.length, 0)
  }
})

test('session invalide ou utilisateur absent : aucune suppression', async () => {
  for (const options of [{ echec: 'session' }, { sansUtilisateur: true }]) {
    const h = serveur(options)
    assert.equal((await h.DELETE(h.requete())).status, 401)
    assert.deepEqual(h.appels, [['session', 'jeton-simule']])
    assert.ok(h.comptes.has(identifiant))
    assert.equal(h.tables.contacts.length, 2)
    assert.equal(h.tables.profiles.length, 2)
  }
})

test('erreur contacts : profil et Auth conservés, aucun faux succès', async () => {
  const h = serveur({ echec: 'contacts' })
  await verifierEchec(await h.DELETE(h.requete()))
  assert.deepEqual(h.appels.map(a => a[0]), ['session', 'contacts'])
  assert.equal(h.tables.profiles.length, 2)
  assert.equal(h.tables.contacts.length, 2)
  assert.ok(h.comptes.has(identifiant))
})

test('erreur profil : Auth conservé, contacts supprimés annoncés', async () => {
  const h = serveur({ echec: 'profiles' })
  const message = await verifierEchec(await h.DELETE(h.requete()))
  assert.match(message, /contacts ont été supprimés/)
  assert.match(message, /compte reste actif/)
  assert.deepEqual(h.appels.map(a => a[0]), ['session', 'contacts', 'profiles'])
  assert.equal(h.tables.contacts.length, 1)
  assert.equal(h.tables.profiles.length, 2)
  assert.ok(h.comptes.has(identifiant))
})

test('erreur Auth : nettoyage partiel annoncé, aucun faux succès', async () => {
  const h = serveur({ echec: 'auth' })
  const message = await verifierEchec(await h.DELETE(h.requete()))
  assert.match(message, /profil et tes contacts ont été supprimés/)
  assert.equal(h.tables.contacts.length, 1)
  assert.equal(h.tables.profiles.length, 1)
  assert.ok(h.comptes.has(identifiant))
})

for (const etape of ['session', 'contacts', 'profiles', 'auth']) {
  test(`exception ${etape} : arrêt et résultat incertain correctement annoncé`, async () => {
    const h = serveur({ exception: etape })
    const message = await verifierEchec(await h.DELETE(h.requete()))
    const ordre = ['session', 'contacts', 'profiles', 'auth']
    assert.deepEqual(h.appels.map(a => a[0]), ordre.slice(0, ordre.indexOf(etape) + 1))
    if (etape === 'session') assert.doesNotMatch(message, /déjà avoir été supprimées/)
    else assert.match(message, /déjà avoir été supprimées/)
    assert.ok(h.comptes.has(identifiant))
  })
}

test('succès complet : ordre respecté et aucune donnée d’un autre utilisateur supprimée', async () => {
  const h = serveur()
  const reponse = await h.DELETE(h.requete('bearer jeton-simule'))
  assert.equal(reponse.status, 200)
  assert.deepEqual(await reponse.json(), { success: true })
  assert.deepEqual(h.appels, [
    ['session', 'jeton-simule'], ['contacts', 'user_id', identifiant],
    ['profiles', 'id', identifiant], ['auth', identifiant],
  ])
  assert.deepEqual(h.tables.contacts, [{ id: 2, user_id: 'autre' }])
  assert.deepEqual(h.tables.profiles, [{ id: 'autre' }])
  assert.deepEqual([...h.comptes], ['autre'])
})

test('reprise après chaque échec : des lignes déjà absentes ne bloquent pas la suppression', async () => {
  for (const etape of ['contacts', 'profiles', 'auth']) {
    const options = { echec: etape }
    const h = serveur(options)
    await verifierEchec(await h.DELETE(h.requete()))
    options.echec = null
    const reponse = await h.DELETE(h.requete())
    assert.equal(reponse.status, 200)
    assert.deepEqual(await reponse.json(), { success: true })
    assert.deepEqual(h.tables.contacts, [{ id: 2, user_id: 'autre' }])
    assert.deepEqual(h.tables.profiles, [{ id: 'autre' }])
    assert.deepEqual([...h.comptes], ['autre'])
  }
})

// Le gestionnaire du formulaire est évalué sans monter React ni importer le client réel.
function formulaire({ session = { access_token: 'jeton-simule' }, status = 200, body = { success: true }, panneReseau = false } = {}) {
  const appels = [], messages = [], chargement = []
  const source = lire('app/dashboard/profil/page.tsx')
  const debut = source.indexOf('  const handleDeleteAccount = async () => {')
  const fin = source.indexOf('// ÉTAT CHARGEMENT', debut)
  assert.ok(debut >= 0 && fin > debut)
  const { handleDeleteAccount } = runInNewContext(`${stripTypeScriptTypes(source.slice(debut, fin))}\n;({ handleDeleteAccount })`, {
    setDeleting: valeur => chargement.push(valeur), setMessage: message => messages.push(message),
    supabase: { auth: {
      getSession: async () => ({ data: { session } }),
      signOut: async () => { appels.push('deconnexion') },
    } },
    fetch: async () => {
      appels.push('requete')
      if (panneReseau) throw new Error('Réseau indisponible')
      return Response.json(body, { status })
    },
    router: { push: url => appels.push(url) },
  })
  return { handleDeleteAccount, appels, messages, chargement }
}

test('formulaire : session expirée, bouton réactivé sans requête ni déconnexion', async () => {
  const h = formulaire({ session: null })
  await h.handleDeleteAccount()
  assert.deepEqual(h.appels, [])
  assert.deepEqual(h.chargement, [true, false])
  assert.equal(h.messages.at(-1).type, 'error')
})

test('formulaire : erreur API, réseau ou succès absent, aucune redirection et nouvelle tentative possible', async () => {
  for (const options of [
    { status: 500, body: { error: 'La suppression est incomplète' } },
    { body: { success: false } }, { body: {} }, { panneReseau: true },
  ]) {
    const h = formulaire(options)
    await h.handleDeleteAccount()
    assert.deepEqual(h.appels, ['requete'])
    assert.deepEqual(h.chargement, [true, false])
    assert.equal(h.messages.at(-1).type, 'error')
    if (options.status === 500) assert.match(h.messages.at(-1).text, /suppression est incomplète/)
  }
})

test('formulaire : succès explicite, déconnexion puis retour à l’accueil', async () => {
  const h = formulaire()
  await h.handleDeleteAccount()
  assert.deepEqual(h.appels, ['requete', 'deconnexion', '/?deleted=true'])
  assert.deepEqual(h.chargement, [true, false])
})
