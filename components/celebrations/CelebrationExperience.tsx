'use client'
import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import Modal from '../Modal'
import CelebrationTabs from '../CelebrationTabs'
import { useDashboardUser } from '../DashboardUserContext'
import { useEtoiles } from '../etoiles/EtoilesContext'
import { EditForm, TextField, NoteField, button, field, panel, text, optional } from '../AttentionShared'
import { celebrationService, type CelebrationService } from '@/lib/celebration-data'
import { CELEBRATIONS_ENABLED, celebrationCommand, type CelebrationAction, type CelebrationDetail, type CelebrationSummary, type CelebrationInvitation, type CelebrationTask, type CelebrationComment } from '@/lib/celebration-contract'
import { parisDay } from '@/lib/calendar-day'

type Source = { preparation: string; titre: string; date: string; taches: { id: string; titre: string; type: string }[] }
const stateLabels = { active: 'En cours', annulee: 'Annulée', archivee: 'Archivée', supprimee: 'Supprimée', suspendue: 'Suspendue' }
const statusLabels: Record<string, string> = { attente: 'En attente', acceptee: 'Acceptée', refusee: 'Refusée', fermee: 'Fermée' }
function subscribeNetwork(callback:()=>void){window.addEventListener('online',callback);window.addEventListener('offline',callback);return()=>{window.removeEventListener('online',callback);window.removeEventListener('offline',callback)}}

function useQuery<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const loaderRef = useRef(loader)
  useEffect(() => { loaderRef.current = loader })
  const [data, setData] = useState<T | null>(null), [error, setError] = useState(''), [version, setVersion] = useState(0)
  const offline=useSyncExternalStore(subscribeNetwork,()=>!navigator.onLine,()=>false)
  const invalidate = () => { setData(null); setError('Cette célébration est indisponible. Les contenus partagés ont été retirés de cet écran.') }
  useEffect(() => {
    const abort = new AbortController()
    if (!navigator.onLine) return () => abort.abort()
    loaderRef.current(abort.signal).then(result => { if (!abort.signal.aborted) { setData(result); setError('') } }, cause => {
      if (abort.signal.aborted) return
      if ([401,403,404].includes(cause?.status)) setData(null)
      setError(cause instanceof Error ? cause.message : 'Lecture indisponible. Réessaie.')
    })
    return () => abort.abort()
  }, [version])
  useEffect(() => {
    const change = () => { if (navigator.onLine) setVersion(v => v + 1) }
    const focus = () => { if (navigator.onLine) setVersion(v => v + 1) }
    window.addEventListener('online',change); window.addEventListener('offline',change); window.addEventListener('focus',focus)
    return () => { window.removeEventListener('online',change); window.removeEventListener('offline',change); window.removeEventListener('focus',focus) }
  }, [])
  return { data, error, offline, reload: () => setVersion(v => v + 1), invalidate }
}
function useActions(owner: string, api: CelebrationService, refresh: () => void, invalidate: () => void) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const pending = useRef(false), mounted = useRef(true), ids = useRef(new Map<string,string>()), aborts = useRef(new Set<AbortController>())
  useEffect(() => { mounted.current = true; const controllers=aborts.current,operations=ids.current;return () => { mounted.current = false; controllers.forEach(controller => controller.abort()); operations.clear() } }, [])
  async function run(action: CelebrationAction, donnees: Record<string, unknown>) {
    if (pending.current) throw new Error('Une action est déjà en cours.')
    if (!navigator.onLine) throw new Error('Connexion requise pour enregistrer. Ta saisie reste dans cet onglet.')
    const fingerprint = JSON.stringify([action,donnees])
    if (!ids.current.has(fingerprint)) ids.current.set(fingerprint,crypto.randomUUID())
    const command = celebrationCommand({ action, donnees, operation: ids.current.get(fingerprint) })
    const controller = new AbortController(); aborts.current.add(controller)
    pending.current = true; setBusy(true); setError(''); setNotice('')
    try {
      const result = await api.commander(owner,command,controller.signal)
      if (!mounted.current || controller.signal.aborted) throw new DOMException('Action abandonnée.','AbortError')
      setNotice('Ton action a été enregistrée.'); refresh(); return result
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted) {
        if ([401,403,404].includes((cause as {status?: number})?.status??0)) invalidate()
        setError(cause instanceof Error ? cause.message : 'Action indisponible. Ta saisie est conservée.')
      }
      throw cause
    } finally { aborts.current.delete(controller); pending.current = false; if (mounted.current) setBusy(false) }
  }
  return { run, busy, error, notice }
}
type Run = ReturnType<typeof useActions>['run']
function QueryState({ state }: { state: ReturnType<typeof useQuery<unknown>> }) {
  return <>{state.offline && <p role="status" className={panel}>Hors ligne : connexion requise pour retrouver et enregistrer les célébrations. Aucun stockage privé hors ligne.</p>}
    {state.error && <div role="alert" className={panel}><p>{state.error}</p><button className={button} onClick={state.reload} disabled={state.offline}>Réessayer</button></div>}
    {!state.data && !state.error && !state.offline && <p role="status">Chargement des célébrations…</p>}</>
}
function ResultState({ actions }: { actions: ReturnType<typeof useActions> }) { return <>{actions.error && <p role="alert">{actions.error}</p>}{actions.notice && <p role="status">{actions.notice}</p>}</> }

