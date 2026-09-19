'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import StarryBackground from '@/components/StarryBackground'

interface PatchNote {
  id: number
  version: string
  title: string
  changes: string[]
  release_date: string
  is_major: boolean
}

export default function PatchNotePage() {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPatchNotes = async () => {
      const { data, error } = await supabase
        .from('patch_notes')
        .select('*')
        .order('release_date', { ascending: false })

      if (error) {
        console.error('Erreur Supabase:', error)
      } else {
        setPatchNotes(data || [])
      }
      setLoading(false)
    }

    fetchPatchNotes()
  }, [])

  return (
    <StarryBackground>
      {/* HEADER avec logo */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <svg
            className="w-8 h-8 text-accent transition-transform duration-300 group-hover:rotate-12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill="currentColor"
              className="text-on-action"
            />
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="15" cy="9" r="1" fill="currentColor" />
          </svg>
          <span className="text-xl font-semibold tracking-tight">
            <span className="text-ink">Ephemer</span>
            <span className="text-muted font-light">
              <span className="text-accent">.</span>name
            </span>
          </span>
        </Link>
      </nav>

      {/* CONTENU PRINCIPAL */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 z-10 flex-1">

        {/* Bouton retour */}
        <Link
          href="/"
          className="inline-flex items-center text-accent hover:text-accent transition mb-8 text-base font-medium"
        >
          &larr; Retour à l&apos;accueil
        </Link>

        {/* En-tête */}
        <header className="mb-12 border-b border-line pb-6">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-ink">
            Journal des mises à jour
          </h1>
          <p className="text-lg text-muted">
            Toutes les évolutions d&rsquo;Ephemer, version par version.
          </p>
        </header>

        {/* État de chargement */}
        {loading ? (
          <p className="text-center text-muted py-12">
            Chargement des mises à jour...
          </p>
        ) : patchNotes.length > 0 ? (
          <div className="space-y-8">
            {patchNotes.map((note) => (
              <article
                key={note.id}
                className="bg-ink/5 border border-accent/10 hover:border-accent/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm transition-all duration-300"
              >
                {/* Métadonnées version */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="font-mono text-sm px-3 py-1 bg-action/10 text-accent border border-accent/20 rounded-full whitespace-nowrap">
                    v{note.version}
                  </span>
                  {note.is_major && (
                    <span className="text-xs px-3 py-1 bg-emerald-500/20 text-success border border-emerald-500/20 rounded-full whitespace-nowrap">
                      ✨ Version majeure
                    </span>
                  )}
                  <span className="text-muted text-sm whitespace-nowrap">
                    {new Date(note.release_date).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Titre */}
                <h2 className="text-2xl font-semibold mb-5 text-ink">
                  {note.title}
                </h2>

                {/* Liste des changements */}
                <ul className="space-y-3 text-muted">
                  {note.changes.map((change, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-accent mt-1">•</span>
                      <span className="flex-1">{change}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted border border-dashed border-line rounded-2xl">
            <p className="text-lg">Aucune mise à jour pour le moment.</p>
            <p className="text-sm mt-1">
              Revenez plus tard pour voir les dernières nouveautés.
            </p>
          </div>
        )}
      </div>
    </StarryBackground>
  )
}
