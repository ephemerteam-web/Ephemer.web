import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {loadPure} from './p2-helpers.mjs'
import {harness} from './ui-harness.mjs'
const v1=loadPure('lib/avatars.ts','AVATAR_CATALOG_V1,DEFAULT_AVATAR_V1,avatarConfig')
const v3=loadPure('lib/avatar-collection-v3.ts','AVATAR_CATALOG_V3,AVATAR_ACCESSORIES_V3,DEFAULT_AVATAR_V3,avatarConfigV3',v1)
const copy=v=>JSON.parse(JSON.stringify(v)),config=(patch={})=>({...copy(v3.DEFAULT_AVATAR_V3),...patch})

test('V3 : nombres de choix, contrat fermé et copie profonde des accessoires',()=>{
  const counts={baseId:2,faceId:3,skinId:8,mouthId:4,hairId:9,hairColorId:6,eyeId:8,eyeColorId:8,clothingId:8,clothingColorId:8,backgroundId:2}
  for(const [key,n] of Object.entries(counts)) assert.equal(v3.AVATAR_CATALOG_V3[key].length,n)
  for(const [key,options] of Object.entries(v3.AVATAR_CATALOG_V3)) for(const option of options) assert.equal(v3.avatarConfigV3(config({[key]:option.id}))[key],option.id)
  for(const [key,options] of Object.entries(v3.AVATAR_ACCESSORIES_V3)) for(const option of options) assert.equal(v3.avatarConfigV3(config({accessories:{...config().accessories,[key]:option.id}})).accessories[key],option.id)
  const source=config(),frozen=v3.avatarConfigV3(source);source.accessories.eyewearId='rondes';assert.equal(frozen.accessories.eyewearId,'aucun')
  for(const value of [null,[],{},config({format:1}),config({catalogVersion:2}),config({renderVersion:'3'}),config({mouthId:'<svg/>'}),config({eyeId:['amande']}),config({eyeColorId:'#fff'}),config({profile:{email:'PRIVE'}}),config({accessories:null}),config({accessories:[]}),config({accessories:{...config().accessories,html:'<svg/>'}})]) assert.throws(()=>v3.avatarConfigV3(value))
  for(const key of Object.keys(config())) {const incomplete=config();delete incomplete[key];assert.throws(()=>v3.avatarConfigV3(incomplete))}
  for(const key of Object.keys(config().accessories)) {const incomplete=config();delete incomplete.accessories[key];assert.throws(()=>v3.avatarConfigV3(incomplete))}
  assert.throws(()=>v1.avatarConfig(config()))
})

test('V3 : bouches et yeux visuellement distincts, combinaisons complètes et SVG local sûr',()=>{
  const Renderer=harness('components/avatars/AvatarRendererV3.tsx').component.default
  const render=c=>renderToStaticMarkup(React.createElement(Renderer,{config:c}))
  for(const [key,options] of Object.entries(v3.AVATAR_CATALOG_V3)) {
    const distinct=new Set(options.map(o=>render(config({[key]:o.id}))))
    assert.equal(distinct.size,options.length,key)
  }
  for(const [key,options] of Object.entries(v3.AVATAR_ACCESSORIES_V3)) assert.equal(new Set(options.map(o=>render(config({accessories:{...config().accessories,[key]:o.id}})))).size,options.length,key)
  for(const base of ['homme','femme']) for(const skin of v3.AVATAR_CATALOG_V3.skinId) for(const hair of v3.AVATAR_CATALOG_V3.hairId) for(const clothing of v3.AVATAR_CATALOG_V3.clothingId) {
    const html=render(config({baseId:base,skinId:skin.id,hairId:hair.id,clothingId:clothing.id,accessories:{eyewearId:'rondes',headwearId:'casque',jewelryId:'boucles_lune',scarfId:'celeste',beardId:'courte'}}))
    assert.match(html,/data-avatar-render-version="3"/);assert.match(html,/focusable="false"/)
    assert.doesNotMatch(html,/<(?:script|image|foreignObject|a|animate|filter)[\s>]|(?:href|onload|onclick|style|id)=/)
    for(const [,d] of html.matchAll(/\sd="([^"]+)"/g)) assert.match(d,/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/)
  }
})

