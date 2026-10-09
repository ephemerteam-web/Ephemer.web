'use client'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { useEtoiles } from '@/components/etoiles/EtoilesContext'
import LoadFailure from '@/components/LoadFailure'
import DiagnosticPreview from '@/components/DiagnosticPreview'
import { parseDiagnostic, type Diagnostic } from '@/lib/diagnostic'
import { createRequestScope } from '@/lib/request-scope'
import { readNotifications, markNotificationRead, markAllMergedNotificationsRead as markAllNotificationsRead, notificationKey, type UnifiedNotification } from '@/lib/social-notifications'
import Link from 'next/link'
import { notifyNotificationsChanged, subscribeNotificationChanges } from '@/lib/notification-changes'
import Modal from '@/components/Modal'
import { DEFAULT_PREFERENCES, resolvePreferences } from '@/lib/notification-preferences'
import type { NotificationPreferences } from '@/lib/notification-preferences'


import { useEffect, useState, useCallback, useRef } from 'react'
import { useClock } from '@/lib/hooks/useClock'
import { supabase } from '@/lib/supabase-browser'

type Notification = UnifiedNotification
type Preferences = NotificationPreferences
const PREFS_DEFAUT = DEFAULT_PREFERENCES

function Toggle({ actif, onChange, titre, description, emoji, desactive = false }: {
  actif: boolean; onChange: (v: boolean) => void; titre: string; description: string
  emoji: string; desactive?: boolean
}) {
  return <button onClick={() => !desactive && onChange(!actif)} disabled={desactive} role="switch" aria-checked={actif}
    className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-ink/[0.03] border border-line transition text-left ${desactive ? 'opacity-50 cursor-wait' : 'hover:bg-ink/[0.06]'}`}>
    <div className="flex items-start gap-3 min-w-0"><span className="text-2xl flex-shrink-0">{emoji}</span><div className="min-w-0"><p className="text-ink font-semibold text-sm">{titre}</p><p className="text-muted text-xs mt-0.5">{description}</p></div></div>
    <div className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${actif ? 'bg-indigo-500' : 'bg-ink/15'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${actif ? 'translate-x-6' : 'translate-x-1'}`} /></div>
  </button>
}

