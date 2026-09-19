import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { compile } from '@tailwindcss/node'
import { fileURLToPath } from 'node:url'
const source = stripTypeScriptTypes(readFileSync(new URL('../lib/theme.ts', import.meta.url), 'utf8')).replace(/^export /gm, '')
const { validTheme, resolvedTheme } = runInNewContext(source + ';({validTheme,resolvedTheme})')
test('thème : défaut automatique, choix explicite et préférence système', () => {
  assert.equal(validTheme(null), 'system'); assert.equal(validTheme('malicious'), 'system')
  assert.equal(resolvedTheme('system', false), 'light'); assert.equal(resolvedTheme('system', true), 'dark')
  assert.equal(resolvedTheme('light', true), 'light')
})
test('premier affichage : CSS suit le système sans balise script dans le layout', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
  assert.match(css, /prefers-color-scheme:\s*light/)
  assert.match(css, /:root:not\(\[data-theme\]\)/)
  assert.doesNotMatch(layout, /<script|<Script|next\/script|THEME_INIT/)
})
test('contrastes des tokens de texte et des actions : au moins 4.5:1 dans les deux thèmes', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  function lum(hex) {
    const channels = hex.match(/[0-9a-f]{2}/gi).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4)
    return channels[0]*.2126 + channels[1]*.7152 + channels[2]*.0722
  }
  for (const selector of [':root', '[data-theme="light"]']) {
    const block = css.slice(css.indexOf(selector)).split('}')[0]
    const vars = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f0-9]{6})/gi)].map(m=>[m[1],m[2]]))
    for (const [fg,bg] of [['ink','canvas'],['muted','canvas'],['muted','surface'],['accent','canvas'],['danger','surface'],['success','surface'],['warning','surface'],['info','surface'],['on-action','action'], ...['message-start','message-end','gift-start','gift-end'].flatMap(bg => [['ink', bg], ['muted', bg]])]) {
      const [a,b]=[lum(vars[fg]),lum(vars[bg])].sort((x,y)=>y-x)
      assert.ok((a+.05)/(b+.05) >= 4.5, `${selector} ${fg}/${bg}`)
    }
  }
})

test('CSS compilé : les classes de thème et les deux palettes sont réellement émises', async () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  const compiler = await compile(css, { base: fileURLToPath(new URL('..', import.meta.url)), onDependency() {} })
  const output = compiler.build(['bg-canvas', 'text-ink', 'text-muted', 'bg-surface', 'from-message-start', 'to-gift-end'])
  for (const property of ['background-color: var(--canvas)', 'color: var(--ink)', 'color: var(--muted)', 'background-color: var(--surface)']) assert.ok(output.includes(property), property)
  assert.ok(output.includes('[data-theme="light"]'))
  assert.ok(output.includes('[data-theme="dark"]'))
  assert.ok(output.includes('--canvas: #0b1425'))
  assert.ok(output.includes('--canvas: #faf6ef'))
})
