// 🌙 Nouvelle collection : rendu réel, contrat fermé et maintien de la barrière de persistance.
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { harness } from './ui-harness.mjs'
import { loadPure } from './p2-helpers.mjs'

const v1 = loadPure('lib/avatars.ts', 'AVATAR_CATALOG_V1,AVATAR_GROUPS,DEFAULT_AVATAR_V1,avatarConfig')
const v2 = loadPure('lib/avatar-collection-v2.ts', 'AVATAR_CATALOG_V2,DEFAULT_AVATAR_V2,AVATAR_PRESETS_V2,avatarCollectionConfig', v1)
const config = patch => ({ ...v2.DEFAULT_AVATAR_V2, ...patch })

test('collection céleste : identifiants autorisés, versions cohérentes et aucune admission dans le schéma V1', () => {
  for (const { key } of v1.AVATAR_GROUPS) for (const option of v2.AVATAR_CATALOG_V2[key]) {
    assert.equal(v2.avatarCollectionConfig(config({ [key]: option.id }))[key], option.id)
  }
  for (const value of [null,[],{},config({format:2}),config({catalogVersion:1}),config({renderVersion:1}),config({accessoryId:'<svg onload=alert(1)>'}),config({skinId:'#fff'}),config({hairId:['court']}),config({profile:{email:'prive'}})]) {
    assert.throws(() => v2.avatarCollectionConfig(value))
  }
  const missing=config();delete missing.accessoryId;assert.throws(()=>v2.avatarCollectionConfig(missing))
  const copy=v2.avatarCollectionConfig(config());copy.hairId='sans';assert.equal(v2.DEFAULT_AVATAR_V2.hairId,'ondulations')
  assert.throws(()=>v1.avatarConfig(config()))
  assert.equal(v1.AVATAR_CATALOG_V1.accessoryId.length,4)
  assert.equal(v1.avatarConfig(v1.DEFAULT_AVATAR_V1).renderVersion,1)
})

test('collection céleste : formes SVG complètes, chaque choix dessiné et aucun appel tiers', () => {
  const Renderer=harness('components/avatars/AvatarRendererV2.tsx').component.default
  const initial=renderToStaticMarkup(React.createElement(Renderer,{config:config()}))
  const accessoryRenders=new Set()
  for(const {key} of v1.AVATAR_GROUPS) for(const option of v2.AVATAR_CATALOG_V2[key]) {
    const html=renderToStaticMarkup(React.createElement(Renderer,{config:config({[key]:option.id})}))
    assert.match(html,/role="img"/);assert.match(html,/data-avatar-render-version="2"/)
    assert.match(html,/focusable="false"/)
    assert.doesNotMatch(html,/<(?:script|image|foreignObject|a|animate|filter)[\s>]|(?:href|onload|onclick|style|id)=/)
    for(const [,d] of html.matchAll(/\sd="([^"]+)"/g)) assert.match(d,/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/)
    if(option.id!==config()[key]) assert.notEqual(html,initial)
    if(key==='accessoryId') accessoryRenders.add(html)
  }
  assert.equal(accessoryRenders.size,12)
  const decorative=renderToStaticMarkup(React.createElement(Renderer,{config:config(),decorative:true}))
  assert.match(decorative,/aria-hidden="true"/);assert.doesNotMatch(decorative,/role="img"|aria-label=/)
  assert.throws(()=>renderToStaticMarkup(React.createElement(Renderer,{config:config({accessoryId:'inconnu'})})))
})

test('collection céleste : radios nommés, aperçu contrôlé et choix source intact', () => {
  const editor=harness('components/avatars/AvatarCollectionEditor.tsx');let changed
  const value=config();editor.render({value,onChange:next=>{changed=next}})
  assert.equal(editor.nodes().filter(node=>node.type==='fieldset').length,7)
  const glasses=editor.find(node=>node.type==='input' && node.props.value==='lunettes')
  assert.equal(glasses.props.type,'radio');assert.ok(glasses.props.name);glasses.props.onChange()
  assert.equal(changed.accessoryId,'lunettes');assert.equal(value.accessoryId,'aucun')
  editor.render({value:changed,onChange:next=>{changed=next}})
  assert.equal(editor.find(node=>node.type==='input' && node.props.value==='lunettes').props.checked,true)
})

test('collection céleste : modèles volontaires, fermeture réinitialisée et aucun enregistrement fictif', () => {
  const preview=harness('components/avatars/AvatarCollectionPreview.tsx')
  const button=label=>preview.find(node=>node.type==='button' && preview.text(node)===label)
  const editor=()=>preview.find(node=>typeof node.type==='function' && node.type.name==='AvatarCollectionEditor')
  preview.render();assert.match(preview.text(),/essais ne sont pas enregistrés/)
  button('Essayer la collection céleste').props.onClick();preview.render()
  button('Éclat solaire').props.onClick();preview.render();assert.equal(editor().props.value.accessoryId,'barbe')
  editor().props.onChange(config({accessoryId:'couronne'}));preview.render();assert.equal(editor().props.value.accessoryId,'couronne')
  assert.ok(preview.nodes().filter(node=>node.type==='button').every(node=>!/Enregistrer|Publier|Partager|Copier/.test(preview.text(node))))
  preview.find(node=>typeof node.type==='function' && node.type.name==='Modal').props.onClose();preview.render()
  assert.equal(preview.find(node=>typeof node.type==='function' && node.type.name==='Modal').props.open,false)
  button('Essayer la collection céleste').props.onClick();preview.render();assert.equal(editor().props.value.accessoryId,'aucun')
  preview.unmount()
})
