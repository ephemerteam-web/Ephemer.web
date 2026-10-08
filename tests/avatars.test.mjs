// 🌙 Contrats et rendu React réels ; interactions de l'aperçu simulées, aucune base mutée.
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadPure } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'

const avatars = loadPure('lib/avatars.ts', 'AVATAR_CATALOG_V1,AVATAR_GROUPS,DEFAULT_AVATAR_V1,avatarConfig,recoverProfileAvatar')
const cards = loadPure('lib/cards.ts', 'cardSnapshot,isCardTemplate,CARD_TEMPLATES,CARD_MESSAGE_LIMIT,CARD_SIGNATURE_LIMIT')
const v2 = loadPure('lib/card-snapshot-v2.ts', 'cardSnapshotV2,supportedCardSnapshot', { ...harness('lib/avatar-render-config.ts').component, ...cards })
const copy = value => JSON.parse(JSON.stringify(value))
const avatar = patch => ({ ...copy(avatars.DEFAULT_AVATAR_V1), ...patch })
const card = patch => ({ format:2,templateId:'clair_de_lune',templateVersion:1,renderVersion:2,message:'Bonjour\npour cette belle journée.',signature:'Avec affection',avatar:avatar(),...patch })

test('avatar : tous les choix du catalogue sont autorisés et les configurations restent fermées', () => {
  assert.equal(avatars.AVATAR_CATALOG_V1.faceId.length,3)
  assert.equal(avatars.AVATAR_CATALOG_V1.hairId.length,6)
  assert.equal(avatars.AVATAR_CATALOG_V1.skinId.length,8)
  assert.equal(avatars.AVATAR_CATALOG_V1.clothingId.length,3)
  assert.equal(avatars.AVATAR_CATALOG_V1.accessoryId.length,4)
  for(const {key} of avatars.AVATAR_GROUPS) for(const option of avatars.AVATAR_CATALOG_V1[key]) {
    assert.equal(avatars.avatarConfig(avatar({[key]:option.id}))[key],option.id)
  }
  for(const value of [null,[],{},avatar({format:'1'}),avatar({catalogVersion:2}),avatar({renderVersion:2}),avatar({skinId:'#fff'}),avatar({faceId:['ovale']}),avatar({hairId:'<svg onload=alert(1)>'}),avatar({html:'<svg/>'}),avatar({user_id:'PRIVE'}),avatar({accessoryId:null})]) assert.throws(()=>avatars.avatarConfig(value))
  const missing=avatar();delete missing.skinId;assert.throws(()=>avatars.avatarConfig(missing))
})

test('avatar : défaut et récupération n’écrivent pas et ne modifient pas la source', () => {
  const source=avatar(),recovered=avatars.recoverProfileAvatar(source)
  assert.equal(recovered.notice,null)
  source.hairId='long';assert.equal(recovered.config.hairId,'court')
  assert.equal(avatars.recoverProfileAvatar(null).notice,null)
  const old=avatar({catalogVersion:99}),before=JSON.stringify(old),result=avatars.recoverProfileAvatar(old)
  assert.ok(result.notice);assert.deepEqual(copy(result.config),avatar());assert.equal(JSON.stringify(old),before)
})

test('avatar : rendu SVG réel de chaque choix, sans ressource extérieure ou markup arbitraire', () => {
  const Renderer=harness('components/avatars/AvatarRendererV1.tsx').component.default
  const initial=renderToStaticMarkup(React.createElement(Renderer,{config:avatar()}))
  for(const {key} of avatars.AVATAR_GROUPS) for(const option of avatars.AVATAR_CATALOG_V1[key]) {
    const html=renderToStaticMarkup(React.createElement(Renderer,{config:avatar({[key]:option.id})}))
    assert.match(html,/role="img"/);assert.match(html,/aria-label="Avatar illustré personnel"/)
    assert.match(html,/focusable="false"/);assert.match(html,/data-avatar-render-version="1"/)
    assert.doesNotMatch(html,/<(?:script|image|foreignObject|a|animate)[\s>]|(?:href|onload|onclick|style|id)=/)
    if(!['hairColorId'].includes(key) && option.id!==avatar()[key]) assert.notEqual(html,initial)
  }
  const decorative=renderToStaticMarkup(React.createElement(Renderer,{config:avatar(),decorative:true}))
  assert.match(decorative,/aria-hidden="true"/);assert.doesNotMatch(decorative,/role="img"|aria-label=/)
  assert.throws(()=>renderToStaticMarkup(React.createElement(Renderer,{config:avatar({hairId:'<script/>'})})))
})

