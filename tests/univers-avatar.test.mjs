// Source réellement enregistrée et repli personnel : deux valeurs distinctes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './ui-harness.mjs'
const config=harness('lib/avatar-collection-v3.ts').component.DEFAULT_AVATAR_V3
test('univers avatar : absence/invalide ne publie aucun repli, validation et hors ligne actualisent la source',async()=>{
 const window=new EventTarget(),document=new EventTarget(),navigator={onLine:true};document.visibilityState='visible';window.setInterval=()=>1;window.clearInterval=()=>{}
 const h=harness('components/avatars/DashboardAvatarContext.tsx',{globals:{window,document,navigator},overrides:{'@/lib/avatar-data':{loadAvatar:async()=>null}}})
 const render=()=>h.render({ownerId:'A'},'AccountAvatar'),state=()=>h.find(n=>n.props.value?.updateAvatar).props.value
 render();await h.flush();render();assert.ok(state().config);assert.equal(state().savedConfig,null)
 state().updateAvatar({user_id:'A',configuration:{format:99}});render();assert.ok(state().config);assert.equal(state().savedConfig,null)
 state().updateAvatar({user_id:'A',configuration:config});render();assert.equal(state().savedConfig.renderVersion,config.renderVersion)
 navigator.onLine=false;window.dispatchEvent(new Event('offline'));render();assert.equal(state().savedConfig,null);h.unmount()
})
