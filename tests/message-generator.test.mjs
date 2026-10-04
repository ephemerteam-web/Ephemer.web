import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const nativeRequire = createRequire(import.meta.url)
const contacts = [
  { id: 1, prenom: 'Élodie', nom: 'Durand', relation: 'famille', est_favori: false, email: null, date_naissance: '1990-05-12' },
  { id: 2, prenom: 'Zoé', nom: 'Martin', relation: 'pro', est_favori: true, email: 'zoe@example.invalid', date_naissance: null },
  { id: 3, prenom: null, nom: 'Albert', relation: 'inconnue', est_favori: false, email: null, date_naissance: null },
]

// Exécuter le vrai formulaire avec des hooks et un transport simulés, sans service externe.
function harness({ contactId = null, occasion = null, failContacts = false, contactData = contacts, deferContacts = false } = {}) {
  const slots = [], effects = [], modules = new Map(), requests = [], frames = []
  const documentMock = { activeElement: null }
  let releaseContacts
  const contactsWait = deferContacts ? new Promise(resolve => { releaseContacts = resolve }) : null
  let cursor = 0, currentTree, response = 'Bonne journée !', apiError = false, failLoad = failContacts, deferredResponse = null, releaseResponse
  const session = { access_token: 'test-only', user: { id: 'test-user' } }
  function useState(initial) {
    const index = cursor++
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
  }
  const hooks = {
    ...React,
    useState,
    useReducer(reducer, initial, init) {
      const [state] = useState(() => init ? init(initial) : initial)
      const index = cursor - 1
      return [state, action => { slots[index] = reducer(slots[index], action) }]
    },
    useRef(value) { return useState(() => ({ current: value }))[0] },
    useMemo(fn) { return fn() },
    useEffect(fn, deps) {
      const index = cursor++
      if (!slots[index] || deps.some((dep, i) => !Object.is(dep, slots[index][i]))) {
        slots[index] = deps
        effects.push(fn)
      }
    },
  }
  const supabase = {
    auth: { getSession: async () => ({ data: { session }, error: null }) },
    from(table) {
      assert.equal(table, 'contacts')
      return { select: () => ({ eq: (field, id) => {
        assert.equal(field, 'user_id'); assert.equal(id, session.user.id)
        return { order: async () => {
          if (contactsWait) await contactsWait
          return { data: failLoad ? null : contactData, error: failLoad ? { message: 'test' } : null }
        } }
      } }) }
    },
  }
  const overrides = {
    react: hooks,
    'next/navigation': { useSearchParams: () => new URLSearchParams({ ...(contactId ? { contactId } : {}), ...(occasion ? { eventType: occasion } : {}) }) },
    'next/link': { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) },
    '@/lib/supabase-browser': { supabase },
    '@/components/ProgrammerRappel': { default: props => React.createElement('div', { 'data-test-reminder': true, 'data-contact-id': props.selectedContact.id }) },
  }
  function load(path) {
    if (overrides[`@/${path}`]) return overrides[`@/${path}`]
    if (modules.has(path)) return modules.get(path)
    const file = path.endsWith('.tsx') || path.endsWith('.ts') ? path : `${path}.ts`
    let source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    if (file === 'app/dashboard/generate/page.tsx') source += '\nexport { GenerateForm, GenerateFromUrl };'
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
    const compiledModule = { exports: {} }
    modules.set(path, compiledModule.exports)
    const localRequire = name => {
      if (overrides[name]) return overrides[name]
      if (name.startsWith('@/')) return load(name.slice(2))
      if (name.startsWith('.')) return load(new URL(name, `https://test/${file}`).pathname.slice(1))
      return nativeRequire(name)
    }
    runInNewContext(compiled, { exports: compiledModule.exports, module: compiledModule, require: localRequire, URLSearchParams, console, DOMException, process: { env: {} },
      setTimeout, clearTimeout, document: documentMock, requestAnimationFrame: fn => { frames.push(fn); return frames.length },
      window: { matchMedia: () => ({ matches: false }) },
      fetch: async (url, options) => {
        assert.equal(url, '/api/generate-message')
        requests.push(JSON.parse(options.body))
        if (deferredResponse) await deferredResponse
        return { ok: !apiError, json: async () => apiError ? { error: 'Essai refusé' } : { message: response } }
      },
    })
    return compiledModule.exports
  }
  const form = load('app/dashboard/generate/page.tsx')
  function render() { cursor = 0; currentTree = form.GenerateForm({ contactId, initialOccasion: occasion }); return currentTree }
  function nodes(node = currentTree) {
    if (!React.isValidElement(node)) return []
    return [node, ...React.Children.toArray(node.props.children).flatMap(child => nodes(child))]
  }
  function text(node) {
    if (Array.isArray(node)) return node.map(text).join('')
    return React.isValidElement(node) ? text(node.props.children) : node == null ? '' : String(node)
  }
  function find(predicate) { const node = nodes().find(predicate); assert.ok(node, 'Élément attendu absent'); return node }
  async function start() {
    render()
    effects.splice(0).forEach(fn => fn())
    await new Promise(resolve => setImmediate(resolve))
    render()
  }
  function click(label) { find(node => node.type === 'button' && text(node) === label).props.onClick(); render() }
  return { start, render, find, text, click, requests,
    document: documentMock,
    flushFrames() { frames.splice(0).forEach(fn => fn()) },
    html: () => renderToStaticMarkup(currentTree),
    helpers: () => load('lib/message-generator'),
    prefilledProps: () => form.GenerateFromUrl().props,
    async generate() { await find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve)); render() },
    setApiFailure() { apiError = true },
    allowContacts() { failLoad = false },
    setResponse(value) { response = value },
    deferResponse() { deferredResponse = new Promise(resolve => { releaseResponse = resolve }) },
    async releaseResponse() { releaseResponse(); await new Promise(resolve => setImmediate(resolve)); render() },
    async releaseContacts() { releaseContacts(); await new Promise(resolve => setImmediate(resolve)); render() },
  }
}