test('cartes V2 : copie profonde, validation stricte et refus des versions/configurations inconnues', () => {
  const draft=card(),published=v2.cardSnapshotV2(draft,true),before=copy(published)
  draft.avatar.hairId='long';draft.message='Autre message';assert.deepEqual(copy(published),before)
  assert.equal(v2.cardSnapshotV2(card({avatar:null}),true).avatar,null)
  for(const value of [card({format:1}),card({renderVersion:1}),card({templateVersion:2}),card({avatar:avatar({catalogVersion:2})}),card({avatar:{}}),card({contact:{note:'PRIVEE'}}),card({message:'\ufeff '})]) assert.throws(()=>v2.cardSnapshotV2(value,true))
  const missing=card();delete missing.avatar;assert.throws(()=>v2.cardSnapshotV2(missing))
  assert.equal(v2.cardSnapshotV2(card({message:'🌙'.repeat(10000)})).message.length,20000)
  assert.throws(()=>v2.cardSnapshotV2(card({message:'x'.repeat(10001)})))
})

test('cartes : dispatcher compatible V1, texte hostile échappé et version publiée stable', () => {
  const Renderer=harness('components/cards/CardRenderer.tsx').component.default
  const V1=harness('components/cards/CardRendererV1.tsx').component.default
  for(const {id} of cards.CARD_TEMPLATES) {
    const old={format:1,renderVersion:1,templateVersion:1,templateId:id,message:'Ancienne carte',signature:'Signature'}
    assert.equal(renderToStaticMarkup(React.createElement(Renderer,{snapshot:old})),renderToStaticMarkup(React.createElement(V1,{snapshot:old})))
    const draft=card({templateId:id,message:'<script>alert(1)</script>\n<img src="https://example.invalid">',signature:'<a href="javascript:alert(1)">Moi</a>'})
    const frozen=v2.cardSnapshotV2(draft,true)
    const html=renderToStaticMarkup(React.createElement(Renderer,{snapshot:frozen}))
    assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;a href=/);assert.match(html,/data-card-render-version="2"/)
    assert.doesNotMatch(html,/<(?:script|img|a)[\s>]/);assert.match(html,/aria-hidden="true"/)
    draft.avatar.skinId='ebene';draft.message='Modifié';draft.templateId='aurore'
    assert.equal(renderToStaticMarkup(React.createElement(Renderer,{snapshot:frozen})),html)
  }
  const avatarOnly=renderToStaticMarkup(React.createElement(Renderer,{snapshot:card({signature:''})}))
  assert.match(avatarOnly,/role="img"/);assert.match(avatarOnly,/aria-label="Avatar illustré personnel"/)
})

test('éditeur : groupes radio nommés et choix contrôlés, source inchangée jusqu’à action explicite', () => {
  const editor=harness('components/avatars/AvatarEditor.tsx');let changed
  const value=avatar();editor.render({value,onChange:next=>{changed=next}})
  const fields=editor.nodes().filter(node=>node.type==='fieldset');assert.equal(fields.length,7)
  const option=editor.find(node=>node.type==='input' && node.props.value==='boucles')
  assert.equal(option.props.type,'radio');assert.ok(option.props.name);assert.equal(option.props.checked,false)
  option.props.onChange();assert.equal(changed.hairId,'boucles');assert.equal(value.hairId,'court')
  editor.render({value:changed,onChange:next=>{changed=next}})
  assert.equal(editor.find(node=>node.type==='input' && node.props.value==='boucles').props.checked,true)
})

test('aperçu : fermeture/annulation réinitialise, aucun bouton d’enregistrement ou partage fictif', () => {
  const preview=harness('components/avatars/AvatarPreview.tsx')
  const button=label=>preview.find(node=>node.type==='button' && preview.text(node)===label)
  preview.render();assert.match(preview.text(),/choix restent temporaires/)
  button('Essayer mon avatar').props.onClick();preview.render()
  const editor=preview.find(node=>typeof node.type==='function' && node.type.name==='AvatarEditor')
  editor.props.onChange(avatar({hairId:'long'}));preview.render()
  assert.equal(preview.find(node=>typeof node.type==='function' && node.type.name==='AvatarEditor').props.value.hairId,'long')
  const buttons=preview.nodes().filter(node=>node.type==='button').map(node=>preview.text(node))
  assert.ok(buttons.every(label=>!/Enregistrer|Publier|Copier|Partager/.test(label)))
  button('Annuler et fermer').props.onClick();preview.render()
  const modal=preview.find(node=>typeof node.type==='function' && node.type.name==='Modal');assert.equal(modal.props.open,false)
  button('Essayer mon avatar').props.onClick();preview.render()
  assert.equal(preview.find(node=>typeof node.type==='function' && node.type.name==='AvatarEditor').props.value.hairId,'court')
  preview.find(node=>typeof node.type==='function' && node.type.name==='Modal').props.onClose();preview.render()
  assert.equal(preview.find(node=>typeof node.type==='function' && node.type.name==='Modal').props.open,false)
  preview.unmount()
})
