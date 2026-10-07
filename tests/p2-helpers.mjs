import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
export function loadPure(path, names, context = {}) {
  const code = stripTypeScriptTypes(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
    .replace(/^import ['"][^'"]+['"];?\r?\n/gm, '').replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm, '').replace(/^export /gm, '')
  return runInNewContext(`${code}\n;({${names}})`, { console, URLSearchParams, process: { env: {} }, ...context })
}
const constants = loadPure('lib/constants.ts','TYPES_EVENEMENT,TYPES_RELATION,TONS_MESSAGE,normalizeRelation,normalizeOccasion')
const amounts = loadPure('lib/attention-utils.ts', 'CURRENCIES,centsInput')
const aiOptions = loadPure('lib/ai-options.ts', 'AIInputError,commonAIOptions,messageAIOptions,giftAIOptions,localMessage,GIFT_MODES,MESSAGE_LENGTHS', { ...constants, ...amounts })
const aiTransport = loadPure('lib/ai-transport.ts', 'aiRequest,providerText,limitedJSON', { ...aiOptions, TextDecoder })
const consent = loadPure('lib/ai-consent.ts', 'consentInput,contactAIContext')
const aiContext = loadPure('lib/ai-consent-server.ts', 'personalAIContext', { ...consent, parisDay: () => '2026-10-06' })
const calendar = loadPure('lib/calendar-day.ts','parisDay,isCalendarDay,birthdayInYear,nextBirthdayDay,daysBetween')
const preferences = loadPure('lib/notification-preferences.ts','DEFAULT_PREFERENCES,resolvePreferences')
const pagination = loadPure('lib/pagination.ts','readPages,readAllRows,readAllResult,batches,PAGE_SIZE',constants)
const gifts = loadPure('lib/gift-ideas.ts','giftOccasion,usableGiftIdeas',constants)
const saints = loadPure('lib/saints.ts','trouverSaintParPrenom')
const months = loadPure('lib/month-events.ts','monthEvents,requestedMonth',{ ...calendar, ...saints })
const journal = loadPure('lib/email-journal.ts','validateJournalResponse,emailJournalRpc')
const ids = loadPure('lib/database-id.ts','databaseId')
const personal = loadPure('lib/personal-events.ts','eventViews,previewEventViews,monthWindow,shiftDay',{ ...calendar, ...months })
const reminderPolicy = loadPure('lib/reminder-policy.ts','enabledMilestones',{ ...calendar, ...preferences })
const occurrencePolicy = loadPure('lib/occurrence-reminders.ts','occurrenceNotifications,occurrenceRecap',{ ...calendar, ...reminderPolicy })
const listHelpers = loadPure('lib/private-lists.ts','isUuid,contactsInList,changeMembership,renameList,readPrivateLists',pagination)
const eventLoader = loadPure('lib/personal-event-data.ts','readEventData',{ ...calendar, ...pagination, ...personal })
const rappelHelpers = loadPure('lib/rappel-occurrence.ts','rappelOccurrenceCurrent')
const notificationPersistence = loadPure('lib/occurrence-notifications.ts','persistOccurrenceNotification')
// Les anciennes fixtures ne contiennent aucune occurrence. Leur RPC simulée
// retourne une table vide ; les nouveaux tests fournissent leur propre RPC.
async function readEventData(client, ...args) {
  return eventLoader.readEventData({ ...client, rpc: client.rpc ?? (() => pageDatabase({ rows: [] }).from('rows')) }, ...args)
}
// Les anciennes recettes d'export n'ont aucun droit de carte ; la route est testée séparément.
export const p2Helpers = { ...ids, ...journal, ...constants, ...amounts, ...aiOptions, ...aiTransport, ...calendar, ...preferences, ...pagination, ...gifts, ...months, ...personal, ...reminderPolicy, ...occurrencePolicy, ...notificationPersistence, ...listHelpers, ...rappelHelpers, ...consent, ...aiContext, readEventData, exportCardLinks: async () => [] }

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
      is: (k,v) => { filters.push(row => row[k] === v); return query },
      or: expression => {
        if (expression !== 'lue.eq.false,lue.is.null') throw new Error('Filtre inattendu')
        filters.push(row => row.lue === false || row.lue === null); return query
      },
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