test('recherche sans accents, favoris en premier et champs absents', () => {
  const { searchGeneratorContacts, contactDisplayName } = harness().helpers()
  assert.equal(searchGeneratorContacts(contacts, ' ELODIE ')[0].id, 1)
  assert.deepEqual(searchGeneratorContacts(contacts, '').map(c => c.id), [2, 3, 1])
  assert.equal(contactDisplayName(contacts[2]), 'Albert')
})

test('lien prérempli, ton professionnel et aucun champ personnel envoyé à l’API', async () => {
  const h = harness({ contactId: '2', occasion: 'mariage' })
  await h.start()
  assert.equal(h.prefilledProps().contactId, '2')
  assert.equal(h.find(n => n.props.id === 'message-tone').props.value, 'formel')
  assert.equal(h.find(n => n.props.id === 'other-occasion').props.value, 'mariage')
  assert.equal(h.find(n => n.type === 'details' && h.text(n.props.children[0]).startsWith('Personnaliser')).props.open, undefined)
  await h.generate()
  assert.equal(h.find(n => n.props.id === 'generated-message').props.value, 'Zoé, Bonne journée !')
  assert.deepEqual(h.requests, [{ eventType: 'mariage', relation: 'pro', tone: 'formel' }])
  assert.ok(!h.html().includes('type="number"'))
})

test('prénom libre : génération sans date, sans création de contact ni programmation', async () => {
  const h = harness({ occasion: 'valeur-invalide' })
  await h.start()
  h.click('Saisir un prénom')
  h.find(n => n.props.id === 'free-firstname').props.onChange({ target: { value: ' Alice ' } }); h.render()
  await h.generate()
  assert.equal(h.find(n => n.props.id === 'generated-message').props.value, 'Alice, Bonne journée !')
  assert.deepEqual(h.requests[0], { eventType: 'anniversaire', relation: 'ami', tone: 'familier' })
  assert.ok(!h.html().includes('data-test-reminder'))
  assert.match(h.html(), /Pour programmer un rappel, choisis un contact enregistré/)
})

