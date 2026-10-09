// Lectures et événements navigateur simulés, sans base ni fournisseur réel.
import test from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './ui-harness.mjs'
import { pageDatabase } from './p2-helpers.mjs'
import { A, B, idea } from './cadeaux-test-helpers.mjs'
const projection = () => ({ revision: 2, revisionRelation: 1, champs: { passions: 'Livres' } })
function environment() {
  const window = new EventTarget(), document = new EventTarget(), navigator = { onLine: true }; let tick
  window.setInterval = fn => { tick = fn; return 1 }; window.clearInterval = () => {}; document.visibilityState = 'visible'
  return { window, document, navigator, tick: () => tick() }
}
function sourceSetup() {
  const e = environment(); let value = projection(), deferred, failure = false, reads = 0, invalidations = 0
  const h = harness('lib/hooks/useCadeauxSource.ts', { extra: '\nexport function Probe(p) { return useCadeauxSource(p.owner,p.etoile,p.relation,p.invalidate) }', globals: e, overrides: {
    '@/lib/univers-data': { readUniversCadeaux: async (_owner, _star, signal) => { reads++; if (failure) throw new Error('403'); if (deferred) return deferred; assert.equal(signal.aborted, false); return structuredClone(value) } },
  } })
  const props = { owner: A, etoile: B, relation: 'relation-1', invalidate: () => invalidations++ }
  return { ...e, h, props, render: () => h.render(props, 'Probe'), set value(v) { value = v }, set deferred(v) { deferred = v }, set failure(v) { failure = v }, get reads() { return reads }, get invalidations() { return invalidations } }
}
test('10C état : choix par révision, actualisation focus/60s et effacement après modification', async () => {
  const s = sourceSetup(); s.render(); await s.h.flush(); let row = s.render(); assert.equal(row.fields.length, 0)
  row.setFields(['passions']); assert.equal(s.render().fields.length, 1)
  s.window.dispatchEvent(new Event('focus')); await s.h.flush(); assert.equal(s.render().fields.length, 1)
  s.value = { ...projection(), revision: 3, champs: { passions: 'Musique' } }; s.tick(); await s.h.flush()
  row = s.render(); assert.equal(row.projection.revision, 3); assert.equal(row.fields.length, 0); assert.equal(s.invalidations, 1); assert.equal(s.reads, 3); s.h.unmount()
})
test('10C état : hors ligne, masquage et perte d’accès effacent le contenu tiers', async () => {
  const s = sourceSetup(); s.render(); await s.h.flush(); s.render().setFields(['passions'])
  s.navigator.onLine = false; s.window.dispatchEvent(new Event('offline')); assert.equal(s.render().projection, null); assert.equal(s.render().fields.length, 0)
  s.navigator.onLine = true; s.window.dispatchEvent(new Event('online')); await s.h.flush(); assert.ok(s.render().projection)
  s.document.visibilityState = 'hidden'; s.document.dispatchEvent(new Event('visibilitychange')); assert.equal(s.render().projection, null)
  const count = s.reads; s.tick(); await s.h.flush(); assert.equal(s.reads, count)
  s.document.visibilityState = 'visible'; s.failure = true; s.document.dispatchEvent(new Event('visibilitychange')); await s.h.flush(); assert.equal(s.render().projection, null); s.h.unmount()
})
test('10C état : réponse ancienne après changement de compte/relation ignorée immédiatement', async () => {
  const s = sourceSetup(); s.render(); await s.h.flush(); s.render().setFields(['passions'])
  let finish; s.deferred = new Promise(resolve => { finish = resolve }); s.window.dispatchEvent(new Event('focus'))
  s.props.owner = B; s.props.etoile = A; s.props.relation = 'relation-2'
  assert.equal(s.render().projection, null); assert.equal(s.render().fields.length, 0)
  await s.h.flush(); s.h.unmount(); finish(projection()); await s.h.flush(); assert.equal(s.render().projection, null)
})
function generator(extraProps = {}) {
  const e = environment(), calls = [], social = { actives: [{ id: 'relation', etoile_id: B, identite: 'Polaris', revision: 1 }], associations: [{ contact_id: '7', etoile_id: B, relation_id: 'relation' }], error: '', offline: false }
  const db = pageDatabase({ contacts: [{ id: 7, user_id: A, prenom: 'Prénom privé', nom: '', relation: 'ami', note: 'Note privée', date_naissance: '2000-05-02' }] })
  db.auth = { getUser: async () => ({ data: { user: { id: A } } }), getSession: async () => ({ data: { session: { user: { id: A }, access_token: 'fake' } } }) }
  let fail = false, value = projection()
  const h = harness('components/GiftSuggestions.tsx', { globals: { ...e, fetch: async (_url, init) => { calls.push(JSON.parse(init.body)); return fail ? Response.json({ error: 'Panne fictive' }, { status: 502 }) : Response.json({ ideas: [idea] }) } }, overrides: {
    '@/components/DashboardUserContext': { useDashboardUser: () => ({ id: A }) }, '@/components/etoiles/EtoilesContext': { useEtoiles: () => social },
    '@/lib/univers-data': { readUniversCadeaux: async () => structuredClone(value) }, '@/lib/supabase-browser': { supabase: db },
    '@/components/ContactDraftProvider': { useContactDraft: () => ({ hasPrivateDraft: () => false }) },
  } })
  const props = { initialEtoileId: B, ...extraProps }, render = () => h.render(props, 'AccountGiftSuggestions')
  return { ...e, h, social, calls, render, set fail(v) { fail = v }, set value(v) { value = v } }
}
test('10C générateur : sans fiche, choix explicite et aucun texte social dans le corps navigateur', async () => {
  const s = generator(); s.render(); await s.h.flush(); s.render()
  s.h.find(n => n.props.projection).props.onChange(['passions']); s.render()
  await s.h.find(n => n.type === 'button' && s.h.text(n) === 'Trouver des idées').props.onClick(); await s.h.flush(); s.render()
  assert.equal(s.calls.length, 1); assert.deepEqual(s.calls[0].univers.champs, ['passions']); assert.equal(s.calls[0].contactId, undefined); assert.doesNotMatch(JSON.stringify(s.calls), /Livres|Note privée|Prénom privé/)
  assert.equal(s.h.find(n => 'projection' in n.props).props.fields.length, 0); s.h.unmount()
})
test('10C générateur : combinaison associée, échec efface les sélections et conserve le budget', async () => {
  const s = generator(); s.render(); await s.h.flush(); s.render()
  s.h.find(n => n.type === 'select' && n.props.value === '' && s.h.text(n).includes('Sans fiche contact')).props.onChange({ target: { value: '7' } }); s.render(); await s.h.flush(); s.render()
  s.h.find(n => n.props.title === 'Mes informations privées sur ce contact').props.onChange(['note']); s.h.find(n => n.props.projection).props.onChange(['passions'])
  s.h.find(n => n.type === 'input' && n.props.inputMode === 'decimal').props.onChange({ target: { value: '25' } }); s.render(); s.fail = true
  await s.h.find(n => n.type === 'button' && s.h.text(n) === 'Trouver des idées').props.onClick(); await s.h.flush(); s.render()
  assert.equal(s.calls[0].contactId, '7'); assert.deepEqual(s.calls[0].consentFields, ['note']); assert.equal(s.calls[0].univers.etoileId, B)
  assert.equal(s.h.find(n => n.props.title === 'Mes informations privées sur ce contact').props.fields.length, 0); assert.equal(s.h.find(n => 'projection' in n.props).props.fields.length, 0)
  assert.equal(s.h.find(n => n.type === 'input' && n.props.inputMode === 'decimal').props.value, '25'); s.h.unmount()
})
test('10C générateur : retrait ou perte d’association interdit la combinaison et efface la source', async () => {
  const s = generator(); s.render(); await s.h.flush(); s.render()
  s.h.find(n => n.type === 'select' && n.props.value === '' && s.h.text(n).includes('Sans fiche contact')).props.onChange({ target: { value: '7' } }); s.render(); await s.h.flush(); s.render()
  s.h.find(n => n.props.title === 'Mes informations privées sur ce contact').props.onChange(['note']); s.render()
  s.social.associations = []; s.render(); await s.h.flush(); s.render()
  assert.equal(s.h.find(n => 'projection' in n.props).props.projection, null); assert.equal(s.h.find(n => n.type === 'button' && s.h.text(n) === 'Trouver des idées').props.disabled, true)
  assert.equal(s.h.find(n => n.props.title === 'Mes informations privées sur ce contact').props.fields.length, 0)
  s.h.find(n => n.type === 'button' && s.h.text(n) === 'Continuer sans fiche contact').props.onClick(); s.render(); await s.h.flush(); s.render()
  assert.equal(s.h.nodes().some(n => n.props.title === 'Mes informations privées sur ce contact'), false)
  assert.equal(s.h.find(n => n.type === 'button' && s.h.text(n) === 'Trouver des idées').props.disabled, false); s.h.unmount()
})
test('10C générateur : lien étoile/contact incompatible ne change pas silencieusement le destinataire', async () => {
  const s = generator({ initialContactId: '7' }); s.social.associations = []
  s.render(); await s.h.flush(); s.render()
  assert.equal(s.h.find(n => n.type === 'select' && n.props.value === 'star:' + B).props.value, 'star:' + B)
  assert.equal(s.h.find(n => n.type === 'button' && s.h.text(n) === 'Trouver des idées').props.disabled, true)
  assert.equal(s.calls.length, 0); s.h.unmount()
})
test('10C générateur : étoile retirée identifiée dans le menu et recherche générale volontaire possible', async () => {
  const s = generator(); s.render(); await s.h.flush(); s.render(); s.social.actives = []; s.render(); await s.h.flush(); s.render()
  assert.equal(s.h.find(n => n.type === 'option' && s.h.text(n) === 'Étoile inaccessible').props.value, 'star:' + B)
  s.h.find(n => n.type === 'select' && n.props.value === 'star:' + B).props.onChange({ target: { value: '' } }); s.render(); await s.h.flush(); s.render()
  assert.equal(s.h.find(n => n.type === 'button' && s.h.text(n) === 'Trouver des idées').props.disabled, false)
  assert.equal(s.h.nodes().some(n => n.props.projection), false); s.h.unmount()
})
