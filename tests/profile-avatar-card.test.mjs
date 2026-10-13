// Appuis et navigation contrôlés, sans compte connecté ni transport externe.
import test from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './ui-harness.mjs'

const portrait = { image: 'data:image/jpeg;base64,portrait-fictif', revision: 4, promptVersion: 'celeste-cartoon-v1' }
const pointer = (extra = {}) => ({ isPrimary: true, button: 0, pointerId: 1, clientX: 40, clientY: 40, ...extra })

function card(image = portrait) {
  const navigation = [], timers = new Map(), win = new EventTarget(), doc = new EventTarget()
  let elapsed = 0, serial = 0
  const ui = harness('components/avatars/ProfileAvatarCard.tsx', {
    overrides: { '@/components/ContactDraftProvider': { useContactDraft: () => ({ navigate: async path => navigation.push(path) }) } },
    globals: {
      window: win, document: doc,
      setTimeout: (fn, delay) => { const id = ++serial; timers.set(id, { fn, at: elapsed + delay }); return id },
      clearTimeout: id => timers.delete(id),
    },
  })
  const render = () => ui.render({ portrait: image, initiale: 'C' }, 'ProfileAvatarCardSession')
  const button = () => ui.find(n => n.props['aria-label'] === 'Modifier mon avatar').props
  const modal = () => ui.find(n => n.props.title === 'Mon portrait IA').props
  function advance(duration) {
    elapsed += duration
    for (const [id, timer] of [...timers]) if (timer.at <= elapsed) { timers.delete(id); timer.fn() }
    render()
  }
  render()
  return { ui, button, modal, render, advance, navigation, timers, win, doc }
}

test('profil avatar : clic court vers /avatar via la navigation qui protège les brouillons', () => {
  const h = card()
  h.button().onPointerDown(pointer()); h.advance(200)
  h.button().onPointerUp(); h.button().onClick(); h.advance(1000)
  assert.deepEqual(h.navigation, ['/avatar']); assert.equal(h.modal().open, false)
})

test('profil avatar : appui prolongé ouvre le portrait entier sans navigation au relâchement', () => {
  const h = card()
  h.button().onPointerDown(pointer()); h.advance(549); assert.equal(h.modal().open, false)
  h.advance(1); assert.equal(h.modal().open, true)
  h.button().onPointerUp(); h.button().onClick(); h.render()
  assert.deepEqual(h.navigation, [])
  assert.equal(h.ui.find(n => n.type === 'img').props.src, portrait.image)
  const download = h.ui.find(n => n.type === 'a' && n.props.download).props
  assert.equal(download.href, portrait.image); assert.equal(download.download, 'avatar-ephemer.jpg')
  h.modal().onClose(); h.render(); assert.equal(h.modal().open, false)
  h.button().onKeyDown(); h.button().onClick()
  assert.deepEqual(h.navigation, ['/avatar'])
})

test('profil avatar : défilement, annulation et sortie empêchent agrandissement et navigation', () => {
  for (const cancel of [
    button => button.onPointerMove(pointer({ clientY: 70 })),
    button => button.onPointerCancel(),
    button => button.onPointerLeave(),
    button => button.onPointerDown(pointer({ isPrimary: false, pointerId: 2 })),
  ]) {
    const h = card()
    h.button().onPointerDown(pointer()); cancel(h.button()); h.advance(1000)
    h.button().onPointerUp(); h.button().onClick()
    assert.equal(h.modal().open, false); assert.deepEqual(h.navigation, []); assert.equal(h.timers.size, 0)
  }
})

test('profil avatar : perte de focus, onglet masqué et démontage annulent le délai', async () => {
  for (const reason of ['blur', 'visibilitychange', 'unmount']) {
    const h = card(); await h.ui.flush()
    h.button().onPointerDown(pointer())
    if (reason === 'unmount') h.ui.unmount()
    else (reason === 'blur' ? h.win : h.doc).dispatchEvent(new Event(reason))
    assert.equal(h.timers.size, 0)
    if (reason !== 'unmount') { h.advance(1000); h.button().onClick(); assert.equal(h.modal().open, false); assert.deepEqual(h.navigation, []); h.ui.unmount() }
  }
})

test('profil avatar : accès Agrandir au clavier et absence d’agrandissement pour le dessin', () => {
  const h = card()
  h.ui.find(n => n.type === 'button' && n.props['aria-haspopup'] === 'dialog').props.onClick()
  h.render(); assert.equal(h.modal().open, true)
  const drawing = card(null)
  assert.equal(drawing.ui.nodes().filter(n => n.props['aria-haspopup'] === 'dialog').length, 0)
  drawing.button().onPointerDown(pointer()); drawing.advance(1000)
  drawing.button().onPointerUp(); drawing.button().onClick()
  assert.equal(drawing.modal().open, false); assert.deepEqual(drawing.navigation, ['/avatar'])
})

test('profil avatar : compte ou portrait remplacé démonte la session privée précédente', () => {
  let current = portrait
  const h = harness('components/avatars/ProfileAvatarCard.tsx', {
    overrides: { '@/components/avatars/DashboardAvatarContext': { useDashboardAvatar: () => ({ portrait: current }) } },
  })
  const first = h.render({ ownerId: 'A' }).key
  assert.notEqual(h.render({ ownerId: 'B' }).key, first)
  current = { ...portrait, revision: 5 }
  assert.notEqual(h.render({ ownerId: 'A' }).key, first)
  current = null
  assert.notEqual(h.render({ ownerId: 'A' }).key, first)
})