test('échec d’une nouvelle version : message édité conservé ; un changement de ton efface le résultat', async () => {
  const h = harness({ contactId: '1' })
  await h.start(); await h.generate()
  h.find(n => n.props.id === 'generated-message').props.onChange({ target: { value: 'Mon texte modifié' } }); h.render()
  h.setApiFailure(); await h.generate()
  assert.equal(h.find(n => n.props.id === 'generated-message').props.value, 'Mon texte modifié')
  assert.match(h.html(), /Ton message précédent est conservé/)
  h.find(n => n.props.id === 'message-tone').props.onChange({ target: { value: 'humoristique' } }); h.render()
  assert.ok(!h.html().includes('generated-message'))
})

test('erreur contacts et réessai, puis remplacement du destinataire', async () => {
  const h = harness({ contactId: '1', failContacts: true })
  await h.start()
  assert.match(h.html(), /Impossible de charger tes contacts/)
  h.allowContacts(); h.click('Réessayer'); await h.start(); await h.generate()
  assert.match(h.html(), /data-contact-id="1"/)
  h.click('Changer')
  assert.ok(!h.html().includes('generated-message'))
  h.find(n => n.type === 'button' && h.text(n).includes('Zoé')).props.onClick(); h.render()
  assert.equal(h.find(n => n.props.id === 'message-tone').props.value, 'formel')
})

test('un contact sans prénom et une relation inconnue ne bloquent pas la génération', async () => {
  const h = harness({ contactId: '3' })
  await h.start(); await h.generate()
  assert.equal(h.requests[0].relation, 'autre')
  assert.equal(h.find(n => n.props.id === 'generated-message').props.value, 'Bonne journée !')
})

test('les réglages sont verrouillés pendant la requête et le formulaire refuse un prénom vide', () => {
  const { initialGeneratorState, generatorReducer, canGenerate } = harness().helpers()
  let state = generatorReducer(initialGeneratorState(), { type: 'manual' })
  assert.equal(canGenerate(state), false)
  state = generatorReducer(state, { type: 'name', value: '  ' })
  assert.equal(canGenerate(state), false)
  state = generatorReducer(state, { type: 'contact', contact: contacts[0] })
  state = generatorReducer(state, { type: 'begin' })
  const locked = state
  for (const action of [{ type: 'contact', contact: contacts[1] }, { type: 'tone', value: 'formel' }, { type: 'occasion', value: 'mariage' }, { type: 'clear' }]) assert.equal(generatorReducer(state, action), locked)
})

test('pendant la requête : champs désactivés et un double envoi ne déclenche pas un second appel', async () => {
  const h = harness({ contactId: '1' })
  await h.start(); h.deferResponse(); await h.generate()
  assert.equal(h.find(n => n.type === 'fieldset').props.disabled, true)
  assert.equal(h.find(n => n.type === 'button' && n.props.type === 'submit').props.disabled, true)
  await h.generate()
  assert.equal(h.requests.length, 1)
  await h.releaseResponse()
  assert.equal(h.find(n => n.type === 'fieldset').props.disabled, false)
})

test('effacer le message laisse l’éditeur ouvert pour réécrire, sans permettre un rappel vide', async () => {
  const h = harness({ contactId: '1' })
  await h.start(); await h.generate()
  h.find(n => n.props.id === 'generated-message').props.onChange({ target: { value: '' } }); h.render()
  assert.equal(h.find(n => n.props.id === 'generated-message').props.value, '')
  assert.ok(!h.html().includes('data-test-reminder'))
  h.find(n => n.props.id === 'generated-message').props.onChange({ target: { value: 'Mon nouveau texte' } }); h.render()
  assert.equal(h.find(n => n.props.id === 'generated-message').props.value, 'Mon nouveau texte')
})

