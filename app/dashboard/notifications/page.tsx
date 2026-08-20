'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-browser'

type Notification = {
  id: string; user_id: string; contact_id: number; type: string; message: string
  lue: boolean; event_date: string; created_at: string; event_description: string | null
}
type Preferences = {
  canal_email: boolean; canal_push: boolean; rappel_j7: boolean; rappel_j3: boolean
  rappel_j1: boolean; rappel_jourj: boolean; newsletter_mensuelle: boolean
}
const PREFS_DEFAUT: Preferences = {
  canal_email: true, canal_push: false, rappel_j7: true, rappel_j3: false,
  rappel_j1: false, rappel_jourj: true, newsletter_mensuelle: false,
}

function Toggle({ actif, onChange, titre, description, emoji, desactive = false }: {
  actif: boolean; onChange: (v: boolean) => void; titre: string; description: string
  emoji: string; desactive?: boolean
}) {
  return <button onClick={() => !desactive && onChange(!actif)} disabled={desactive}
    className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 transition text-left ${desactive ? 'opacity-50 cursor-wait' : 'hover:bg-white/[0.06]'}`}>
    <div className="flex items-start gap-3 min-w-0"><span className="text-2xl flex-shrink-0">{emoji}</span><div className="min-w-0"><p className="text-white font-semibold text-sm">{titre}</p><p className="text-white/40 text-xs mt-0.5">{description}</p></div></div>
    <div className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${actif ? 'bg-indigo-500' : 'bg-white/15'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${actif ? 'translate-x-6' : 'translate-x-1'}`} /></div>
  </button>
}

