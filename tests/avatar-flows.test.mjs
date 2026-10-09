// 🧪 Clients/contrats réels, base et identité simulées. Aucun compte distant modifié.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { harness } from './ui-harness.mjs'
import { loadPure, pageDatabase, p2Helpers } from './p2-helpers.mjs'

const avatars = harness('lib/avatars.ts').component
const cartoon = harness('lib/avatar-collection-v3.ts').component
const snapshots = harness('lib/card-snapshot-v2.ts').component
const owner = randomUUID(), other = randomUUID()
const config = patch => ({ ...avatars.DEFAULT_AVATAR_V1, ...patch })
const copy = value => JSON.parse(JSON.stringify(value))
function database() {
  let identity = owner, lose = '', failRead = false, accountChange = false
  const rows = [], calls = []
  const client = { from(table) {
    let action = 'read', values, filters = []
    const q = { select: () => q, abortSignal: () => q, maybeSingle: () => q, single: () => q,
      eq: (k,v) => { filters.push(r => r[k] === v); return q },
      insert: v => { action = 'insert'; values = v; return q }, update: v => { action = 'update'; values = v; return q },
      then(resolve, reject) {
        calls.push({ table, action, values: values && copy(values) })
        if (action === 'read' && failRead) return Promise.resolve({ data:null,error:{code:'NETWORK'} }).then(resolve,reject)
        let found = rows.find(r => filters.every(f => f(r)))
        if (action === 'insert') {
          if (rows.some(r => r.user_id === values.user_id)) return Promise.resolve({data:null,error:{code:'23505'}}).then(resolve,reject)
          found = { ...copy(values),revision:1 }; rows.push(found)
        } else if (action === 'update' && found) Object.assign(found,copy(values))
        if (accountChange && action !== 'read') identity = other
        if (lose && action !== 'read') { const kind=lose;lose='';return (kind==='throw'?Promise.reject(new TypeError('réponse perdue')):Promise.resolve({data:null,error:{code:'NETWORK'}})).then(resolve,reject) }
        return Promise.resolve({ data:found?copy(found):null,error:null }).then(resolve,reject)
      }
    }; return q
  } }
  const api = harness('lib/avatar-data.ts',{overrides:{'@/lib/supabase-browser':{supabase:client},'@/lib/attention-data':{requireOwner:async id=>{if(id!==identity)throw new Error('La session a changé.')} }},globals:{AbortSignal}}).component
  return {api,rows,calls,setIdentity:id=>{identity=id},loseNext:kind=>{lose=kind},failReads:value=>{failRead=value},changeDuringWrite:()=>{accountChange=true}}
}

test('avatar persistant : création explicite, reprise après reconnexion et réponse perdue sans deuxième écriture',async()=>{
  const f=database();assert.equal(await f.api.loadAvatar(owner),null);assert.equal(f.calls.filter(c=>c.action!=='read').length,0)
  f.loseNext('throw');const first=await f.api.saveAvatar(owner,null,config())
  assert.equal(first.revision,1);assert.equal(f.rows.length,1)
  assert.deepEqual(copy((await f.api.loadAvatar(owner)).configuration),config())
  await f.api.saveAvatar(owner,null,config());assert.equal(f.calls.filter(c=>c.action==='insert').length,1)
  const next=config({hairId:'boucles'});f.loseNext('result');const updated=await f.api.saveAvatar(owner,1,next)
  assert.equal(updated.revision,2);await f.api.saveAvatar(owner,1,next)
  assert.equal(f.calls.filter(c=>c.action==='update').length,1)
  assert.deepEqual(Object.keys(f.calls.find(c=>c.action==='insert').values).sort(),['configuration','user_id'])
  assert.deepEqual(Object.keys(f.calls.find(c=>c.action==='update').values).sort(),['configuration','revision'])
})

test('avatar : conflit conserve le gagnant, configuration hostile refusée avant réseau et identité revalidée',async()=>{
  const f=database();await f.api.saveAvatar(owner,null,config())
  await f.api.saveAvatar(owner,1,config({accessoryId:'lune'}))
  await assert.rejects(f.api.saveAvatar(owner,1,config({accessoryId:'halo'})),/changé/)
  assert.equal(f.rows[0].configuration.accessoryId,'lune')
  const count=f.calls.length
  await assert.rejects(f.api.saveAvatar(owner,2,config({svg:'<script/>'})),/invalide/);assert.equal(f.calls.length,count)
  f.setIdentity(other);await assert.rejects(f.api.loadAvatar(owner),/session/)
  f.setIdentity(owner);f.changeDuringWrite();await assert.rejects(f.api.saveAvatar(owner,2,config({hairId:'long'})),/session/)
})