test('les dates de fête et les avertissements e-mail apparaissent seulement dans le panneau de rappel fermé', async () => {
  const h = harness({ contactId: '1', occasion: 'fete_prenomale' })
  await h.start()
  assert.ok(!h.html().includes('preferred-feast'))
  await h.generate()
  assert.equal(h.find(n => n.props.id === 'preferred-feast').props.value, '')
  const panel = h.find(n => n.type === 'details' && h.text(n.props.children[0]) === 'Programmer un rappel')
  assert.equal(panel.props.open, undefined)
  assert.match(h.html(), /Ce contact n’a pas d’adresse e-mail/)
})

test('états sans contact, contact du lien absent, absence de résultat et nom très long', async () => {
  const empty = harness({ contactId: 'inexistant', contactData: [] })
  await empty.start()
  assert.match(empty.html(), /Tu n’as pas encore de contact/)
  assert.match(empty.html(), /Ce contact n’est plus disponible/)
  const h = harness({ contactData: [{ ...contacts[0], prenom: 'Alex'.repeat(60) }] })
  await h.start()
  const searchInput = h.find(n => n.props.id === 'contact-search')
  searchInput.props.onChange({ target: { value: 'absent' } }); h.render()
  assert.match(h.html(), /Aucun contact trouvé/)
  h.find(n => n.props.id === 'contact-search').props.onChange({ target: { value: '' } }); h.render()
  const choice = h.find(n => n.type === 'button' && h.text(n).includes('AlexAlex'))
  assert.match(choice.props.className, /min-w-0/)
  assert.ok(h.html().includes('truncate'))
  assert.match(h.find(n => n.type === 'div').props.className, /max-w-full/)
})

test('clavier : flèches parcourent les contacts et Échap referme la liste en revenant à la recherche', async () => {
  const h = harness()
  await h.start()
  const search = h.find(n => n.props.id === 'contact-search')
  search.props.onFocus(); h.render()
  const inputElement = { focus() { h.document.activeElement = inputElement; search.props.onFocus() } }
  const buttons = Array.from({ length: 3 }, () => ({ focus() { h.document.activeElement = this } }))
  search.props.ref.current = inputElement
  const list = h.find(n => n.props.id === 'contact-results')
  list.props.ref.current = { querySelectorAll: () => buttons, querySelector: () => buttons[0] }
  search.props.onKeyDown({ key: 'ArrowDown', preventDefault() {} }); h.render(); h.flushFrames()
  assert.equal(h.document.activeElement, buttons[0])
  list.props.onKeyDown({ key: 'ArrowDown', preventDefault() {} })
  assert.equal(h.document.activeElement, buttons[1])
  list.props.onKeyDown({ key: 'ArrowUp', preventDefault() {} })
  assert.equal(h.document.activeElement, buttons[0])
  list.props.onKeyDown({ key: 'Escape' }); h.render()
  assert.equal(h.document.activeElement, inputElement)
  assert.ok(!h.html().includes('id="contact-results"'))
})

test('un contact prérempli arrivé tardivement ne remplace pas le prénom libre déjà choisi', async () => {
  const h = harness({ contactId: '2', deferContacts: true })
  await h.start()
  h.click('Saisir un prénom')
  h.find(n => n.props.id === 'free-firstname').props.onChange({ target: { value: 'Alice' } }); h.render()
  await h.generate(); await h.releaseContacts()
  assert.equal(h.find(n => n.props.id === 'free-firstname').props.value, 'Alice')
  assert.equal(h.find(n => n.props.id === 'generated-message').props.value, 'Alice, Bonne journée !')
  assert.ok(!h.html().includes('data-test-reminder'))
})