test('V3 : dispatcher conserve exactement le SVG V1 et refuse une version inconnue',()=>{
  const Renderer=harness('components/avatars/AvatarRenderer.tsx').component.default
  const Legacy=harness('components/avatars/AvatarRendererV1.tsx').component.default
  for(const decorative of [true,false]) assert.equal(renderToStaticMarkup(React.createElement(Renderer,{config:v1.DEFAULT_AVATAR_V1,decorative})),renderToStaticMarkup(React.createElement(Legacy,{config:v1.DEFAULT_AVATAR_V1,decorative})))
  assert.throws(()=>renderToStaticMarkup(React.createElement(Renderer,{config:config({renderVersion:99})})))
  const cards=loadPure('lib/cards.ts','cardSnapshot,isCardTemplate,CARD_TEMPLATES,CARD_MESSAGE_LIMIT,CARD_SIGNATURE_LIMIT')
  const persisted=loadPure('lib/card-snapshot-v2.ts','cardSnapshotV2,supportedCardSnapshot',{...harness('lib/avatar-render-config.ts').component,...cards})
  const source={format:2,templateId:'clair_de_lune',templateVersion:1,renderVersion:2,message:'Bonjour',signature:'Moi',avatar:config()}
  const frozen=persisted.cardSnapshotV2(source,true)
  source.avatar.accessories.headwearId='halo'
  assert.equal(frozen.avatar.accessories.headwearId,'aucun')
  assert.throws(()=>persisted.cardSnapshotV2({...source,avatar:config({catalogVersion:99})}))
})

test('V3 : changement de base conserve bouche, vêtements et accessoires, radios nommés',()=>{
  const editor=harness('components/avatars/AvatarEditorV3.tsx');let changed
  const source=config({mouthId:'coin',accessories:{...config().accessories,eyewearId:'rondes',jewelryId:'pendentif_lune'}})
  editor.render({value:source,onChange:next=>{changed=next}})
  assert.equal(editor.nodes().filter(n=>n.type==='button'&&n.props['aria-haspopup']==='dialog').length,12)
  editor.find(n=>n.type==='button'&&editor.text(n).includes('Base du portrait')).props.onClick()
  editor.render({value:source,onChange:next=>{changed=next}})
  editor.find(n=>n.type==='input'&&n.props.value==='femme').props.onChange()
  assert.deepEqual(copy(changed),{...source,baseId:'femme'});assert.equal(source.baseId,'homme')
  const radios=editor.nodes().filter(n=>n.type==='input');assert.ok(radios.every(n=>n.props.type==='radio'&&n.props.name))
  assert.equal(new Set(radios.map(n=>n.props.name)).size,1)
  editor.render({value:changed,onChange:next=>{changed=next}})
  editor.find(n=>n.type==='button'&&editor.text(n).includes('Bouche')).props.onClick()
  editor.render({value:changed,onChange:next=>{changed=next}})
  assert.equal(editor.nodes().filter(n=>typeof n.type==='function'&&n.type.name==='AvatarRendererV3'&&n.props.detail==='mouth').length,5)
  assert.equal(editor.nodes().filter(n=>typeof n.type==='function'&&n.type.name==='AvatarRenderer'&&!n.props.decorative).length,2)
  editor.find(n=>n.type==='input'&&n.props.value==='ouvert').props.onChange()
  editor.render({value:changed,onChange:next=>{changed=next}})
  assert.ok(editor.nodes().filter(n=>typeof n.type==='function'&&n.type.name==='AvatarRenderer'&&!n.props.decorative).every(n=>n.props.config.mouthId==='ouvert'))
  editor.find(n=>n.type==='button'&&editor.text(n)==='Annuler ce choix').props.onClick()
  assert.equal(changed.mouthId,'coin');assert.equal(changed.baseId,'femme');assert.equal(changed.accessories.eyewearId,'rondes')
})

test('V3 : annulation et réinitialisation explicites, aucun bouton prétendant sauvegarder',()=>{
  const preview=harness('components/avatars/AvatarPreviewV3.tsx')
  const button=name=>preview.find(n=>n.type==='button'&&preview.text(n)===name)
  const editor=()=>preview.find(n=>typeof n.type==='function'&&n.type.name==='AvatarEditorV3')
  preview.render();button('Personnaliser mon avatar').props.onClick();preview.render()
  editor().props.onChange(config({mouthId:'ouvert'}));preview.render();assert.equal(editor().props.value.mouthId,'ouvert')
  button('Réinitialiser l’aperçu').props.onClick();preview.render();assert.equal(editor().props.value.mouthId,'doux')
  editor().props.onChange(config({mouthId:'dents'}));preview.render();button('Annuler et fermer').props.onClick();preview.render()
  button('Personnaliser mon avatar').props.onClick();preview.render();assert.equal(editor().props.value.mouthId,'doux')
  assert.ok(preview.nodes().filter(n=>n.type==='button').every(n=>!/Enregistrer|Publier|Partager/.test(preview.text(n))))
  assert.match(preview.text(),/essais ne sont pas enregistrés/)
  preview.unmount()
})

