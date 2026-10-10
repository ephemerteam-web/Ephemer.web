'use client'

import { useEffect, useState } from 'react'
import { downloadImage } from '@/lib/share-image'
import { supabase } from '@/lib/supabase-browser'
import LoadFailure from '@/components/LoadFailure'
import { SAINTS_PAR_DATE } from '@/lib/saints'

type Fete = Pick<import('@/types/database').Tables<'saint_du_jour'>, 'saint' | 'prenom' | 'image_url' | 'caption'>

// La date doit être la même que celle envoyée par Make, même près de minuit.
function dateDuJourParis() {
  const parties = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const valeur = (type: string) => parties.find((partie) => partie.type === type)?.value ?? ''
  return `${valeur('year')}-${valeur('month')}-${valeur('day')}`
}

// La fin de la légende sert aux réseaux sociaux : on garde seulement le texte à lire.
function texteSansPromotion(caption: string | null) {
  return caption?.split(/(?:https?:\/\/|www\.|\bephemer\.name\b|#[\p{L}\p{N}_]+)/u)[0].trim() ?? ''
}

export default function SaintDuJour({ embedded = false, day }: { embedded?: boolean; day?: string } = {}) {
  const [fete, setFete] = useState<Fete | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [texteOuvert, setTexteOuvert] = useState(false)
  const [imageAPartager, setImageAPartager] = useState<File | null>(null)
  const [messagePartage, setMessagePartage] = useState('')

  useEffect(() => {
    let actif = true

    const charger = async () => {
      const { data, error } = await supabase
      .from('saint_du_jour')
      .select('saint, prenom, image_url, caption')
      .eq('date_fete', day ?? dateDuJourParis())
      .maybeSingle()

      if (!actif) return
      if (error) { setLoadError(true); setLoading(false); return }
      setFete(data)
      setLoading(false)
    }

    void charger().catch(() => { if (actif) { setLoadError(true); setLoading(false) } })
    return () => { actif = false }
  }, [attempt, day])

  useEffect(() => {
    if (!fete?.image_url) return
    let actif = true

    // Préparer le fichier évite d'attendre un téléchargement après le clic de partage.
    const preparerImage = async () => {
      try {
        const reponse = await fetch(fete.image_url)
        if (!reponse.ok) return
        const blob = await reponse.blob()
        const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
        if (actif) setImageAPartager(new File([blob], `saint-du-jour.${extension}`, { type: blob.type || 'image/jpeg' }))
      } catch {
        // Si le serveur de l'image refuse ce téléchargement, le lien reste partageable.
      }
    }

    void preparerImage()
    return () => { actif = false }
  }, [fete])

  const partager = async () => {
    if (!fete) return
    setMessagePartage('')
    const titre = `La fête du jour : ${fete.saint}`
    const texte = texteSansPromotion(fete.caption)

    try {
      if (navigator.share) {
        if (imageAPartager && navigator.canShare?.({ files: [imageAPartager] })) {
          await navigator.share({ files: [imageAPartager], title: titre, text: texte || titre })
        } else {
          if (imageAPartager) { downloadImage(imageAPartager); setMessagePartage('Image téléchargée.') }
          else setMessagePartage('L’image se prépare. Réessaie dans un instant.')
        }
      } else {
        if (imageAPartager) { downloadImage(imageAPartager); setMessagePartage('Image téléchargée.') }
        else { await navigator.clipboard.writeText(fete.image_url); setMessagePartage('Lien de l’image copié. L’image n’est pas encore prête.') }
      }
    } catch (erreur) {
      if (erreur instanceof DOMException && erreur.name === 'AbortError') return
      setMessagePartage('Le partage est indisponible sur cet appareil.')
    }
  }

  if (loadError) return <LoadFailure message="Impossible de charger la fête du jour." retry={() => { setLoadError(false); setLoading(true); setAttempt(value => value + 1) }} />
  if (loading) {
    return (
      <div className={`${embedded ? '' : 'mx-auto my-8 max-w-5xl '}h-64 w-full animate-pulse rounded-3xl bg-ink/5`} aria-hidden="true" />
    )
  }

  if (!fete) {
    const saint = SAINTS_PAR_DATE.get((day ?? dateDuJourParis()).slice(5))
    return embedded && saint ? <section aria-label="Fête du jour" className="rounded-2xl border border-line bg-surface/60 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-accent">✨ Fête du jour</p><p className="mt-2 font-semibold text-ink">{saint.nomSaint}</p></section> : null
  }

  const texte = texteSansPromotion(fete.caption)

  return (
    <section aria-label={`La fête du jour : ${fete.saint}`} className={embedded ? 'w-full min-w-0' : 'mx-auto my-8 w-full max-w-xl px-4 sm:px-6'}>
      {embedded && <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">✨ Fête du jour</h3>}
      <div className="overflow-hidden rounded-3xl border border-line bg-ink/[0.03]">
        <img
          src={fete.image_url}
          alt={`Illustration de ${fete.saint}`}
          width={1080}
          height={1080}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
        <div className="flex flex-wrap items-center gap-3 p-4">
          {texte && (
            <button
              type="button"
              onClick={() => setTexteOuvert((ouvert) => !ouvert)}
              aria-expanded={texteOuvert}
              aria-controls="saint-du-jour-texte"
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink"
            >
              {texteOuvert ? 'Masquer le texte' : 'Lire le texte'}
            </button>
          )}
          <button
            type="button"
            onClick={partager}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Partager l’image
          </button>
        </div>
        {texte && texteOuvert && (
          <p id="saint-du-jour-texte" className="whitespace-pre-line px-4 pb-5 text-sm leading-relaxed text-muted">{texte}</p>
        )}
        {messagePartage && <p role="status" className="px-4 pb-4 text-sm text-muted">{messagePartage}</p>}
      </div>
    </section>
  )
}