function CelebrationFields({ initial, source }: { initial?: CelebrationSummary; source?: Source }) {
  const stars = useEtoiles().actives
  return <>
    <TextField name="titre" label="Titre de la célébration" required maxLength={200} value={initial?.titre ?? source?.titre ?? ''} />
    {source && <p className="text-sm text-muted">Date de l’occurrence source : {source.date}. Elle ne sera pas modifiée.</p>}
    {initial?.dateCanonique && <p className="text-sm text-muted">Date source à la publication : {initial.dateCanonique}. Les modifications privées ultérieures ne sont pas copiées.</p>}
    <TextField name="date" label="Date de célébration (facultative)" type="date" value={initial?.date ?? ''} />
    <p className="text-sm text-muted">Sans date, la célébration reste « Date à choisir ». Aucun rappel n’est programmé ici.</p>
    <div className="grid gap-3 sm:grid-cols-2"><TextField name="heure" label="Heure (facultative)" type="time" value={initial?.heure ?? ''} /><TextField name="lieu" label="Lieu (facultatif)" maxLength={500} value={initial?.lieu ?? ''} /></div>
    <label className="block text-sm">Organisation<select name="mode" className={field} defaultValue={initial?.mode ?? (source ? 'partage' : 'seul')}><option value="seul">Seul</option><option value="partage">À plusieurs</option></select></label>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="surprise" defaultChecked={initial?.surprise} />Préparer une surprise</label>
    <label className="block text-sm">Destinataire identifié (facultatif hors surprise partagée)<select name="destinataire" className={field} defaultValue={initial?.destinataire??''}><option value="">Sans compte identifié</option>{initial?.destinataire&&!stars.some(s=>s.etoile_id===initial.destinataire)&&<option value={initial.destinataire}>Destinataire enregistré</option>}{stars.map(star => <option key={star.etoile_id} value={star.etoile_id}>{star.identite}</option>)}</select></label>
    <p className="text-sm text-muted">Une surprise partagée exige un destinataire identifié. Il ne verra ni la célébration ni les préparatifs. Un contenu déjà vu ne peut pas être effacé de la mémoire de ses lecteurs.</p>
    {source && <fieldset className="space-y-2"><legend className="font-semibold">Tâches à publier (aucune par défaut)</legend>{source.taches.map(task => <label key={task.id} className="flex min-h-11 items-center gap-2"><input type="checkbox" name="taches" value={task.id} />{task.titre}</label>)}<p className="text-sm text-muted">Seuls les titres et types sélectionnés sont copiés, avec l’état À faire. Brouillons, notes, cartes et montants restent privés.</p></fieldset>}
    {initial && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="revoirAcces" />J’ai revu les accès en cas de changement de mode ou de destinataire.</label>}
  </>
}
function fields(data: FormData) {
  return { titre: text(data,'titre'), date: optional(data,'date'), heure: optional(data,'heure'), lieu: optional(data,'lieu'), mode: text(data,'mode'), surprise: data.get('surprise') === 'on', destinataire: optional(data,'destinataire') }
}
export function CelebrationCreate({ run, onCreated, source }: { run: Run; onCreated: (id: string) => void; source?: Source }) {
  const id = useRef<string | null>(null)
  const [preview, setPreview] = useState<Record<string,unknown> | null>(null)
  if (preview) return <section className="space-y-3"><h3 className="font-bold">Aperçu de la publication</h3><p className="break-words">{String(preview.titre)}</p><p>{String(preview.date ?? 'Date à choisir')}</p>
    <p>Date source : {(preview.apercuSource as {date:string}).date}</p>
    <ul className="list-inside list-disc">{(preview.apercuSource as {taches:Source['taches']}).taches.map(task => <li key={task.id}>{task.titre} · {task.type}</li>)}</ul>
    <p className="text-sm text-muted">La copie est indépendante. Inviter ne donnera aucun accès à ta préparation privée.</p>
    <EditForm label="Confirmer la publication" onSaved={() => {}} save={async () => { const result = await run('publier',{ ...preview,confirmer:true }); onCreated(result.id) }}><button type="button" className={button} onClick={() => setPreview(null)}>Revenir à la sélection</button></EditForm>
  </section>
  return <EditForm label={source ? 'Prévisualiser la publication' : 'Créer la célébration'} onSaved={() => {}} save={async data => {
    id.current ??= crypto.randomUUID()
    const donnees = { id: id.current,...fields(data) }
    if (source) {
      const selected = data.getAll('taches') as string[]
      const apercuSource = { date:source.date,taches:source.taches.filter(task=>selected.includes(task.id)).map(task=>({...task})).sort((a,b)=>a.id.localeCompare(b.id)) }
      const candidate = { ...donnees,preparation:source.preparation,taches:selected,apercuSource,confirmer:true }
      celebrationCommand({action:'publier',operation:crypto.randomUUID(),donnees:candidate}); setPreview(candidate)
    }
    else { const result = await run('creer',donnees); onCreated(result.id) }
  }}><CelebrationFields source={source} /></EditForm>
}