test('V3 : couleurs fusionnées avec leur asset, aperçu global actualisé et annulation commune',()=>{
  for(const [category,shape,color] of [['Visage','rond','miel'],['Coiffure','tresses','prune'],['Forme des yeux','souriants','bleu'],['Vêtement','salopette','creme']]) {
    const editor=harness('components/avatars/AvatarEditorV3.tsx');let value=config()
    const render=()=>editor.render({value,onChange:next=>{value=next}})
    render();editor.find(n=>n.type==='button'&&editor.text(n).startsWith(category)).props.onClick();render()
    assert.equal(editor.nodes().filter(n=>n.type==='fieldset').length,2)
    editor.find(n=>n.type==='input'&&n.props.value===shape).props.onChange();render()
    editor.find(n=>n.type==='input'&&n.props.value===color).props.onChange();render()
    assert.equal(new Set(editor.nodes().filter(n=>n.type==='input').map(n=>n.props.name)).size,2)
    const previews=editor.nodes().filter(n=>typeof n.type==='function'&&n.type.name==='AvatarRenderer'&&!n.props.decorative)
    assert.equal(previews.length,2);assert.ok(previews.every(n=>JSON.stringify(n.props.config)===JSON.stringify(value)))
    editor.find(n=>n.type==='button'&&editor.text(n)==='Annuler ce choix').props.onClick()
    assert.deepEqual(copy(value),config())
  }
})

test('profil : éditeur remonté par compte, l’ancien éditeur reste hors interface',()=>{
  const profile=harness('components/avatars/ProfileAvatar.tsx',{overrides:{'@/lib/avatar-data':{loadAvatar:()=>{throw new Error('Lecture inattendue')},saveAvatar:()=>{throw new Error('Ecriture inattendue')}}}})
  profile.render({ownerId:'compte-A'})
  const inner=profile.find(n=>typeof n.type==='function'&&n.type.name==='ProfileAvatarEditor')
  assert.equal(inner.key,'compte-A');assert.equal(inner.props.ownerId,'compte-A')
  profile.render({ownerId:'compte-B'})
  assert.equal(profile.find(n=>n.type===inner.type).key,'compte-B')
  assert.equal(profile.nodes().filter(n=>n.type==='button').length,0)
  assert.equal(profile.nodes().filter(n=>typeof n.type==='function'&&['AvatarEditor','AvatarRendererV1'].includes(n.type.name)).length,0)
})

test('V3 : listes SQL identiques aux identifiants TypeScript, empreinte et branche V1 intactes',()=>{
  const sql=fs.readFileSync('docs/evolution/lot-09/avatar-v3/schema-propose.sql','utf8').replaceAll('\r','')
  const body=sql.match(/CREATE OR REPLACE FUNCTION ephemer_lot09.avatar_valide[\s\S]*?AS \$fn\$([\s\S]*?)\$fn\$;/)[1]
  const hash=crypto.createHash('md5').update(body).digest('hex')
  assert.ok(fs.readFileSync('docs/evolution/lot-09/avatar-v3/verification-lecture-seule.sql','utf8').includes(hash))
  const branch=body.slice(body.indexOf(' OR ('))
  for(const [key,options] of Object.entries(v3.AVATAR_CATALOG_V3)) assert.ok(branch.includes(`p->'${key}' IN (${options.map(o=>`'"${o.id}"'::jsonb`).join(',')})`),key)
  for(const [key,options] of Object.entries(v3.AVATAR_ACCESSORIES_V3)) assert.ok(branch.includes(`p->'accessories'->'${key}' IN (${options.map(o=>`'"${o.id}"'::jsonb`).join(',')})`),key)
  const oldBody=fs.readFileSync('docs/evolution/lot-09/schema-propose.sql','utf8').replaceAll('\r','').match(/CREATE FUNCTION ephemer_lot09.avatar_valide[\s\S]*?AS \$fn\$([\s\S]*?)\$fn\$;/)[1]
  assert.ok(body.includes(oldBody.match(/THEN\n([\s\S]*?)\n ELSE false/)[1].trim()))
  assert.doesNotMatch(sql,/CREATE TABLE|GRANT |REVOKE |ALTER TABLE[^;]*ADD COLUMN|INSERT INTO|UPDATE public/)
})