export default function CentreNotifications() {
  const user = useDashboardUser()
  const social = useEtoiles()
  const userId = user.id
  const scopeRef = useRef(createRequestScope())
  const now = useClock()
  const [prefsUnavailable, setPrefsUnavailable] = useState(false)
  const [listUnavailable, setListUnavailable] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [prefs, setPrefs] = useState<Preferences>(PREFS_DEFAUT)
  const [chargement, setChargement] = useState(true)
  const [sauvegardePrefs, setSauvegardePrefs] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<({ success: boolean; message: string } & Partial<Diagnostic>) | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState<string | null>(null)
  const [modaleSuppression, setModaleSuppression] = useState(false)
  const [onglet, setOnglet] = useState<'liste' | 'parametres'>('liste')

  async function testerMaintenant() {
  const scope = scopeRef.current
  setTestLoading(true); setTestResult(null)
  try {
    // Récupérer le token de session
    const { data: { session } } = await supabase.auth.getSession()
    if (!scope.current()) return
    if (!session || session.user.id !== user.id) {
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
    if (!res.ok || !data.success) throw new Error('Diagnostic indisponible')
    if (scope.current()) setTestResult({ success: true, message: 'Simulation terminée', ...parseDiagnostic(data) })
  } catch { if (scope.current()) setTestResult({ success: false, message: '❌ Erreur de connexion au serveur' }) }
  finally { if (scope.current()) setTestLoading(false) }
}
  function flash(type: 'erreur' | 'succes', texte: string) {
    if (type === 'erreur') { setErreur(texte); setTimeout(() => setErreur(null), 5000) }
    else { setSucces(texte); setTimeout(() => setSucces(null), 2500) }
  }

  const chargerTout = useCallback(async () => {
    scopeRef.current.cancel()
    const scope = createRequestScope()
    scopeRef.current = scope
    setChargement(true)
    setErreur(null)
    try {
      const [list, preferences] = await Promise.all([
        readNotifications(supabase, user.id),
        supabase.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle()
      ])
      if (!scope.current()) return
      setListUnavailable(false)
      setPrefsUnavailable(!!preferences.error)
      if (preferences.error) { setErreur('Impossible de charger les notifications et préférences. Réessaie.'); return }
      setNotifications(list)
      setPrefs(resolvePreferences(preferences.data))
    } catch {
      if (scope.current()) { setListUnavailable(true); setErreur('Impossible de charger les notifications. Réessaie.') }
    } finally {
      if (scope.current()) setChargement(false)
    }
  }, [user.id])
  useEffect(() => {
    // Chargement réseau initial : aucun état dérivé des props ici.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void chargerTout()
    return () => scopeRef.current.cancel()
  }, [chargerTout])
  useEffect(() => subscribeNotificationChanges((ownerId, source) => {
    if (ownerId === userId && source !== 'centre') void chargerTout()
  }), [userId, chargerTout])

  async function marquerLue(notification: Notification) {
    const scope = scopeRef.current
    try {
      await markNotificationRead(supabase, userId, notification)
      if (scope.current()) { await chargerTout(); notifyNotificationsChanged(userId, 'centre') }
    } catch { if (scope.current()) setErreur('Impossible de marquer comme lu. Réessaie.') }
  }
  async function toutMarquerLu() {
    const scope = scopeRef.current
    try { await markAllNotificationsRead(supabase, userId); if (scope.current()) { await chargerTout(); notifyNotificationsChanged(userId, 'centre') } }
    catch { if (scope.current()) setErreur('Impossible de tout marquer comme lu. Réessaie.') }
  }
  async function supprimer(id: string) {
    const scope = scopeRef.current
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
      if (scope.current()) { await chargerTout(); notifyNotificationsChanged(userId, 'centre') }
    } catch { if (scope.current()) setErreur('Impossible de supprimer cette notification. Réessaie.') }
  }
  async function toutSupprimer() {
    if (!userId) return
    const scope = scopeRef.current
    try {
      const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
      if (error) throw error
      if (scope.current()) { setModaleSuppression(false); await chargerTout(); notifyNotificationsChanged(userId, 'centre'); flash('succes', 'Les rappels ont été supprimés.') }
    } catch { if (scope.current()) setErreur('La suppression a échoué. Tes notifications sont toujours là. Réessaie.') }
  }
  async function changerPref(cle: keyof Preferences, valeur: boolean) {
    if (!userId || prefsUnavailable || sauvegardePrefs) return
    const ancienesPrefs = prefs; const nouvellesPrefs = { ...prefs, [cle]: valeur }
    setPrefs(nouvellesPrefs); setSauvegardePrefs(true)
    const { error } = await supabase.from('notification_preferences').upsert({ user_id: userId, ...nouvellesPrefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSauvegardePrefs(false)
    if (error) { console.error('❌ Erreur sauvegarde préférence :', error.message); setPrefs(ancienesPrefs); flash('erreur', `Préférence non enregistrée : ${error.message}`) }
    else flash('succes', 'Préférence enregistrée ✓')
  }
  function formaterDate(dateStr: string | null) { if (!dateStr) return 'Date inconnue'; return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  function depuisQuand(dateStr: string | null) {
    if (!dateStr) return 'à une date inconnue'
    if (!now) return formaterDate(dateStr)
    const minutes = Math.floor((now - new Date(dateStr).getTime()) / 60000)
    if (minutes < 1) return "à l'instant"; if (minutes < 60) return `il y a ${minutes} min`
    const heures = Math.floor(minutes / 60); if (heures < 24) return `il y a ${heures} h`
    const jours = Math.floor(heures / 24); if (jours === 1) return 'hier'; if (jours < 30) return `il y a ${jours} jours`
    return `il y a ${Math.floor(jours / 30)} mois`
  }
  const nonLues = notifications.filter(n => !n.lue).length

  if (listUnavailable || prefsUnavailable) return <LoadFailure message={erreur || 'Chargement indisponible'} retry={() => { void chargerTout() }} />
  return <div className="p-4 md:p-8"><div className="max-w-3xl mx-auto">
    <div className="mb-6"><h1 className="text-2xl sm:text-3xl font-bold text-ink">🔔 Centre de notifications</h1><p className="text-muted mt-1 text-sm sm:text-base">Consulte tes alertes et règle tes préférences.</p></div>
    {erreur && <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-danger text-sm flex items-start gap-2"><span>⚠️</span><span className="min-w-0 break-words">{erreur}</span></div>}
    {prefsUnavailable && <p role="alert" className="p-3 mb-4 text-danger">Lecture des préférences indisponible. Recharge la page avant de modifier tes réglages.</p>}
    {succes && <div role="status" className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-success text-sm flex items-center gap-2"><span>✓</span><span>{succes}</span></div>}
    <div className="flex gap-2 mb-6 bg-ink/[0.03] p-1 rounded-2xl border border-line">
      <button onClick={() => setOnglet('liste')} className={`flex-1 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition ${onglet === 'liste' ? 'bg-indigo-500 text-white' : 'text-muted hover:text-ink'}`}>📬 <span className="hidden xs:inline">Mes </span>notifications{nonLues > 0 && <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold bg-rose-500 text-white rounded-full">{nonLues}</span>}</button>
      <button onClick={() => setOnglet('parametres')} className={`flex-1 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition ${onglet === 'parametres' ? 'bg-indigo-500 text-white' : 'text-muted hover:text-ink'}`}>⚙️ Paramètres</button>
    </div>
    {chargement ? <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-ink/[0.03] border border-line animate-pulse" />)}</div> : <>
      {onglet === 'liste' && <div>
        {notifications.length > 0 && <div className="flex flex-wrap justify-between items-center gap-3 mb-3"><p className="text-xs text-muted">Les plus récentes en premier</p><div className="flex gap-4 ml-auto">{nonLues > 0 && <button disabled={social.offline} onClick={toutMarquerLu} className="text-xs text-info hover:text-info font-semibold transition">✓ Tout marquer comme lu</button>}<button onClick={() => setModaleSuppression(true)} className="text-xs text-danger hover:text-danger font-semibold transition">🗑 Supprimer les rappels</button></div></div>}
        {listUnavailable ? <p role="alert">Chargement incomplet. Recharge la page pour retrouver toutes tes notifications.</p> : notifications.length === 0 ? <div className="text-center py-16 bg-ink/[0.03] border border-line rounded-2xl"><span className="text-5xl">📭</span><p className="text-ink font-semibold mt-4">Aucune notification</p><p className="text-muted text-sm mt-1">Tes prochains événements apparaîtront ici.</p></div> : <div className="space-y-3">{notifications.map(notif => <div key={notificationKey(notif)} className={`p-4 rounded-2xl border transition ${notif.lue ? 'bg-ink/[0.02] border-line' : 'bg-indigo-500/10 border-indigo-500/30'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className={`text-sm break-words ${notif.lue ? 'text-muted' : 'text-ink font-medium'}`}>{!notif.lue && <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full mr-2" />}{notif.message}</p><p className="text-xs text-accent mt-1">{notif.source === 'etoile' ? <Link href="/dashboard/etoiles">✦ Mes étoiles · ouvrir</Link> : 'Rappel'}</p><div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">{notif.source === 'rappel' && <span className="text-muted text-xs">📅 {formaterDate(notif.event_date)}</span>}<span className="text-muted text-xs">• reçue {depuisQuand(notif.created_at)}</span></div></div><div className="flex flex-col gap-2 flex-shrink-0">{!notif.lue && <button disabled={social.offline} onClick={() => marquerLue(notif)} className="px-3 py-1.5 text-sm text-info hover:text-info font-semibold whitespace-nowrap bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition" title="Marquer comme lu">✓ Lu</button>}{notif.source === 'rappel' && <button onClick={() => supprimer(notif.id)} className="p-2 text-danger hover:text-danger hover:bg-rose-500/10 rounded-lg transition" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}</div></div></div>)}</div>}
      </div>}
      {onglet === 'parametres' && <div className="space-y-6">
        <div className="h-4 text-right">{sauvegardePrefs && <p className="text-xs text-muted">💾 Sauvegarde…</p>}</div>
        <div><h2 className="text-ink font-bold text-lg mb-3">📡 Comment être prévenu ?</h2><div className="space-y-3"><Toggle emoji="📧" titre="Par email" description="Recevoir les alertes dans ta boîte mail." actif={prefs.canal_email} onChange={v => changerPref('canal_email', v)} desactive={sauvegardePrefs || prefsUnavailable} /><Toggle emoji="🔔" titre="Préparer cet appareil" description="Préférence enregistrée. Envoi push indisponible actuellement." actif={prefs.canal_push} onChange={v => changerPref('canal_push', v)} desactive={sauvegardePrefs || prefsUnavailable} /></div></div>
        <div><h2 className="text-ink font-bold text-lg mb-3">⏰ Quand être prévenu ?</h2><div className="space-y-3"><Toggle emoji="7️⃣" titre="7 jours avant" description="Un rappel une semaine à l'avance." actif={prefs.rappel_j7} onChange={v => changerPref('rappel_j7', v)} desactive={sauvegardePrefs || prefsUnavailable} /><Toggle emoji="3️⃣" titre="3 jours avant" description="Un rappel trois jours avant l’événement." actif={prefs.rappel_j3} onChange={v => changerPref('rappel_j3', v)} desactive={sauvegardePrefs || prefsUnavailable} /><Toggle emoji="1️⃣" titre="1 jour avant" description="Un rappel la veille de l'événement." actif={prefs.rappel_j1} onChange={v => changerPref('rappel_j1', v)} desactive={sauvegardePrefs || prefsUnavailable} /><Toggle emoji="🎯" titre="Le jour J" description="Un rappel le jour même." actif={prefs.rappel_jourj} onChange={v => changerPref('rappel_jourj', v)} desactive={sauvegardePrefs || prefsUnavailable} /></div></div>
        <div><h2 className="text-ink font-bold text-lg mb-3">📰 Résumé mensuel</h2><Toggle emoji="🗓" titre="Newsletter du mois" description="Recevoir la liste des événements du mois à venir." actif={prefs.newsletter_mensuelle} onChange={v => changerPref('newsletter_mensuelle', v)} desactive={sauvegardePrefs || prefsUnavailable} /></div>
        <div className="mt-8 p-6 bg-ink/[0.03] rounded-xl border border-line"><h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-ink"><span>🧪</span><span>Tester les notifications</span></h3><p className="text-sm text-muted mb-4">Simule les rappels de votre compte sans créer de notification ni envoyer d&apos;email.</p><button onClick={testerMaintenant} disabled={testLoading} className="px-6 py-3 bg-ink/10 text-ink font-semibold rounded-lg hover:bg-ink/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 touch-manipulation">{testLoading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-line border-t-line rounded-full animate-spin" />Test en cours...</span> : '🚀 Tester maintenant'}</button>{testResult && <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-ink/[0.06] border border-line text-muted' : 'bg-ink/[0.06] border border-line text-muted'}`}>{testResult.success && testResult.preview ? <DiagnosticPreview preview={testResult.preview} recipient={testResult.recipient ?? null} /> : testResult.message}</div>}</div>
      </div>}
    </>}
    {modaleSuppression && <Modal open={modaleSuppression} onClose={() => setModaleSuppression(false)} title="Supprimer les rappels ?"><div className="bg-surface border border-line rounded-2xl p-6 max-w-md w-full shadow-2xl"><div className="text-center"><span className="text-5xl">⚠️</span><h3 className="text-ink font-bold text-lg sm:text-xl mt-4">Supprimer les rappels ?</h3><p className="text-muted text-sm mt-2">Cette action est <strong className="text-danger">irréversible</strong>.<br />Tu as actuellement <strong className="text-ink">{notifications.filter(n => n.source === 'rappel').length}</strong> rappel(s). Les notifications sociales sont conservées.</p></div><div className="flex gap-3 mt-6"><button onClick={() => setModaleSuppression(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink bg-ink/5 hover:bg-ink/10 rounded-xl transition">Annuler</button><button onClick={toutSupprimer} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition">Supprimer les rappels</button></div></div></Modal>}
  </div></div>
}
