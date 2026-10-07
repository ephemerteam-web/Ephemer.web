// 🧪 Contrat et crypto réels, UI simulée. Ces tests ne prouvent pas les RLS distantes.
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'
import { loadPure } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'

const contract = loadPure('lib/cards.ts', 'CARD_TEMPLATES,CARD_EXPIRY_DAYS,cardSnapshot,isCardTemplate')
const crypto = loadPure('lib/card-link-crypto.ts', 'newCardSecret,isCardSecret,cardSecretHash,encryptCardSecret,decryptCardSecret', { Buffer,createCipheriv,createDecipheriv,createHash,randomBytes })
const snapshot = overrides => ({ format:1, templateId:'clair_de_lune', templateVersion:1, renderVersion:1, message:'Un beau moment\npour toi.', signature:'Avec affection', ...overrides })

test('cartes : trois modèles fermés, versions inconnues et données additionnelles refusées', () => {
  for (const template of contract.CARD_TEMPLATES) assert.equal(contract.cardSnapshot(snapshot({templateId:template.id}),true).templateId,template.id)
  assert.equal(contract.CARD_TEMPLATES.length,3)
  for (const value of [null, [], {}, snapshot({templateId:'<svg onload=alert(1)>'}), snapshot({renderVersion:2}), snapshot({templateVersion:2}), snapshot({format:'1'}), snapshot({contact:{note:'PRIVEE'}}), snapshot({message:9}), snapshot({signature:null}), snapshot({message:'\u0000'})]) assert.throws(()=>contract.cardSnapshot(value))
  assert.equal(contract.cardSnapshot(snapshot({message:''})).message,'')
  for (const message of ['', ' \t\n', '\u00a0\u2000\ufeff']) assert.throws(()=>contract.cardSnapshot(snapshot({message}),true))
})
test('cartes : limites en caractères Unicode compatibles avec PostgreSQL', () => {
  assert.equal(contract.cardSnapshot(snapshot({message:'🌙'.repeat(10000),signature:'🌙'.repeat(200)})).signature.length,400)
  for(const value of [snapshot({message:'x'.repeat(10001)}),snapshot({signature:'✨'.repeat(201)})]) assert.throws(()=>contract.cardSnapshot(value))
  assert.deepEqual(Array.from(contract.CARD_EXPIRY_DAYS),[7,30,90,365])
})
test('rendu réel : texte hostile échappé, aucune balise/lien/image injectés dans les trois modèles', () => {
  const renderer=harness('components/cards/CardRendererV1.tsx').component.default
  for(const template of contract.CARD_TEMPLATES){
    const value=snapshot({templateId:template.id,message:'<script>alert(1)</script>\n<img src="https://example.invalid/" onerror="alert(2)"> javascript:alert(3)',signature:'<a href="https://example.invalid">Signature</a>'})
    const html=renderToStaticMarkup(React.createElement(renderer,{snapshot:value}))
    assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
    assert.doesNotMatch(html,/<(?:script|img|a)[\s>]/)
    assert.match(html,/aria-hidden="true"/);assert.match(html,/focusable="false"/)
    assert.match(html,/overflow-wrap:anywhere/);assert.match(html,/whitespace-pre-wrap/)
    assert.match(html,/data-card-render-version="1"/)
  }
})
test('copie figée : changer la source ne réécrit pas la projection ni son rendu', () => {
  const draft=snapshot(), frozen=contract.cardSnapshot(draft,true)
  const renderer=harness('components/cards/CardRendererV1.tsx').component.default
  const before=renderToStaticMarkup(React.createElement(renderer,{snapshot:frozen}))
  Object.assign(draft,{message:'Autre texte',signature:'Autre signature',templateId:'aurore',contactNote:'PRIVEE'})
  assert.equal(renderToStaticMarkup(React.createElement(renderer,{snapshot:frozen})),before)
  assert.doesNotMatch(before,/Autre texte|PRIVEE/)
})
test('secret réel : 256 bits aléatoires, encodage canonique et empreinte SHA-256', () => {
  const a=crypto.newCardSecret(),b=crypto.newCardSecret()
  assert.notEqual(a,b);assert.equal(Buffer.from(a,'base64url').length,32);assert.equal(a.length,43)
  assert.equal(crypto.cardSecretHash(a),createHash('sha256').update(a).digest('hex'))
  for(const value of [null,42,'',a+'=',a.slice(0,-1),a+'x','!'.repeat(43)]){assert.equal(crypto.isCardSecret(value),false);assert.throws(()=>crypto.cardSecretHash(value))}
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const last=alphabet.indexOf(a.at(-1));const noncanonical=a.slice(0,-1)+alphabet[last+1]
  assert.equal(crypto.isCardSecret(noncanonical),false)
})
test('chiffrement réel : récupération après une nouvelle instance, nonce distinct et contexte authentifié', () => {
  const key=randomBytes(32).toString('hex'),context={ownerId:randomUUID(),cardId:randomUUID(),linkId:randomUUID()},secret=crypto.newCardSecret()
  const encrypted=crypto.encryptCardSecret(secret,context,key)
  assert.equal(crypto.decryptCardSecret(JSON.parse(JSON.stringify(encrypted)),context,key),secret)
  assert.notEqual(crypto.encryptCardSecret(secret,context,key).nonce,encrypted.nonce)
  assert.ok(!JSON.stringify(encrypted).includes(secret))
  assert.equal(encrypted.ciphertext.length,64)
  for(const property of ['ownerId','cardId','linkId'])assert.throws(()=>crypto.decryptCardSecret(encrypted,{...context,[property]:randomUUID()},key),/Lien indisponible/)
  assert.throws(()=>crypto.decryptCardSecret(encrypted,context,randomBytes(32).toString('hex')),/Lien indisponible/)
})
test('chiffrement : matériel altéré et clé manquante refusés sans afficher leur valeur', () => {
  const key=randomBytes(32).toString('hex'),context={ownerId:randomUUID(),cardId:randomUUID(),linkId:randomUUID()},secret=crypto.newCardSecret(),encrypted=crypto.encryptCardSecret(secret,context,key)
  for(const property of ['ciphertext','nonce','tag']){
    const changed=(encrypted[property][0]==='0'?'1':'0')+encrypted[property].slice(1)
    assert.throws(()=>crypto.decryptCardSecret({...encrypted,[property]:changed},context,key),/Lien indisponible/)
  }
  assert.throws(()=>crypto.decryptCardSecret({...encrypted,format:2},context,key))
  for(const value of [undefined,'','malformed',randomBytes(16).toString('hex')]){
    assert.throws(()=>crypto.encryptCardSecret(secret,context,value),/EPHEMER_CARD_LINK_KEY absente ou invalide/)
    assert.throws(()=>crypto.decryptCardSecret(encrypted,context,value),/EPHEMER_CARD_LINK_KEY absente ou invalide/)
  }
})
