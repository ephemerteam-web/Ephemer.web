// Contrats et composants réels, base/identité simulées ; aucun profil distant modifié.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {harness} from './ui-harness.mjs'
const copy=v=>JSON.parse(JSON.stringify(v))
const v3=harness('lib/avatar-collection-v3.ts').component
const config=patch=>({...copy(v3.DEFAULT_AVATAR_V3),...patch})

test('V3 : sauvegarde réelle du client, réponse perdue vérifiée, copie indépendante et conflit sans écrasement',async()=>{
  let row=null,writes=0,lose=true,identity='A'
  const supabase={from(table){assert.equal(table,'avatars_utilisateurs');let value,revision,user
    const q={select:()=>q,abortSignal:()=>q,maybeSingle:()=>q,single:()=>q,
      eq(key,v){if(key==='revision')revision=v;else if(key==='user_id')user=v;return q},
      insert(v){value=v;return q},update(v){value=v;return q},
      then(resolve,reject){
        if(value){writes++;assert.equal(user??value.user_id,'A');if(row&&row.revision!==revision)return Promise.resolve({data:null,error:{}}).then(resolve,reject)
          row={user_id:'A',revision:row?row.revision+1:1,configuration:copy(value.configuration)}
          if(lose){lose=false;return Promise.reject(new Error('Réponse perdue')).then(resolve,reject)}
        }
        return Promise.resolve({data:row&&copy(row),error:null}).then(resolve,reject)
      }};return q}}
  const api=harness('lib/avatar-data.ts',{overrides:{'@/lib/supabase-browser':{supabase},'@/lib/attention-data':{requireOwner:async owner=>{if(owner!==identity)throw new Error('Session changée')}}},globals:{AbortSignal}}).component
  const input=config({mouthId:'dents',accessories:{...config().accessories,eyewearId:'dorees'}})
  const saved=await api.saveAvatar('A',null,input);assert.equal(saved.revision,1);assert.equal(writes,1)
  await api.saveAvatar('A',null,input);assert.equal(writes,1)
  input.accessories.eyewearId='aucun';assert.equal(row.configuration.accessories.eyewearId,'dorees')
  const card=await api.avatarForCard('A');card.accessories.eyewearId='rondes';assert.equal(row.configuration.accessories.eyewearId,'dorees')
  await api.saveAvatar('A',1,config({mouthId:'ouvert'}))
  await assert.rejects(api.saveAvatar('A',1,config({mouthId:'coin'})),/changé/);assert.equal(writes,2)
  await assert.rejects(api.saveAvatar('A',2,config({accessories:{...config().accessories,svg:'<script/>'}})),/invalide/);assert.equal(writes,2)
  identity='B';await assert.rejects(api.loadAvatar('A'),/Session/)
})

test('V3 : récupération du profil conserve V1/ancienne configuration, défaut V3 sans écriture',()=>{
  const api=harness('lib/avatar-render-config.ts').component,legacy=harness('lib/avatars.ts').component.DEFAULT_AVATAR_V1
  assert.deepEqual(copy(api.recoverProfileRenderAvatar(legacy).config),copy(legacy))
  assert.equal(api.recoverProfileRenderAvatar(null).config.renderVersion,3)
  const old=config({renderVersion:99}),before=copy(old),recovered=api.recoverProfileRenderAvatar(old)
  assert.ok(recovered.notice);assert.equal(recovered.config.renderVersion,3);assert.deepEqual(old,before)
})

test('cartes historiques : HTML V2/avatars V1 exactement identique aux empreintes avant intégration',()=>{
  const R=harness('components/cards/CardRendererV2.tsx').component.default,avatar=harness('lib/avatars.ts').component.DEFAULT_AVATAR_V1
  const expected={clair_de_lune:'66de05a4f2589bb9b25a73ace94db19eb3ccf0226a902979b9e6735e2a01e042',constellation:'227b3f49c4fc984737e6f299195681bdd4d9dd2e36264b4cfad621e6b9ef3d01',aurore:'466cfd236a659290cedf4ea40b7bee4379add478ba1a587e8d5f71fe37a0b23c'}
  for(const [templateId,hash] of Object.entries(expected)) assert.equal(createHash('sha256').update(renderToStaticMarkup(React.createElement(R,{snapshot:{format:2,templateId,templateVersion:1,renderVersion:2,message:'Bonjour',signature:'Moi',avatar}}))).digest('hex'),hash)
})

