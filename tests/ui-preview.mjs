// Aperçu visuel isolé : SSR uniquement, pas d'hydratation ni accès Supabase.
// Lancer : node tests/ui-preview.mjs, puis http://127.0.0.1:3199/?theme=light
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { compile } from '@tailwindcss/node'
const moduleLoad = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cache = new Map()
function sourceModule(file) {
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const source = fs.readFileSync(file, 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const localRequire = name => {
    if (name === '@/lib/supabase-browser') return { supabase: {} }
    if (name === 'next/navigation') return { useRouter: () => ({ push() {}, refresh() {} }), useSearchParams: () => new URLSearchParams() }
    if (name === 'next/link') return function PreviewLink({ children, ...props }) { return React.createElement('a', props, children) }
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name)
      const target = ['.tsx', '.ts'].map(ext => base + ext).find(f => fs.existsSync(f))
      if (!target || !target.startsWith(root + path.sep)) throw new Error('Module hors aperçu')
      if (target.endsWith(`${path.sep}supabase-browser.ts`)) return { supabase: {} }
      return sourceModule(target)
    }
    return moduleLoad(name)
  }
  new Function('require', 'exports', code)(localRequire, exports)
  return exports
}
async function main() {
  const candidates = []
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) scan(file)
      else if (/\.tsx$/.test(entry.name)) candidates.push(...fs.readFileSync(file, 'utf8').split(/[\s"'`<>]+/))
    }
  }
  scan(path.join(root, 'app')); scan(path.join(root, 'components'))
  const compiler = await compile(fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8'), { base: root, onDependency() {} })
  const css = compiler.build(candidates)
  const pages = { connexion: 'app/connexion/page.tsx', reset: 'app/reset-password/page.tsx', donnees: 'app/dashboard/donnees/page.tsx' }
  const server = http.createServer((req,res) => {
    const url = new URL(req.url, 'http://127.0.0.1:3199')
    const view = Object.hasOwn(pages, url.searchParams.get('view')) ? url.searchParams.get('view') : 'connexion'
    const theme = url.searchParams.get('theme') === 'light' ? 'light' : 'dark'
    const Page = sourceModule(path.join(root, pages[view])).default
    const markup = renderToStaticMarkup(React.createElement(Page))
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'" })
    res.end(`<!doctype html><html lang="fr" data-theme="${theme}"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Aperçu isolé Ephemer</title><style>${css}</style><body><p style="padding:12px;text-align:center">Aperçu isolé — données fictives, actions inactives · <a href="?theme=light&view=${view}">Clair</a> · <a href="?theme=dark&view=${view}">Sombre</a></p>${markup}</body></html>`)
  })
  server.listen(3199, '127.0.0.1', () => console.log('Aperçu isolé : http://127.0.0.1:3199'))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
