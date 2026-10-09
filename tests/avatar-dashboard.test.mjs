// Synchronisation des composants réels, comptes/lectures simulés.
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {harness} from './ui-harness.mjs'
import {pageDatabase} from './p2-helpers.mjs'
const copy=v=>JSON.parse(JSON.stringify(v))
const config=copy(harness('lib/avatar-collection-v3.ts').component.DEFAULT_AVATAR_V3)
const row=(mouthId='doux',owner='A')=>({user_id:owner,revision:1,configuration:{...copy(config),mouthId}})

test('avatar partagé : une lecture commune, résultat tardif supplanté par validation et compte étranger ignoré',async()=>{
  let resolveRead,reads=0;const listeners=new Map()
  const h=harness('components/avatars/DashboardAvatarContext.tsx',{overrides:{'@/lib/avatar-data':{loadAvatar:()=>{reads++;return new Promise(resolve=>{resolveRead=resolve})}}},globals:{window:{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),setInterval:()=>1,clearInterval(){}},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},navigator:{onLine:true}}})
  const render=()=>h.render({ownerId:'A',children:'Trois badges'},'AccountAvatar')
  render();await h.flush();render();assert.equal(reads,1)
  const state=()=>h.find(n=>n.props.value?.updateAvatar).props.value
  state().updateAvatar(row('dents'));render();assert.equal(state().config.mouthId,'dents')
  assert.equal(state().savedConfig.mouthId,'dents')
  resolveRead(row('doux'));await h.flush();render();assert.equal(state().config.mouthId,'dents')
  state().updateAvatar(row('ouvert','B'));render();assert.equal(state().config.mouthId,'dents')
  listeners.get('focus')();await h.flush();render();assert.equal(reads,2)
  h.unmount();resolveRead(row('coin'));await h.flush();render();assert.equal(state().config.mouthId,'dents')
  assert.equal(listeners.size,0)
  h.render({ownerId:'B',children:'B'});assert.equal(h.find(n=>n.props.ownerId==='B').key,'B')
})

test('avatar enregistré : trois badges actualisés après validation, aucune diffusion des essais annulés',async()=>{
  const shared={config:copy(config),updateAvatar:value=>{shared.config=copy(value.configuration)}}
  let saved=row(),writes=0
  const override={'@/components/avatars/DashboardAvatarContext':{useDashboardAvatar:()=>shared}}
  const h=harness('components/avatars/ProfileAvatar.tsx',{overrides:{...override,'@/lib/avatar-data':{loadAvatar:async()=>copy(saved),saveAvatar:async(owner,revision,value)=>{writes++;saved={user_id:owner,revision:revision+1,configuration:copy(value)};return copy(saved)}},'@/components/ContactDraftProvider':{useContactDraft:()=>({registerPrivateDraft(){}})}},globals:{window:{addEventListener(){},removeEventListener(){}}}})
  const render=()=>h.render({ownerId:'A'},'ProfileAvatarEditor')
  const click=async label=>{h.find(n=>n.type==='button'&&h.text(n)===label).props.onClick();await h.flush();render()}
  render();await h.flush();render();await click('Personnaliser mon avatar')
  h.find(n=>n.props.value?.mouthId).props.onChange({...copy(config),mouthId:'dents'});render()
  assert.equal(shared.config.mouthId,'doux');await click('Annuler');assert.equal(writes,0)
  await click('Personnaliser mon avatar');h.find(n=>n.props.value?.mouthId).props.onChange({...copy(config),mouthId:'coin'});render();await click('Valider les modifications')
  assert.equal(writes,1);assert.equal(shared.config.mouthId,'coin')
  const Badge=harness('components/avatars/AccountAvatarBadge.tsx',{overrides:override}).component.default
  for(const [size,rounded] of [[40,true],[64,false],[80,true]]) {
    const html=renderToStaticMarkup(React.createElement('div',{style:{width:size,height:size}},React.createElement(Badge,{initiale:'A',rounded})))
    assert.match(html,/data-avatar-render-version="3"/);assert.match(html,/aria-hidden="true"/);assert.doesNotMatch(html,/>A<|role="img"/)
  }
  h.unmount()
})

test('navigation avatar : profil sans éditeur, rectangle et cercle du menu ouvrent /avatar',async()=>{
  const db=pageDatabase({profiles:[{id:'u1',prenom:'Alex',email:'test@example.invalid'}],evenements_personnels:[]})
  const profile=harness('app/dashboard/profil/page.tsx',{overrides:{'next/navigation':{useRouter:()=>({})},'@/lib/supabase-browser':{supabase:db}}})
  profile.render();await profile.flush();profile.render()
  assert.ok(!profile.nodes().some(n=>typeof n.type==='function'&&n.type.name==='ProfileAvatar'))
  assert.equal(profile.find(n=>n.props['aria-label']==='Personnaliser mon avatar').props.href,'/avatar')
  const paths=[],menu=harness('components/MenuLateral.tsx',{overrides:{'@/lib/supabase-browser':{supabase:{}},'next/navigation':{usePathname:()=>'/dashboard/profil'},'@/components/ContactDraftProvider':{useContactDraft:()=>({navigate:async(path,close)=>{paths.push(path);close()},contacts:[],prenom:'',hasPrivateDraft:()=>false})}},globals:{document:{body:{style:{}}}}})
  let closed=false;menu.render({ouvert:true,onFermer:()=>{closed=true},user:{prenom:'Alex',email:'test@example.invalid'}})
  menu.find(n=>n.type==='button'&&n.props['aria-label']==='Personnaliser mon avatar').props.onClick();assert.deepEqual(paths,['/avatar']);assert.equal(closed,true)
  const page=harness('components/avatars/AvatarPage.tsx',{overrides:{'@/lib/avatar-data':{}}});page.render()
  assert.equal(page.find(n=>typeof n.type==='function'&&n.type.name==='ProfileAvatar').props.ownerId,'u1')
  assert.equal(page.find(n=>n.props.href==='/dashboard/profil').props.href,'/dashboard/profil')
})

test('badge : initiale pendant chargement/échec, portrait par défaut en absence de configuration',()=>{
  let current=null
  const h=harness('components/avatars/AccountAvatarBadge.tsx',{overrides:{'@/components/avatars/DashboardAvatarContext':{useDashboardAvatar:()=>({config:current})}}})
  h.render({initiale:'A'});assert.equal(h.text(),'A')
  current=copy(config);h.render({initiale:'A'});assert.equal(h.find(n=>n.props.config).props.config.mouthId,'doux')
})
