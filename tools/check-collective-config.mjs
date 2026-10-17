// Présence/format uniquement. Ne jamais imprimer de valeur, même en erreur.
import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} })
const names=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','EPHEMER_CARD_LINK_KEY','RESEND_API_KEY','RESEND_WEBHOOK_SECRET','CRON_SECRET']
console.log(JSON.stringify(Object.fromEntries(names.map(name=>[name,{presente:!!process.env[name],...(name==='EPHEMER_CARD_LINK_KEY'?{formatValide:/^[0-9a-f]{64}$/i.test(process.env[name]??'')}: {})}]))))
