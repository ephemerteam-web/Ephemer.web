import test from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './ui-harness.mjs'
const copy = v => JSON.parse(JSON.stringify(v))
const c = harness('lib/univers-contract.ts', { globals: { TextEncoder } }).component
const initial = c.universInitial
c.universInitial = name => ({ ...initial(name), iaCadeaux: { identite: false, presentation: false, passions: false, plaisirs: false, eviter: false } })
function setup() {
  const window = new EventTarget(), document = new EventTarget(), navigator = { onLine: true }
  window.setInterval = () => 1; window.clearInterval = () => {}; document.visibilityState = 'visible'
  let row = copy(c.universInitial('Lune')), count = 0, fail = false, lost = false, conflict = false
  const commands = [], operations = new Map(), registrations = [], confirmations = []
  const api = { lire: async owner => { assert.equal(owner, 'compte-a'); return copy(row) }, commander: async (owner, command) => {
    commands.push(copy(command)); assert.equal(owner, 'compte-a')
    if (fail) { fail = false; throw new Error('Panne avant écriture') }
    if (conflict) { row.revision++; row.identite = 'Autre onglet'; throw new Error('Conflit') }
    if (!operations.has(command.operation)) {
      row = command.action === 'enregistrer' ? { ...copy(command.donnees), revision: row.revision + 1 } : { ...row, revision: row.revision + (row.revision ? 1 : 0), partage: copy(c.PARTAGE_UNIVERS_VIDE), iaCadeaux: { ...row.iaCadeaux, presentation: false, passions: false, plaisirs: false, eviter: false } }
      operations.set(command.operation, { ok: true, revision: row.revision })
    }
    if (lost) { lost = false; throw new Error('Réponse perdue') }
    return copy(operations.get(command.operation))
  } }
  const h = harness('components/univers/UniversForm.tsx', { globals: { window, document, navigator, TextEncoder, AbortController, Error, crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++count).padStart(12, '0')}` } },
    overrides: { '@/components/ContactDraftProvider': { useContactDraft: () => ({ confirm: async text => { confirmations.push(text); return true }, registerPrivateDraft: (id, dirty) => registrations.push(dirty) }) } } })
  const props = { ownerId: 'compte-a', api }
  const render = () => h.render(props, 'AccountUniversForm')
  const edit = mutator => { const node = h.find(n => !!n.props.draft && !!n.props.onChange), value = copy(node.props.draft); mutator(value); node.props.onChange(value); render() }
  const click = async label => { h.find(n => n.type === 'button' && h.text(n) === label).props.onClick(); await h.flush(); render() }
  return { h, api, commands, registrations, confirmations, render, edit, click, window, document, navigator, set fail(v) { fail = v }, set lost(v) { lost = v }, set conflict(v) { conflict = v }, get row() { return row } }
}
const save = 'Enregistrer mes informations et mon partage', mask = 'Masquer toutes mes informations facultatives'
async function loaded() { const s = setup(); s.render(); await s.h.flush(); s.render(); return s }
test('univers formulaire : saisie privée jusqu’au clic ; sauvegarde avec relecture', async () => {
  const s = await loaded(); s.edit(v => { v.valeurs.passions = 'Musique'; v.partage.passions = true })
  assert.equal(s.commands.length, 0); assert.ok(s.h.text().includes('Modifications non enregistrées'))
  await s.click(save); assert.equal(s.commands.length, 1); assert.equal(s.row.revision, 1); assert.ok(s.h.text().includes('sont enregistrés'))
  s.h.unmount()
})
test('univers formulaire : erreur préserve la saisie et même UUID au retry', async () => {
  const s = await loaded(); s.edit(v => { v.valeurs.eviter = 'Texte conservé' }); s.fail = true
  await s.click(save); assert.ok(s.h.text().includes('Panne avant écriture')); assert.equal(s.h.find(n => !!n.props.draft).props.draft.valeurs.eviter, 'Texte conservé')
  await s.click(save); assert.equal(s.commands[0].operation, s.commands[1].operation); assert.equal(s.row.revision, 1); s.h.unmount()
})
test('univers formulaire : réponse perdue reconnue par lecture, sans deuxième écriture', async () => {
  const s = await loaded(); s.edit(v => { v.valeurs.presentation = 'Bonjour' }); s.lost = true
  await s.click(save); assert.equal(s.commands.length, 1); assert.equal(s.row.revision, 1); assert.ok(s.h.text().includes('sont enregistrés')); s.h.unmount()
})
test('univers formulaire : double clic sérialisé ; masquage conserve saisies et valeurs enregistrées', async () => {
  const s = await loaded(); s.edit(v => { v.valeurs.passions = 'Privé enregistré'; v.partage.passions = true; v.iaCadeaux.passions = true; v.iaCadeaux.identite = true })
  const button = s.h.find(n => n.type === 'button' && s.h.text(n) === save); button.props.onClick(); button.props.onClick(); await s.h.flush(); s.render()
  assert.equal(s.commands.length, 1)
  s.edit(v => { v.valeurs.passions = 'Brouillon non enregistré' }); await s.click(mask)
  assert.equal(s.row.valeurs.passions, 'Privé enregistré'); assert.ok(Object.values(s.row.partage).every(v => !v))
  assert.equal(s.row.iaCadeaux.passions, false); assert.equal(s.row.iaCadeaux.identite, true)
  assert.equal(s.h.find(n => !!n.props.draft).props.draft.iaCadeaux.passions, false)
  assert.equal(s.h.find(n => !!n.props.draft).props.draft.valeurs.passions, 'Brouillon non enregistré'); assert.equal(s.confirmations.length, 1); s.h.unmount()
})
test('univers formulaire : conflit conservé, relecture volontaire et changement de contenu', async () => {
  const s = await loaded(); s.edit(v => { v.identite = 'Saisie locale' }); s.conflict = true
  await s.click(save); assert.equal(s.h.find(n => !!n.props.draft).props.draft.identite, 'Saisie locale')
  assert.equal(s.h.find(n => n.type === 'button' && s.h.text(n) === save).props.disabled, true)
  s.conflict = false; await s.click('Relire les informations enregistrées'); assert.equal(s.confirmations.length, 1)
  assert.equal(s.h.find(n => !!n.props.draft).props.draft.identite, 'Autre onglet'); s.h.unmount()
})
test('univers formulaire : hors ligne refuse sauvegarde et ignore une ancienne lecture après fermeture', async () => {
  const s = await loaded(); s.navigator.onLine = false; s.window.dispatchEvent(new Event('offline')); s.render()
  await s.click(save); assert.equal(s.commands.length, 0); assert.ok(s.h.text().includes('Hors ligne')); s.h.unmount()
  const late = setup(); let deliver
  late.api.lire = () => new Promise(resolve => { deliver = resolve }); late.render(); await late.h.flush(); late.h.unmount()
  deliver(copy(c.universInitial('Ancien compte'))); await late.h.flush(); late.render(); assert.ok(!late.h.text().includes('Ancien compte'))
})
test('univers éditeur : retirer anniversaire retire année, aperçu invalide n’affiche aucun vieux contenu', () => {
  let value = copy(c.universInitial('Lune')); value.valeurs.anniversaire = { jour: 29, mois: 2, annee: 2000 }; value.partage.anniversaire = true; value.partage.annee = true
  const h = harness('components/univers/UniversEditor.tsx', { globals: { TextEncoder }, overrides: { 'next/link': { default: 'a' } } })
  const render = () => h.render({ draft: value, onChange: next => { value = next } }); render()
  h.find(n => n.type === 'label' && h.text(n).includes('Partager le jour')).props.children[0].props.onChange({ target: { checked: false } })
  assert.equal(value.partage.annee, false)
  value.valeurs.anniversaire.annee = 2001; render(); assert.ok(h.text().includes('Aperçu à vérifier')); h.unmount()
})
test('10C formulaire : permissions, valeurs et partage sauvegardés ensemble ; texte suivant conserve son accord', async () => {
  const s = await loaded(); s.edit(v => { v.valeurs.passions = 'Musique'; v.partage.passions = true; v.iaCadeaux.passions = true })
  assert.equal(s.commands.length, 0); await s.click(save)
  assert.equal(s.commands[0].donnees.iaCadeaux.passions, true); assert.equal(s.commands[0].donnees.valeurs.passions, 'Musique'); assert.equal(s.commands[0].donnees.partage.passions, true)
  s.edit(v => { v.valeurs.passions = 'Livres' }); await s.click(save); assert.equal(s.row.iaCadeaux.passions, true); assert.equal(s.row.valeurs.passions, 'Livres'); s.h.unmount()
})
test('10C éditeur : retirer le partage décoche seulement son accord IA et garde le texte', () => {
  let value = copy(c.universInitial('Lune')); value.valeurs.passions = 'Livres'; value.partage.passions = true; value.iaCadeaux.passions = true; value.iaCadeaux.identite = true
  const h = harness('components/univers/UniversEditor.tsx', { overrides: { 'next/link': { default: 'a' } } })
  h.render({ draft: value, onChange: next => { value = next } })
  h.find(n => n.type === 'label' && h.text(n) === 'Partager mes passions').props.children[0].props.onChange({ target: { checked: false } })
  assert.equal(value.iaCadeaux.passions, false); assert.equal(value.iaCadeaux.identite, true); assert.equal(value.valeurs.passions, 'Livres'); h.unmount()
})