test('cartes V3 : snapshot fermé et avatar publié immuable après édition du profil/brouillon',()=>{
  const api=harness('lib/card-snapshot-v2.ts').component,R=harness('components/cards/CardRenderer.tsx').component.default
  const draft={format:2,renderVersion:2,templateVersion:1,templateId:'aurore',message:'<script>alert(1)</script>',signature:'Moi',avatar:config()}
  const published=api.supportedCardSnapshot(draft,true),render=()=>renderToStaticMarkup(React.createElement(R,{snapshot:published})),before=render()
  draft.avatar.mouthId='ouvert';draft.avatar.accessories.headwearId='halo';draft.message='Autre message'
  assert.equal(render(),before);assert.match(before,/data-avatar-render-version="3"/);assert.match(before,/&lt;script&gt;/);assert.doesNotMatch(before,/<script>/)
  for(const avatar of [config({profile:{email:'PRIVE'}}),config({eyeId:'inconnu'}),config({renderVersion:2})]) assert.throws(()=>api.supportedCardSnapshot({...draft,avatar},true))
})

test('profil V3 : avatar historique/inconnu expliqué, ouverture et annulation ne réécrivent jamais la ligne',async()=>{
  const legacy=harness('lib/avatars.ts').component.DEFAULT_AVATAR_V1
  for(const configuration of [legacy,config({renderVersion:99})]) {
    let writes=0;const before=copy(configuration)
    const h=harness('components/avatars/ProfileAvatar.tsx',{overrides:{'@/lib/avatar-data':{loadAvatar:async()=>({user_id:'A',revision:4,configuration:copy(configuration)}),saveAvatar:async()=>{writes++;throw new Error('Ecriture inattendue')}},'@/components/ContactDraftProvider':{useContactDraft:()=>({registerPrivateDraft(){}})}},globals:{window:{addEventListener(){},removeEventListener(){}}}})
    const render=()=>h.render({ownerId:'A'},'ProfileAvatarEditor')
    render();await h.flush();render();assert.match(h.text(),/aucune donnée enregistrée|précédent reste enregistré/)
    h.find(n=>n.type==='button'&&h.text(n)==='Personnaliser mon avatar').props.onClick();await h.flush();render()
    const editor=h.find(n=>typeof n.type==='function'&&n.type.name==='AvatarEditorV3')
    assert.equal(editor.props.value.renderVersion,3);editor.props.onChange(config({mouthId:'coin'}));render()
    h.find(n=>n.type==='button'&&h.text(n)==='Annuler').props.onClick();render()
    assert.equal(writes,0);assert.deepEqual(copy(configuration),before);h.unmount()
  }
})

test('profil V3 : panne de lecture bloque l’édition, relecture explicite et réponse tardive ignorée',async()=>{
  let fail=true,resolveLate,writes=0
  const h=harness('components/avatars/ProfileAvatar.tsx',{overrides:{'@/lib/avatar-data':{loadAvatar:async()=>{if(fail)throw new Error('Hors ligne');return new Promise(resolve=>{resolveLate=resolve})},saveAvatar:async()=>{writes++}},'@/components/ContactDraftProvider':{useContactDraft:()=>({registerPrivateDraft(){}})}},globals:{window:{addEventListener(){},removeEventListener(){}}}})
  const render=()=>h.render({ownerId:'A'},'ProfileAvatarEditor')
  render();await h.flush();render();assert.match(h.text(),/Impossible de lire/)
  assert.ok(!h.nodes().some(n=>n.type==='button'&&h.text(n)==='Personnaliser mon avatar'))
  fail=false;h.find(n=>n.type==='button'&&h.text(n)==='Recharger avatar').props.onClick();await h.flush();render()
  h.unmount();resolveLate({user_id:'A',revision:1,configuration:config({mouthId:'coin'})});await h.flush();render()
  assert.ok(!h.nodes().some(n=>n.props.config?.mouthId==='coin'));assert.equal(writes,0)
})