test('avatar : lecture en panne interdit écriture/copie ; récupération ancienne sans mutation et défaut volontaire',async()=>{
  const f=database();assert.deepEqual(copy(await f.api.avatarForCard(owner)),copy(cartoon.DEFAULT_AVATAR_V3))
  assert.equal(f.calls.filter(c=>c.action!=='read').length,0)
  f.rows.push({user_id:owner,configuration:config({catalogVersion:99}),revision:1})
  assert.equal((await f.api.loadAvatar(owner)).configuration.catalogVersion,99)
  await assert.rejects(f.api.avatarForCard(owner),/Répare/)
  assert.equal(f.calls.filter(c=>c.action!=='read').length,0)
  f.failReads(true);await assert.rejects(f.api.saveAvatar(owner,1,config()),/lire/)
  await assert.rejects(f.api.avatarForCard(owner),/lire/)
  assert.equal(f.calls.filter(c=>c.action!=='read').length,0)
})

test('avatar : deux éditeurs gardent leur révision attendue ; seule la première écriture est appliquée',async()=>{
  const f=database();await f.api.saveAvatar(owner,null,config())
  const results=await Promise.allSettled([f.api.saveAvatar(owner,1,config({hairId:'long'})),f.api.saveAvatar(owner,1,config({hairId:'carre'}))])
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
  assert.equal(f.rows[0].revision,2)
  assert.equal(f.rows[0].configuration.hairId,results.find(r=>r.status==='fulfilled').value.configuration.hairId)
})

test('profil : annulation explicite, erreur garde les choix et relecture volontaire permet de résoudre un conflit',async()=>{
  let row=null,fail=false,saves=0;const drafts=new Map()
  const h=harness('components/avatars/ProfileAvatar.tsx',{overrides:{'@/lib/avatar-data':{
    loadAvatar:async()=>row&&copy(row),saveAvatar:async(id,revision,value)=>{saves++;if(fail)throw new Error('Conflit : tes choix sont conservés.');row={user_id:id,configuration:copy(value),revision:(revision??0)+1};return copy(row)}
  },'@/components/ContactDraftProvider':{useContactDraft:()=>({registerPrivateDraft:(id,dirty)=>drafts.set(id,dirty)})}},globals:{Error,window:{addEventListener(){},removeEventListener(){}}}})
  const choices=patch=>({...copy(cartoon.DEFAULT_AVATAR_V3),...patch})
  const render=()=>h.render({ownerId:owner},'ProfileAvatarEditor')
  const click=async label=>{h.find(n=>n.type==='button'&&h.text(n)===label).props.onClick();await h.flush();render();await h.flush();render()}
  render();await h.flush();render();await click('Personnaliser mon avatar')
  h.find(n=>typeof n.type==='function'&&n.props.onChange&&n.props.value?.hairId).props.onChange(choices({hairId:'long_ondules'}));render();await h.flush()
  await click('Annuler');assert.equal(saves,0);assert.equal([...drafts.values()].some(Boolean),false)
  await click('Personnaliser mon avatar');assert.equal(h.find(n=>n.props.value?.hairId).props.value.hairId,'meche')
  h.find(n=>n.props.value?.hairId).props.onChange(choices({hairId:'boucles'}));render();fail=true;await click('Valider les modifications')
  assert.equal(h.find(n=>n.props.value?.hairId).props.value.hairId,'boucles')
  assert.equal(h.find(n=>n.type==='button'&&h.text(n)==='Valider les modifications').props.disabled,true)
  row={user_id:owner,configuration:choices({mouthId:'dents'}),revision:3};await click('Recharger la version enregistrée')
  assert.equal(h.find(n=>n.props.value?.hairId).props.value.hairId,'boucles')
  fail=false;await click('Valider les modifications');assert.equal(row.revision,4);assert.equal(row.configuration.hairId,'boucles')
  assert.match(h.text(),/Avatar enregistré/);h.unmount()
})

test('export 8 : avatar V3 complet et copies de carte inclus, B exclu et aucune donnée de droit secrète',async()=>{
  const avatar=copy(cartoon.DEFAULT_AVATAR_V3),content={format:2,renderVersion:2,templateVersion:1,templateId:'aurore',message:'Publié',signature:'Moi',avatar}
  const db=pageDatabase({avatars_utilisateurs:[{user_id:owner,configuration:avatar},{user_id:other,configuration:config({hairId:'long'})}],cartes_individuelles:[{id:'c',user_id:owner,avatar_signature:avatar}],versions_cartes:[{id:'v',user_id:owner,contenu:content}]},{cap:1})
  db.auth={getUser:async()=>({data:{user:{id:owner}},error:null})}
  const api=loadPure('lib/user-data.ts','exportOwnData,readOwnRows',{...p2Helpers,supabase:db,exportCardLinks:async()=>[{id:'l',statut:'revoque'}]})
  const result=await api.exportOwnData();assert.equal(result.version, 10);assert.equal(result.avatars_utilisateurs.length,1)
  assert.equal(result.avatars_utilisateurs[0].user_id,owner);assert.deepEqual(result.cartes_individuelles[0].avatar_signature,avatar)
  assert.deepEqual(copy(snapshots.supportedCardSnapshot(result.versions_cartes[0].contenu,true).avatar),avatar)
})
