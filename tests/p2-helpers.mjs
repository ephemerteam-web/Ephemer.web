import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
export function loadPure(path, names, context = {}) {
  const code = stripTypeScriptTypes(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
    .replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm, '').replace(/^export /gm, '')
  return runInNewContext(`${code}\n;({${names}})`, { console, URLSearchParams, process: { env: {} }, ...context })
}
const constants = loadPure('lib/constants.ts','TYPES_EVENEMENT,TYPES_RELATION,normalizeRelation,normalizeOccasion')
const calendar = loadPure('lib/calendar-day.ts','parisDay,isCalendarDay,birthdayInYear,nextBirthdayDay,daysBetween')
const preferences = loadPure('lib/notification-preferences.ts','DEFAULT_PREFERENCES,resolvePreferences')
const pagination = loadPure('lib/pagination.ts','readPages,readAllRows,readAllResult,batches,PAGE_SIZE',constants)
const gifts = loadPure('lib/gift-ideas.ts','giftOccasion,usableGiftIdeas',constants)
const saints = loadPure('lib/saints.ts','trouverSaintParPrenom')
const months = loadPure('lib/month-events.ts','monthEvents,requestedMonth',{ ...calendar, ...saints })
export const p2Helpers = { ...constants, ...calendar, ...preferences, ...pagination, ...gifts, ...months }

// Requête simulée avec un vrai ordre et curseur ; plafond inférieur au lot demandé.
export function pageDatabase(tables, { cap = 200, failAt = Infinity, onRead = () => {} } = {}) {
  let reads = 0
  return { from(table) {
    let key = 'id', limit = cap, single = false, action = 'read', values
    const filters = []
    const query = {
      select: () => query, order: column => { key = column; return query },
      limit: size => { limit = Math.min(size, cap); return query },
      gt: (k,v) => { filters.push(row => row[k] > v); return query },
      eq: (k,v) => { filters.push(row => row[k] === v); return query },
      in: (k,v) => { filters.push(row => v.includes(row[k])); return query },
      lte: (k,v) => { filters.push(row => row[k] <= v); return query },
      gte: (k,v) => { filters.push(row => row[k] >= v); return query },
      maybeSingle: () => { single = true; return query },
      update: value => { action = 'update'; values = value; return query },
      then(resolve) {
        if (action === 'read' && ++reads === failAt) return Promise.resolve({ data: null, error: new Error('Erreur intermédiaire simulée') }).then(resolve)
        const rows = (tables[table] ?? []).filter(row => filters.every(filter => filter(row)))
        if (action === 'update') rows.forEach(row => Object.assign(row, values))
        const data = rows.sort((a,b) => a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0).slice(0,limit)
        if (action === 'read') onRead(data)
        return Promise.resolve({ data: single ? data[0] ?? null : data, error: null }).then(resolve)
      }
    }
    return query
  } }
}