export function CelebrationHub({ legacy, api = celebrationService }: { legacy?: ReactNode; api?: CelebrationService }) {
  const user = useDashboardUser(), [open,setOpen] = useState(false), [filter,setFilter] = useState('toutes'), [history,setHistory] = useState(false)
  const state = useQuery(async signal => {
    async function pages<T extends {id:string}>(read: (after:string|null)=>Promise<T[]>) {
      const result:T[] = [], seen = new Set<string>(); let after:string|null = null
      do { const rows = await read(after); for (const row of rows) { if (seen.has(row.id)) throw new Error('Liste incohérente.'); seen.add(row.id); result.push(row) }; if(result.length>100000)throw new Error('Liste trop volumineuse.'); after = rows.length===100?rows.at(-1)!.id:null } while(after)
      return result
    }
    const [celebrations,invitations] = await Promise.all([pages(after=>api.liste(user.id,after,signal)),pages(after=>api.invitations(user.id,after,signal))])
    return {celebrations,invitations}
  })
  const actions = useActions(user.id,api,state.reload,state.invalidate)
  const visible = state.data?.celebrations.filter(c => (filter==='toutes'||c.mode===filter) && (c.etat==='archivee'||c.etat==='annulee'||!!c.date&&c.date<parisDay())===history) ?? []
  return <main className="mx-auto max-w-4xl space-y-5 p-4 text-ink"><h1 className="text-2xl font-bold">Mes célébrations</h1>
    <button className={button} disabled={state.offline||actions.busy} onClick={()=>setOpen(true)}>Organiser une célébration</button>
    <QueryState state={state} /><ResultState actions={actions} />
    <fieldset disabled={state.offline||actions.busy} className="space-y-4">
      <div className="flex flex-wrap gap-2">{[['toutes','Toutes'],['seul','Seul'],['partage','À plusieurs']].map(([key,label])=><button key={key} className={button} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
      <div className="flex gap-2"><button className={button} aria-pressed={!history} onClick={()=>setHistory(false)}>À venir</button><button className={button} aria-pressed={history} onClick={()=>setHistory(true)}>Archivées et passées</button></div>
      {state.data && !visible.length && <p>Aucune célébration dans cette vue. Choisis une date ou organise librement.</p>}
      {visible.map(c=><article className={panel} key={c.id}><h2 className="break-words font-bold">{c.titre}</h2><p>{c.date??'Date à choisir'} · {stateLabels[c.etat]} · {c.mode==='seul'?'Organisation personnelle':'À plusieurs'}</p><Link className={button} href={'/dashboard/celebrations/'+c.id}>Ouvrir la célébration</Link></article>)}
      {!!state.data?.invitations.length && <section className={panel}><h2 className="font-bold">Mes invitations et réponses</h2>{state.data.invitations.map(invitation=><InvitationCard key={invitation.id} invitation={invitation} run={actions.run} />)}</section>}
    </fieldset>
    <Modal open={open} onClose={()=>{if(!actions.busy)setOpen(false)}} title="Organiser une célébration" className="w-full sm:max-w-xl"><h2 className="text-xl font-bold">Organiser une célébration</h2><CelebrationCreate run={actions.run} onCreated={()=>setOpen(false)} /><button className={button} disabled={actions.busy} onClick={()=>setOpen(false)}>Fermer</button></Modal>
    {legacy && <details><summary className="min-h-11 cursor-pointer py-3">Mes préparations personnelles existantes</summary>{legacy}</details>}
  </main>
}
function InvitationCard({ invitation:i,run }: {invitation:CelebrationInvitation;run:Run}) {
  const demand = useRef<string|null>(null)
  if(i.type==='suppression')return <p className="border-t border-line py-3" role="status">Ta demande de suppression a été acceptée. La célébration a été supprimée ; ses préparatifs ne sont plus accessibles.</p>
  return <article className="space-y-2 border-t border-line py-3"><h3 className="break-words font-semibold">{i.titre}</h3><p>{i.date??'Date à choisir'} · {i.emetteur}</p><p className="text-xs text-muted">Expire le {new Date(i.expiration).toLocaleDateString('fr-FR')}. Aucun accès aux préparatifs avant acceptation.</p>
    <div className="flex flex-wrap gap-2">{[['accepter','Accepter'],['refuser','Refuser']].map(([action,label])=><button key={action} className={button} onClick={()=>void run((i.type==='transfert'?action+'_transfert':action) as CelebrationAction,{id:i.celebration,[i.type==='transfert'?'transfert':'invitation']:i.id}).catch(()=>{})}>{label}{i.type==='transfert'?' le transfert':''}</button>)}</div>
    {i.type==='invitation' && <details><summary className="min-h-11 cursor-pointer py-3">Demander la suppression</summary>{i.demande?.etat==='attente'?<p>Demande en attente</p>:<EditForm label="Envoyer ma demande" onSaved={()=>{demand.current=null}} save={async data=>{demand.current??=crypto.randomUUID();await run('demander_suppression',{id:i.celebration,demande:demand.current,motif:optional(data,'motif')})}}><NoteField name="motif" label="Motif facultatif, visible uniquement aux organisateurs" maxLength={500}/></EditForm>}{i.demande && <p>Statut : {statusLabels[i.demande.etat]}</p>}</details>}
  </article>
}

function MetadataEditor({ detail,run }: {detail:CelebrationDetail;run:Run}) {
  // Ne pas adopter silencieusement une revision distante pendant une saisie.
  const [base,setBase] = useState(detail.celebration), [version,setVersion]=useState(0)
  return <EditForm key={version} label="Enregistrer la célébration" onSaved={()=>setVersion(v=>v+1)} save={async data=>{const values=fields(data);await run('modifier',{id:base.id,revision:base.revision,...values,revoirAcces:data.get('revoirAcces')==='on'});setBase({...base,...values,mode:values.mode as 'seul'|'partage',revision:base.revision+1})}}><CelebrationFields initial={base}/><button type="button" className={button} onClick={()=>{if(window.confirm('Relire la célébration et abandonner cette saisie ? Copie-la d’abord si nécessaire.')){setBase(detail.celebration);setVersion(v=>v+1)}}}>Relire avant de comparer</button></EditForm>
}
function TaskForm({ task,detail,run }: {task?:CelebrationTask;detail:CelebrationDetail;run:Run}) {
  const user=useDashboardUser(), id=useRef<string|null>(null), [base,setBase]=useState(task), [version,setVersion]=useState(0)
  const admin=detail.celebration.role==='organisateur', me=detail.participants.find(p=>p.compte===user.id)
  const [kind,setKind]=useState(task?.type??'libre')
  return <EditForm key={version} label={task?'Enregistrer la tâche':'Ajouter ma tâche'} onSaved={()=>{id.current=null;setVersion(v=>v+1)}} save={async data=>{
    id.current??=crypto.randomUUID()
    const values={id:detail.celebration.id,tache:base?.id??id.current,titre:text(data,'titre'),responsable:admin?optional(data,'responsable'):base?.responsable??me?.id??null,echeance:optional(data,'echeance')}
    await run(task?'modifier_tache':'ajouter_tache',task?{...values,revision:base!.revision,etat:text(data,'etat')}:{...values,type:text(data,'type')})
    if(base)setBase({...base,titre:values.titre,responsable:values.responsable,echeance:values.echeance,etat:text(data,'etat') as CelebrationTask['etat'],revision:base.revision+1})
  }}><TextField name="titre" label="Titre de la tâche" value={base?.titre} required maxLength={200}/>
    {!task&&<label className="block text-sm">Type<select name="type" className={field} value={kind} onChange={e=>setKind(e.target.value)}>{[['libre','Libre'],['cadeau','Cadeau'],['message','Carte ou message'],['gateau','Gâteau'],['repas','Repas'],['boissons','Boissons'],['decoration','Décoration'],['appel','Appel'],['sortie','Sortie']].filter(([key])=>detail.celebration.destinataire!==user.id||!['cadeau','message'].includes(key)).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
    {admin&&<label className="block text-sm">Responsable<select name="responsable" className={field} defaultValue={base?.responsable??me?.id??''}><option value="">À choisir</option>{detail.participants.filter(p=>!['cadeau','message'].includes(kind)||p.compte!==detail.celebration.destinataire).map(p=><option key={p.id} value={p.id}>{p.identite}</option>)}</select></label>}
    <TextField name="echeance" type="date" label="Échéance facultative" value={base?.echeance??''}/>
    {task&&<><label className="block text-sm">Progression<select name="etat" className={field} defaultValue={base?.etat}><option value="a_faire">À faire</option><option value="faite">Faite</option><option value="abandonnee">Abandonnée</option></select></label><button type="button" className={button} onClick={()=>{if(window.confirm('Relire la tâche et abandonner cette saisie ?')){setBase(task);setVersion(v=>v+1)}}}>Relire la tâche avant de comparer</button></>}
    <p className="text-xs text-muted">Une tâche faite ne prouve aucun achat ni envoi.</p>
  </EditForm>
}
function CommentForm({ comment,id,run }: {comment?:CelebrationComment;id:string;run:Run}) {
  const draft=useRef<string|null>(null),[base,setBase]=useState(comment),[version,setVersion]=useState(0)
  return <EditForm key={version} label={comment?'Modifier mon commentaire':'Ajouter un commentaire'} onSaved={()=>{draft.current=null;setVersion(v=>v+1)}} save={async data=>{draft.current??=crypto.randomUUID();const texte=text(data,'texte');await run(comment?'modifier_commentaire':'commenter',{id,commentaire:base?.id??draft.current,texte,...(comment?{revision:base!.revision}:{})});if(base)setBase({...base,texte,revision:base.revision+1})}}><NoteField name="texte" label="Commentaire de coordination" value={base?.texte} maxLength={2000}/>{comment&&<button type="button" className={button} onClick={()=>{if(window.confirm('Relire le commentaire et abandonner cette saisie ?')){setBase(comment);setVersion(v=>v+1)}}}>Relire mon commentaire</button>}</EditForm>
}
export function CelebrationScreen({ id,api=celebrationService }: {id:string;api?:CelebrationService}) {
  const user=useDashboardUser(),stars=useEtoiles().actives
  const state=useQuery(signal=>api.lire(user.id,id,signal)),actions=useActions(user.id,api,state.reload,state.invalidate)
  const [confirmation,setConfirmation]=useState<{action:CelebrationAction;data:Record<string,unknown>;message:string}|null>(null)
  const [invitationsOpen,setInvitationsOpen]=useState(false)
  const newIds=useRef(new Map<string,string>())
  function fresh(key:string){if(!newIds.current.has(key))newIds.current.set(key,crypto.randomUUID());return newIds.current.get(key)!}
  const detail=state.data,c=detail?.celebration,admin=c?.role==='organisateur',open=c?.etat==='active'
  const perform=(action:CelebrationAction,data:Record<string,unknown>)=>void actions.run(action,data).catch(()=>{})
  return <main className="mx-auto max-w-4xl space-y-5 p-4 text-ink"><Link className={button} href="/dashboard/preparations">Mes célébrations</Link><QueryState state={state}/><ResultState actions={actions}/>
    {detail&&c&&<><header><h1 className="break-words text-2xl font-bold">{c.titre}</h1><p>{c.date??'Date à choisir'}{c.heure?' · '+c.heure:''} · {stateLabels[c.etat]}</p>{c.lieu&&<p className="break-words">{c.lieu}</p>}{c.maintenance&&<p className={panel}>Les préparatifs sont suspendus. Tu peux seulement proposer un transfert accepté ou clôturer la célébration.</p>}</header>
      <fieldset disabled={actions.busy||state.offline} className="min-w-0 space-y-4">
        <section className={panel}><h2 className="font-bold">Participants</h2>{detail.participants.map(p=><div key={p.id} className="flex flex-wrap items-center gap-2"><span>{p.identite} · {p.role==='organisateur'?'Organisateur':'Participant'}</span>{admin&&p.compte!==user.id&&<>{!detail.transferts.length&&<button className={button} onClick={()=>void actions.run('proposer_transfert',{id,transfert:fresh('transfer:'+p.id),cible:p.compte}).then(()=>newIds.current.delete('transfer:'+p.id),()=>{})}>Proposer le transfert</button>}{!c.maintenance&&<button className={button} onClick={()=>setConfirmation({action:'retirer',data:{id,participation:p.id},message:'Retirer cette participation coupe son accès à cette célébration, sans supprimer son carnet privé.'})}>Retirer</button>}</>}</div>)}
          {admin&&open&&c.mode==='seul'&&(c.surprise&&!c.destinataire?<p className="text-sm text-muted">Pour inviter des Étoiles à cette surprise, identifie d’abord son destinataire dans « Modifier la célébration ».</p>:<div className="space-y-2 py-3"><button className={button} onClick={()=>setConfirmation({action:'modifier',data:{id,revision:c.revision,titre:c.titre,date:c.date,heure:c.heure,lieu:c.lieu,mode:'partage',surprise:c.surprise,destinataire:c.destinataire,revoirAcces:true},message:'Passer cette célébration à plusieurs ? Les Étoiles que tu inviteras pourront accéder aux préparatifs partagés après leur acceptation. Ce choix ne lance encore aucune invitation.'})}>Inviter des Étoiles</button><p className="text-sm text-muted">Passe à plusieurs, puis choisis les Étoiles à inviter. Leurs invitations attendront leur réponse.</p></div>)}
          {admin&&open&&c.mode==='partage'&&<details open={invitationsOpen} onToggle={event=>setInvitationsOpen(event.currentTarget.open)}><summary className="min-h-11 cursor-pointer py-3">Inviter des Étoiles</summary><EditForm label="Inviter cette Étoile" onSaved={()=>{}} save={async data=>{const cible=text(data,'cible');await actions.run('inviter',{id,cible,invitation:fresh('invite:'+cible)});newIds.current.delete('invite:'+cible)}}><label className="block text-sm">Étoile acceptée<select name="cible" required className={field}><option value="">Choisir une Étoile</option>{stars.filter(s=>!detail.participants.some(p=>p.compte===s.etoile_id)&&!detail.invitations.some(i=>i.cible===s.etoile_id)&&(!c.surprise||s.etoile_id!==c.destinataire)).map(s=><option value={s.etoile_id} key={s.etoile_id}>{s.identite}</option>)}</select></label><p className="text-sm text-muted">L’invitation attend sa réponse. Aucun message externe ni carnet partagé.</p></EditForm></details>}
          {detail.invitations.map(i=><p key={i.id}>{i.identite} · En attente <button className={button} onClick={()=>perform('revoquer',{id,invitation:i.id})}>Révoquer l’invitation</button></p>)}
          {detail.transferts.map(t=><div key={t.id}><p>Transfert proposé, en attente d’acceptation.</p>{t.cible===user.id&&<><button className={button} onClick={()=>perform('accepter_transfert',{id,transfert:t.id})}>Accepter le transfert</button><button className={button} onClick={()=>perform('refuser_transfert',{id,transfert:t.id})}>Refuser le transfert</button></>}</div>)}
        </section>
        {!c.maintenance&&<CelebrationTabs organisation={<>
          {admin&&open&&<details className={panel}><summary className="min-h-11 cursor-pointer py-3">Modifier la célébration</summary><MetadataEditor detail={detail} run={actions.run}/></details>}
          {open&&<section className={panel}><h2 className="font-bold">Ajouter une tâche</h2><TaskForm detail={detail} run={actions.run}/></section>}
          {detail.taches.map(task=><section key={task.id} className={panel}><h2 className="break-words font-bold">{task.titre}</h2><p>{task.etat==='faite'?'Faite':task.etat==='abandonnee'?'Abandonnée':'À faire'} · {detail.participants.find(p=>p.id===task.responsable)?.identite??'Responsable à choisir'}</p>{open&&(admin||task.auteur===user.id||detail.participants.some(p=>p.id===task.responsable&&p.compte===user.id))&&<details><summary className="min-h-11 cursor-pointer py-3">Modifier cette tâche</summary><TaskForm task={task} detail={detail} run={actions.run}/></details>}</section>)}
          <section className={panel}><h2 className="font-bold">Commentaires</h2><p className="text-sm text-muted">Ce fil d’organisation est partagé avec les participants, y compris le destinataire hors surprise. Garde les détails de ses cadeaux dans ta préparation privée.</p>{detail.commentaires.map(comment=><article key={comment.id} className="space-y-2 border-t border-line py-3"><p className="text-sm text-muted">{comment.identite}</p><p className="whitespace-pre-wrap break-words">{comment.texte}</p>{open&&comment.auteur===user.id&&<details><summary className="min-h-11 cursor-pointer py-3">Modifier mon commentaire</summary><CommentForm comment={comment} id={id} run={actions.run}/></details>}{(admin||comment.auteur===user.id)&&<button className={button} onClick={()=>setConfirmation({action:'retirer_commentaire',data:{id,commentaire:comment.id},message:'Retirer ce commentaire ? Son auteur ne sera pas remplacé.'})}>Retirer le commentaire</button>}</article>)}{open&&<CommentForm id={id} run={actions.run}/>}</section>
          <details className={panel}><summary className="min-h-11 cursor-pointer py-3">Informations récentes</summary><p className="text-sm text-muted">Les 100 dernières actions, sans copie des textes. Les notifications utiles restent réservées aux participants autorisés.</p><ul>{detail.actions.map(a=><li key={a.id}>{new Date(a.date).toLocaleDateString('fr-FR')} · Action de coordination enregistrée</li>)}</ul>{detail.notifications.map(n=><p key={n.id}>Information : {n.type==='tache'?'tâche attribuée':n.type==='demande'?'demande de suppression':n.type==='reponse'?'réponse à ta demande':'célébration mise à jour'}</p>)}</details>
        </>} ideas={<section className={panel}><h2 className="font-bold">Idées et cadeaux</h2><p>Les propositions partagées seront disponibles dans la prochaine étape.</p><Link className={button} href="/dashboard/idees">Mes inspirations privées</Link></section>} costs={<section className={panel}><h2 className="font-bold">Frais</h2><p>Le partage des frais sera disponible ultérieurement.</p><Link className={button} href="/dashboard/budget">Ma synthèse personnelle</Link></section>}/>} 
        {detail.demandes.map(d=><section key={d.id} className={panel}><h2 className="font-bold">Demande de suppression · {statusLabels[d.etat]}</h2>{d.motif&&<p className="whitespace-pre-wrap break-words">{d.motif}</p>}{admin&&d.etat==='attente'&&<div className="flex flex-wrap gap-2"><button className={button} onClick={()=>setConfirmation({action:'traiter_suppression',data:{id,demande:d.id,revision:d.revision,accepter:true,confirmer:true},message:'Accepter supprime la célébration et tous ses préparatifs partagés. Les sources privées restent conservées.'})}>Accepter la demande</button><button className={button} onClick={()=>perform('traiter_suppression',{id,demande:d.id,revision:d.revision,accepter:false,confirmer:false})}>Refuser la demande</button></div>}</section>)}
        <section className={panel}><h2 className="font-bold">Gérer ma participation</h2>
          {admin?<div className="flex flex-wrap gap-2"><button className={button} onClick={()=>setConfirmation({action:'annuler',data:{id,revision:c.revision,confirmer:true},message:'Annuler ferme les nouvelles actions et invitations. L’historique reste accessible aux participants autorisés.'})}>Annuler la célébration</button>{!c.maintenance&&<button className={button} onClick={()=>perform('archiver',{id,revision:c.revision})}>Archiver la célébration</button>}<button className={button} onClick={()=>setConfirmation({action:'supprimer',data:{id,revision:c.revision,confirmer:true},message:'Supprimer la célébration révoque les accès et efface tâches et commentaires partagés. Les contacts, dates et préparations privées sources restent conservés.'})}>Supprimer la célébration</button></div>:<>
            <button className={button} onClick={()=>setConfirmation({action:'quitter',data:{id,cloturer:false},message:'Quitter coupe ton accès à cette célébration. Revenir exigera une nouvelle invitation.'})}>Quitter la célébration</button>
            {!detail.demandes.some(d=>d.demandeur===user.id&&d.etat==='attente')&&<details><summary className="min-h-11 cursor-pointer py-3">Demander la suppression</summary><EditForm label="Envoyer ma demande" onSaved={()=>{newIds.current.delete('demand')}} save={async data=>{await actions.run('demander_suppression',{id,demande:fresh('demand'),motif:optional(data,'motif')})}}><NoteField name="motif" label="Motif facultatif, réservé aux organisateurs" maxLength={500}/></EditForm></details>}
          </>}
          {admin&&!c.maintenance&&<button className={button} onClick={()=>setConfirmation({action:'quitter',data:{id,cloturer:true},message:'Si tu es le dernier organisateur, quitter clôture la célébration. Pour la garder active, propose d’abord un transfert et attends son acceptation.'})}>Quitter et clôturer si nécessaire</button>}
        </section>
      </fieldset>
    </>}
    <Modal open={confirmation!==null} onClose={()=>{if(!actions.busy)setConfirmation(null)}} title="Confirmer mon choix" className="w-full sm:max-w-lg"><p className="mb-4">{confirmation?.message}</p><div className="flex gap-2"><button className={button} disabled={actions.busy} onClick={()=>setConfirmation(null)}>Revenir</button><button className={button} disabled={actions.busy} onClick={()=>{if(confirmation)void actions.run(confirmation.action,confirmation.data).then(()=>{if(confirmation.action==='modifier'&&confirmation.data.mode==='partage')setInvitationsOpen(true);setConfirmation(null)},()=>{})}}>Confirmer</button></div></Modal>
  </main>
}
export function PublishCelebration({ source,api=celebrationService }: {source:Source;api?:CelebrationService}) {
  const user=useDashboardUser(),[open,setOpen]=useState(false),[created,setCreated]=useState<string|null>(null)
  const actions=useActions(user.id,api,()=>{},()=>setOpen(false))
  return <section className={panel}><button className={button} onClick={()=>setOpen(true)}>Inviter des Étoiles à cette célébration</button><p className="mt-2 text-sm text-muted">Choisis les éléments à partager et confirme leur aperçu. Ta préparation privée, ses brouillons et son budget restent personnels.</p>{created&&<Link className={button} href={'/dashboard/celebrations/'+created}>Ouvrir la célébration et inviter mes Étoiles</Link>}<ResultState actions={actions}/><Modal open={open} onClose={()=>{if(!actions.busy)setOpen(false)}} title="Préparer cette célébration à plusieurs" className="w-full sm:max-w-xl"><CelebrationCreate source={source} run={actions.run} onCreated={id=>{setCreated(id);setOpen(false)}}/><button className={button} disabled={actions.busy} onClick={()=>setOpen(false)}>Fermer</button></Modal></section>
}
export default function InstalledCelebrationScreen({id}:{id:string}) {
  const user=useDashboardUser()
  if(!CELEBRATIONS_ENABLED)return <main className="mx-auto max-w-xl space-y-4 p-4 text-ink"><h1 className="text-2xl font-bold">Célébrations à plusieurs</h1><p>L’organisation partagée sera disponible après validation de son installation.</p><Link className={button} href="/dashboard/preparations">Mes célébrations personnelles</Link></main>
  return <CelebrationScreen key={user.id+':'+id} id={id}/>
}