export default function CentreNotifications() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [prefs, setPrefs] = useState<Preferences>(PREFS_DEFAUT)
  const [chargement, setChargement] = useState(true)
  const [sauvegardePrefs, setSauvegardePrefs] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState<string | null>(null)
  const [modaleSuppression, setModaleSuppression] = useState(false)
  const [onglet, setOnglet] = useState<'liste' | 'parametres'>('liste')
  const supabase = getSupabaseClient()
  

  async function testerMaintenant() {
  setTestLoading(true); setTestResult(null)
  try {
    // Récupérer le token de session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setTestResult({ success: false, message: '❌ Tu dois être connecté' })
      return
    }

    const res = await fetch('/api/cron/test-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`  // ← Token envoyé ici
      }
    })
    const data = await res.json()
    setTestResult(data.success
      ? { success: true, message: `✅ Test terminé ! ${data.notifs} notification(s) créée(s), ${data.emails} email(s) envoyé(s).` }
      : { success: false, message: `❌ Erreur : ${data.error || 'Erreur inconnue'}` })
  } catch { setTestResult({ success: false, message: '❌ Erreur de connexion au serveur' }) }
  finally { setTestLoading(false) }
}
  function flash(type: 'erreur' | 'succes', texte: string) {
    if (type === 'erreur') { setErreur(texte); setTimeout(() => setErreur(null), 5000) }
    else { setSucces(texte); setTimeout(() => setSucces(null), 2500) }
  }

  const chargerTout = useCallback(async () => {
    setChargement(true); setErreur(null)
    const { data: { user }, error: errUser } = await supabase.auth.getUser()
    if (errUser || !user) { router.push('/connexion'); return }
    setUserId(user.id)
    const { data: notifs, error: errNotifs } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).order('event_date', { ascending: true })
    if (errNotifs) { console.error('❌ Erreur chargement notifications :', errNotifs.message); flash('erreur', `Impossible de charger tes notifications : ${errNotifs.message}`) }
    else setNotifications(notifs || [])
    const { data: pref, error: errPref } = await supabase.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle()
    if (errPref) { console.error('❌ Erreur chargement préférences :', errPref.message); flash('erreur', `Impossible de charger tes préférences : ${errPref.message}`) }
    else if (pref) setPrefs({ canal_email: pref.canal_email, canal_push: pref.canal_push, rappel_j7: pref.rappel_j7, rappel_j3: pref.rappel_j3, rappel_j1: pref.rappel_j1, rappel_jourj: pref.rappel_jourj, newsletter_mensuelle: pref.newsletter_mensuelle })
    setChargement(false)
  }, [router])
  useEffect(() => { chargerTout() }, [chargerTout])

  async function marquerLue(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lue: true } : n))
    const { error } = await supabase.from('notifications').update({ lue: true }).eq('id', id)
    if (error) { console.error('❌ Erreur marquerLue :', error.message); setNotifications(prev => prev.map(n => n.id === id ? { ...n, lue: false } : n)); flash('erreur', 'Impossible de marquer comme lu. Réessaie.') }
  }
  async function toutMarquerLu() {
    if (!userId) return
    const avant = notifications; setNotifications(prev => prev.map(n => ({ ...n, lue: true })))
    const { error } = await supabase.from('notifications').update({ lue: true }).eq('user_id', userId).eq('lue', false)
    if (error) { console.error('❌ Erreur toutMarquerLu :', error.message); setNotifications(avant); flash('erreur', 'Impossible de tout marquer comme lu.') }
  }
  async function supprimer(id: string) {
    const avant = notifications; setNotifications(prev => prev.filter(n => n.id !== id))
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) { console.error('❌ Erreur suppression :', error.message); setNotifications(avant); flash('erreur', 'Impossible de supprimer cette notification.') }
  }
  async function toutSupprimer() {
    if (!userId) return
    const avant = notifications; setNotifications([]); setModaleSuppression(false)
    const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
    if (error) { console.error('❌ Erreur suppression globale :', error.message); setNotifications(avant); flash('erreur', 'La suppression a échoué. Tes notifications sont toujours là.') }
    else flash('succes', 'Toutes les notifications ont été supprimées.')
  }
  async function changerPref(cle: keyof Preferences, valeur: boolean) {
    if (!userId) return
    const ancienesPrefs = prefs; const nouvellesPrefs = { ...prefs, [cle]: valeur }
    setPrefs(nouvellesPrefs); setSauvegardePrefs(true)
    const { error } = await supabase.from('notification_preferences').upsert({ user_id: userId, ...nouvellesPrefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSauvegardePrefs(false)
    if (error) { console.error('❌ Erreur sauvegarde préférence :', error.message); setPrefs(ancienesPrefs); flash('erreur', `Préférence non enregistrée : ${error.message}`) }
    else flash('succes', 'Préférence enregistrée ✓')
  }
  function formaterDate(dateStr: string) { return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  function depuisQuand(dateStr: string) {
    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (minutes < 1) return "à l'instant"; if (minutes < 60) return `il y a ${minutes} min`
    const heures = Math.floor(minutes / 60); if (heures < 24) return `il y a ${heures} h`
    const jours = Math.floor(heures / 24); if (jours === 1) return 'hier'; if (jours < 30) return `il y a ${jours} jours`
    return `il y a ${Math.floor(jours / 30)} mois`
  }
  const nonLues = notifications.filter(n => !n.lue).length

  return <div className="p-4 md:p-8"><div className="max-w-3xl mx-auto">
    <div className="mb-6"><h1 className="text-2xl sm:text-3xl font-bold text-white">🔔 Centre de notifications</h1><p className="text-white/40 mt-1 text-sm sm:text-base">Consulte tes alertes et règle tes préférences.</p></div>
    {erreur && <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-2"><span>⚠️</span><span className="min-w-0 break-words">{erreur}</span></div>}
    {succes && <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2"><span>✓</span><span>{succes}</span></div>}
    <div className="flex gap-2 mb-6 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
      <button onClick={() => setOnglet('liste')} className={`flex-1 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition ${onglet === 'liste' ? 'bg-indigo-500 text-white' : 'text-white/50 hover:text-white'}`}>📬 <span className="hidden xs:inline">Mes </span>notifications{nonLues > 0 && <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold bg-rose-500 text-white rounded-full">{nonLues}</span>}</button>
      <button onClick={() => setOnglet('parametres')} className={`flex-1 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition ${onglet === 'parametres' ? 'bg-indigo-500 text-white' : 'text-white/50 hover:text-white'}`}>⚙️ Paramètres</button>
    </div>
    {chargement ? <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/10 animate-pulse" />)}</div> : <>
      {onglet === 'liste' && <div>
        {notifications.length > 0 && <div className="flex flex-wrap justify-between items-center gap-3 mb-3"><p className="text-xs text-white/30">Les plus récentes en premier</p><div className="flex gap-4 ml-auto">{nonLues > 0 && <button onClick={toutMarquerLu} className="text-xs text-indigo-300 hover:text-indigo-200 font-semibold transition">✓ Tout marquer comme lu</button>}<button onClick={() => setModaleSuppression(true)} className="text-xs text-rose-400/70 hover:text-rose-400 font-semibold transition">🗑 Tout supprimer</button></div></div>}
        {notifications.length === 0 ? <div className="text-center py-16 bg-white/[0.03] border border-white/10 rounded-2xl"><span className="text-5xl">📭</span><p className="text-white font-semibold mt-4">Aucune notification</p><p className="text-white/40 text-sm mt-1">Tes prochains événements apparaîtront ici.</p></div> : <div className="space-y-3">{notifications.map(notif => <div key={notif.id} className={`p-4 rounded-2xl border transition ${notif.lue ? 'bg-white/[0.02] border-white/5' : 'bg-indigo-500/10 border-indigo-500/30'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className={`text-sm break-words ${notif.lue ? 'text-white/60' : 'text-white font-medium'}`}>{!notif.lue && <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full mr-2" />}{notif.message}</p><div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5"><span className="text-white/30 text-xs">📅 {formaterDate(notif.event_date)}</span><span className="text-white/20 text-xs">• reçue {depuisQuand(notif.created_at)}</span></div></div><div className="flex flex-col gap-2 flex-shrink-0">{!notif.lue && <button onClick={() => marquerLue(notif.id)} className="px-3 py-1.5 text-sm text-indigo-300 hover:text-indigo-200 font-semibold whitespace-nowrap bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition" title="Marquer comme lu">✓ Lu</button>}<button onClick={() => supprimer(notif.id)} className="p-2 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></div></div>)}</div>}
      </div>}
      {onglet === 'parametres' && <div className="space-y-6">
        <div className="h-4 text-right">{sauvegardePrefs && <p className="text-xs text-white/40">💾 Sauvegarde…</p>}</div>
        <div><h2 className="text-white font-bold text-lg mb-3">📡 Comment être prévenu ?</h2><div className="space-y-3"><Toggle emoji="📧" titre="Par email" description="Recevoir les alertes dans ta boîte mail." actif={prefs.canal_email} onChange={v => changerPref('canal_email', v)} desactive={sauvegardePrefs} /><Toggle emoji="🔔" titre="Notifications push" description="Recevoir une alerte sur ton appareil." actif={prefs.canal_push} onChange={v => changerPref('canal_push', v)} desactive={sauvegardePrefs} /></div></div>
        <div><h2 className="text-white font-bold text-lg mb-3">⏰ Quand être prévenu ?</h2><div className="space-y-3"><Toggle emoji="7️⃣" titre="7 jours avant" description="Un rappel une semaine à l'avance." actif={prefs.rappel_j7} onChange={v => changerPref('rappel_j7', v)} desactive={sauvegardePrefs} /><Toggle emoji="1️⃣" titre="1 jour avant" description="Un rappel la veille de l'événement." actif={prefs.rappel_j1} onChange={v => changerPref('rappel_j1', v)} desactive={sauvegardePrefs} /><Toggle emoji="🎯" titre="Le jour J" description="Un rappel le jour même." actif={prefs.rappel_jourj} onChange={v => changerPref('rappel_jourj', v)} desactive={sauvegardePrefs} /></div></div>
        <div><h2 className="text-white font-bold text-lg mb-3">📰 Résumé mensuel</h2><Toggle emoji="🗓" titre="Newsletter du mois" description="Recevoir la liste des événements du mois à venir." actif={prefs.newsletter_mensuelle} onChange={v => changerPref('newsletter_mensuelle', v)} desactive={sauvegardePrefs} /></div>
        <div className="mt-8 p-6 bg-white/[0.03] rounded-xl border border-white/10"><h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-white"><span>🧪</span><span>Tester les notifications</span></h3><p className="text-sm text-white/60 mb-4">Force la génération des notifications et l'envoi d'un email de test pour votre compte uniquement.</p><button onClick={testerMaintenant} disabled={testLoading} className="px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 touch-manipulation">{testLoading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Test en cours...</span> : '🚀 Tester maintenant'}</button>{testResult && <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-white/[0.06] border border-white/10 text-white/80' : 'bg-white/[0.06] border border-white/10 text-white/80'}`}>{testResult.message}</div>}</div>
      </div>}
    </>}
    {modaleSuppression && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div className="bg-[#1e1b4b] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"><div className="text-center"><span className="text-5xl">⚠️</span><h3 className="text-white font-bold text-lg sm:text-xl mt-4">Supprimer toutes les notifications ?</h3><p className="text-white/60 text-sm mt-2">Cette action est <strong className="text-rose-400">irréversible</strong>.<br />Tu as actuellement <strong className="text-white">{notifications.length}</strong> notification{notifications.length > 1 ? 's' : ''}.</p></div><div className="flex gap-3 mt-6"><button onClick={() => setModaleSuppression(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition">Annuler</button><button onClick={toutSupprimer} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition">Oui, tout supprimer</button></div></div></div>}
  </div></div>
}
