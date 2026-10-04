'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { trouverProchaineFete, Sainte } from '@/lib/saints'
import Link from 'next/link'

type ContactRapide = {
  id: string
  prenom: string
  nom?: string
  email?: string
  telephone_indicatif?: string
  telephone_numero?: string
  date_naissance?: string
  relation?: string
  note?: string
}

type BulleType = 'nom' | 'email' | 'telephone' | 'naissance' | 'relation' | 'note'

type InfoBulle = {
  type: BulleType
  icon: string
  label: string
  couleur: string
}

const BULLES: InfoBulle[] = [
  { type: 'nom', icon: '👤', label: 'Nom', couleur: 'from-indigo-500 to-purple-500' },
  { type: 'email', icon: '✉️', label: 'Email', couleur: 'from-emerald-500 to-teal-500' },
  { type: 'telephone', icon: '📞', label: 'Téléphone', couleur: 'from-sky-500 to-blue-500' },
  { type: 'naissance', icon: '🎂', label: 'Anniversaire', couleur: 'from-rose-500 to-pink-500' },
  { type: 'relation', icon: '👨‍👩‍👧', label: 'Relation', couleur: 'from-amber-500 to-orange-500' },
  { type: 'note', icon: '✏️', label: 'Note', couleur: 'from-fuchsia-500 to-purple-500' },
]

const RELATIONS = [
  { value: 'ami', label: '👫 Ami(e)' },
  { value: 'famille', label: '👨‍👩‍👧 Famille' },
  { value: 'pro', label: '💼 Professionnel' },
  { value: 'autre', label: '✨ Autre' },
]

const INDICATIFS = ['+33', '+32', '+41', '+44', '+1']

export default function AjoutRapideContacts() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  
  // État principal
  const [prenom, setPrenom] = useState('')
  const [feteInfo, setFeteInfo] = useState<Sainte & { dateObj: Date; jours: number } | null>(null)
  const [contacts, setContacts] = useState<ContactRapide[]>([])
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState<string | null>(null)
  
  // État des bulles et sélection
  const [bulleOuverte, setBulleOuverte] = useState<BulleType | null>(null)
  const [bullePosition, setBullePosition] = useState({ top: 0, left: 0 })
  const [contactSelectionneId, setContactSelectionneId] = useState<string | null>(null)
  
  // Charger le user
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const chargerUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/connexion')
        return
      }
      setUserId(user.id)
      setLoading(false)
    }
    chargerUser()
  }, [router])

  // Rechercher la fête quand le prénom change
  useEffect(() => {
    if (prenom.trim().length >= 2) {
      const result = trouverProchaineFete(prenom)
      if (result) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const diffJours = Math.round((result.dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        setFeteInfo({ ...result, jours: diffJours })
      } else {
        setFeteInfo(null)
      }
    } else {
      setFeteInfo(null)
    }
  }, [prenom])

  // Auto-focus sur le champ prénom
  useEffect(() => {
    if (inputRef.current && !loading) {
      inputRef.current.focus()
    }
  }, [loading])

  // Gestion des bulles
  const ouvrirBulle = (type: BulleType, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const bulleWidth = 288 // largeur approximative de la bulle (72 * 4 = 288px)
    
    // Calculer la position pour centrer la bulle par rapport à l'écran
    let left = rect.left + window.scrollX
    
    // Si la bulle dépasserait à droite, on la positionne à gauche
    if (left + bulleWidth > viewportWidth) {
      left = viewportWidth - bulleWidth - 20
    }
    
    // Centrer horizontalement par rapport au bouton
    left = rect.left + window.scrollX + rect.width / 2 - bulleWidth / 2
    
    // Assurer que la bulle ne dépasse pas les bords
    left = Math.max(20, Math.min(left, viewportWidth - bulleWidth - 20))
    
    setBullePosition({
      top: rect.bottom + window.scrollY + 10,
      left: left
    })
    setBulleOuverte(type)
  }

  const fermerBulle = () => {
    setBulleOuverte(null)
  }

  // Formater la date de fête
  const formaterDate = (date: string) => {
    const [mois, jour] = date.split('-').map(Number)
    const dateObj = new Date(2024, mois - 1, jour)
    return dateObj.toLocaleDateString('fr-FR', { 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Formater le nombre de jours
  const formaterJours = (jours: number) => {
    if (jours === 0) return "Aujourd'hui ! 🎉"
    if (jours === 1) return "Demain"
    if (jours < 30) return `Dans ${jours} jours`
    if (jours < 365) {
      const mois = Math.floor(jours / 30)
      return `Dans ${mois} mois`
    }
    return `Dans ${Math.floor(jours / 365)} an(s)`
  }

  // Ajouter un contact
  const ajouterContact = useCallback(() => {
    if (!prenom.trim()) return
    
    const nouveauContact: ContactRapide = {
      id: Date.now().toString(),
      prenom: prenom.trim(),
      nom: undefined,
      email: undefined,
      telephone_indicatif: undefined,
      telephone_numero: undefined,
      date_naissance: undefined,
      relation: undefined,
      note: undefined,
    }
    
    setContacts([...contacts, nouveauContact])
    setPrenom('')
    setFeteInfo(null)
    setContactSelectionneId(nouveauContact.id)
    setSucces(`✨ ${prenom.trim()} ajouté !`)
    
    // Clear success message after animation
    setTimeout(() => setSucces(null), 2000)
  }, [prenom, contacts])

  // Gérer la touche Entrée
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && prenom.trim()) {
      e.preventDefault()
      ajouterContact()
    }
  }

  // Mettre à jour un contact dans la liste
  const mettreAJourContact = (id: string, updates: Partial<ContactRapide>) => {
    setContacts(contacts.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ))
  }
  
  // Sélectionner un contact pour modification
  const selectionnerContact = (id: string) => {
    setContactSelectionneId(id)
  }

  // Supprimer un contact de la liste
  const supprimerContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id))
  }

  // Sauvegarder tous les contacts
  const sauvegarderContacts = async () => {
    if (!userId || contacts.length === 0) return
    
    setSauvegardeEnCours(true)
    setErreur(null)
    
    try {
      // Préparer les données pour Supabase
      const contactsPourSupabase = contacts.map(c => ({
        user_id: userId,
        prenom: c.prenom,
        nom: c.nom || null,
        date_naissance: c.date_naissance || null,
        relation: c.relation || 'ami',
        email: c.email || null,
        telephone_indicatif: c.telephone_indicatif || null,
        telephone_numero: c.telephone_numero || null,
        note: c.note || null,
        est_favori: false,
      }))
      
      const { error } = await supabase
        .from('contacts')
        .insert(contactsPourSupabase)
      
      if (error) {
        throw error
      }
      
      setSucces(`🎉 ${contacts.length} contact(s) enregistré(s) avec succès !`)
      setContacts([])
      setPrenom('')
      setContactSelectionneId(null)
      router.refresh()
      
      // Réinitialiser après 3 secondes
      setTimeout(() => {
        setSucces(null)
      }, 3000)
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
      setErreur('Une erreur est survenue. Réessaye.')
    } finally {
      setSauvegardeEnCours(false)
    }
  }

  // Calculer les stats
  const stats = {
    total: contacts.length,
    avecNom: contacts.filter(c => c.nom).length,
    avecEmail: contacts.filter(c => c.email).length,
    avecTelephone: contacts.filter(c => c.telephone_numero).length,
    avecAnniversaire: contacts.filter(c => c.date_naissance).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <span className="text-6xl">✨</span>
          </div>
          <p className="text-info">Chargement...</p>
        </div>
      </div>
    )
  }

  // Rendu des bulles
  const rendreBulle = (type: BulleType) => {
    const bulle = BULLES.find(b => b.type === type)
    if (!bulle) return null
    
    let content: React.ReactNode = null
    
    // Trouver le contact sélectionné ou le dernier
    const contactCibleId = contactSelectionneId || (contacts.length > 0 ? contacts[contacts.length - 1].id : null)
    const contactCible = contacts.find(c => c.id === contactCibleId)
    
    // Fonction helper pour obtenir les valeurs
    const getValeur = (champ: keyof ContactRapide): string => {
      return (contactCible?.[champ] as string) || ''
    }
    
    switch (type) {
      case 'nom':
        content = (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink">Nom de famille</label>
            <input
              type="text"
              placeholder="Dupont"
              defaultValue={getValeur('nom')}
              onChange={(e) => {
                if (contactCibleId) {
                  mettreAJourContact(contactCibleId, { nom: e.target.value })
                }
              }}
              className="w-full rounded-xl border border-line bg-ink/5 px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>
        )
        break
        
      case 'email':
        content = (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink">Email</label>
            <input
              type="email"
              placeholder="contact@email.com"
              defaultValue={getValeur('email')}
              onChange={(e) => {
                if (contactCibleId) {
                  mettreAJourContact(contactCibleId, { email: e.target.value })
                }
              }}
              className="w-full rounded-xl border border-line bg-ink/5 px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>
        )
        break
        
      case 'telephone':
        content = (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink">Téléphone</label>
            <div className="flex gap-2">
              <select
                defaultValue={getValeur('telephone_indicatif') || '+33'}
                onChange={(e) => {
                  if (contactCibleId) {
                    mettreAJourContact(contactCibleId, { telephone_indicatif: e.target.value })
                  }
                }}
                className="w-24 rounded-xl border border-line bg-ink/5 px-3 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                {INDICATIFS.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="612345678"
                defaultValue={getValeur('telephone_numero')}
                onChange={(e) => {
                  if (contactCibleId) {
                    mettreAJourContact(contactCibleId, { telephone_numero: e.target.value.replace(/[^0-9]/g, '') })
                  }
                }}
                className="flex-1 rounded-xl border border-line bg-ink/5 px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
              />
            </div>
          </div>
        )
        break
        
      case 'naissance':
        content = (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink">Date de naissance</label>
            <input
              type="date"
              defaultValue={getValeur('date_naissance')}
              onChange={(e) => {
                if (contactCibleId) {
                  mettreAJourContact(contactCibleId, { date_naissance: e.target.value })
                }
              }}
              className="w-full rounded-xl border border-line bg-ink/5 px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>
        )
        break
        
      case 'relation':
        content = (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink">Relation</label>
            <select
              defaultValue={getValeur('relation') || 'ami'}
              onChange={(e) => {
                if (contactCibleId) {
                  mettreAJourContact(contactCibleId, { relation: e.target.value })
                }
              }}
              className="w-full rounded-xl border border-line bg-ink/5 px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            >
              {RELATIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        )
        break
        
      case 'note':
        content = (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink">Note</label>
            <textarea
              placeholder="Aime le café, vit à Paris..."
              rows={3}
              defaultValue={getValeur('note')}
              onChange={(e) => {
                if (contactCibleId) {
                  mettreAJourContact(contactCibleId, { note: e.target.value })
                }
              }}
              className="w-full resize-none rounded-xl border border-line bg-ink/5 px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>
        )
        break
    }
    
    return (
      <div
        className="fixed z-50 w-72 p-5 bg-canvas border border-line rounded-2xl shadow-2xl animate-[fadeIn_0.2s_ease]"
        style={{ top: bullePosition.top, left: bullePosition.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{bulle.icon}</span>
            <h3 className="font-bold text-ink">{bulle.label}</h3>
          </div>
          <button
            onClick={fermerBulle}
            className="text-muted hover:text-ink transition p-1 rounded-full hover:bg-ink/10"
          >
            ✕
          </button>
        </div>
        {content}
        <button
          onClick={fermerBulle}
          className="mt-4 w-full py-2 bg-action text-on-action font-semibold rounded-xl transition active:scale-95"
        >
          Terminé
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas/50 backdrop-blur-lg p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-ink">
              ⚡ Ajout Rapide
            </h1>
            <p className="text-muted text-sm mt-1">
              Appuie sur <kbd className="bg-ink/10 px-2 py-0.5 rounded text-xs">Entrée</kbd> pour ajouter
            </p>
          </div>
          <Link
            href="/dashboard/contacts"
            className="text-muted hover:text-ink transition flex items-center gap-2"
          >
            ← Retour
          </Link>
        </div>

        {/* Messages */}
        {erreur && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-danger text-sm animate-[shake_0.5s_ease]">
            {erreur}
          </div>
        )}
        
        {succes && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-success text-sm animate-[pulse_0.5s_ease]">
            {succes}
          </div>
        )}

        {/* Zone de saisie principale */}
        <div className="relative mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Champ prénom */}
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-muted mb-2">
                Prénom *
              </label>
              <input
                ref={inputRef}
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Marie"
                autoComplete="off"
                className="w-full rounded-xl border border-line bg-ink/5 px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent/60 placeholder:text-muted/50 transition-all"
              />
            </div>

            {/* Bouton ajouter */}
            <button
              onClick={ajouterContact}
              disabled={!prenom.trim()}
              className="flex-shrink-0 w-full sm:w-auto mt-4 sm:mt-6 h-12 rounded-xl bg-action hover:bg-action/90 text-on-action font-semibold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[100px]"
            >
              + Ajouter
            </button>
          </div>

          {/* Affichage de la fête */}
          {feteInfo && (
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl animate-[fadeIn_0.3s_ease]">
                <span className="text-purple-500">🎉</span>
                <div>
                  <p className="font-semibold text-ink text-sm">Fête le {formaterDate(feteInfo.date)}</p>
                  <p className="text-muted text-xs">{formaterJours(feteInfo.jours)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bulles d'infos optionnelles */}
          <div className="mt-6">
            <p className="text-muted text-xs mb-3 text-center">
              <span>✨ Infos optionnelles</span>
              <span className="text-muted/50 block">
                {contactSelectionneId ? '(modifie le contact sélectionné)' : '(clique un contact puis ajoute des infos)'}
              </span>
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {BULLES.map((bulle) => (
                <button
                  key={bulle.type}
                  onClick={(e) => ouvrirBulle(bulle.type, e)}
                  className="relative group p-2 rounded-xl bg-ink/5 border border-line hover:border-accent/30 hover:bg-action/5 transition-all duration-200 w-10 h-10 flex items-center justify-center"
                  title={bulle.label}
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{bulle.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Liste des contacts à enregistrer */}
        {contacts.length > 0 && (
          <div className="bg-ink/[0.03] border border-line rounded-2xl p-4 md:p-6 mb-8 animate-[fadeIn_0.3s_ease]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <span>📋 À enregistrer</span>
                <span className="text-sm font-normal text-info">({contacts.length})</span>
              </h2>
              <button
                onClick={() => {
                  setContacts([])
                  setContactSelectionneId(null)
                }}
                className="text-muted hover:text-danger transition text-sm flex items-center gap-1"
              >
                <span>🗑️</span> Vider
              </button>
            </div>

            <div className="grid gap-3">
              {contacts.map((contact, index) => {
                const saint = contact.prenom ? trouverProchaineFete(contact.prenom) : null
                const estSelectionne = contactSelectionneId === contact.id
                return (
                  <div
                    key={contact.id}
                    onClick={() => selectionnerContact(contact.id)}
                    className={`group relative bg-canvas border rounded-xl p-4 flex items-center justify-between gap-4 transition-all animate-[slideUp_0.3s_ease] cursor-pointer ${
                      estSelectionne 
                        ? 'border-accent/50 bg-action/5 shadow-[0_0_15px_-3px_rgba(200,168,78,0.15)]' 
                        : 'border-line hover:border-accent/30'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Lueur dorée si sélectionné */}
                    {estSelectionne && (
                      <div className="absolute inset-0 bg-gradient-to-r from-action/5 to-transparent opacity-50 pointer-events-none rounded-xl" />
                    )}
                    
                    {/* Icône contact */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold text-ink relative z-10">
                      {contact.prenom.charAt(0).toUpperCase()}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <p className="font-bold text-ink truncate">{contact.prenom}</p>
                      {contact.nom && (
                        <p className="text-muted text-xs truncate">{contact.nom}</p>
                      )}
                      {saint && (
                        <p className="text-muted text-xs mt-0.5">
                          🎉 Fête le {formaterDate(saint.date)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 relative z-10">
                      {contact.email && (
                        <span className="text-muted text-sm" title={contact.email}>✉️</span>
                      )}
                      {contact.telephone_numero && (
                        <span className="text-muted text-sm" title={`${contact.telephone_indicatif} ${contact.telephone_numero}`}>📞</span>
                      )}
                      {contact.date_naissance && (
                        <span className="text-muted text-sm" title={new Date(contact.date_naissance).toLocaleDateString('fr-FR')}>🎂</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          supprimerContact(contact.id)
                        }}
                        className="text-muted hover:text-danger transition p-1.5 rounded-full hover:bg-red-500/10"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bouton de sauvegarde */}
            <button
              onClick={sauvegarderContacts}
              disabled={sauvegardeEnCours || contacts.length === 0}
              className="mt-6 w-full rounded-xl bg-action hover:bg-action/90 py-3 text-base font-semibold text-on-action shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sauvegardeEnCours ? (
                <>
                  <span className="animate-spin">🌪️</span>
                  Enregistrement...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Enregistrer {contacts.length} contact(s)
                </>
              )}
            </button>
          </div>
        )}

        {/* Stats */}
        {contacts.length > 0 && (
          <div className="text-center text-muted text-sm mb-8">
            <p>
              {stats.avecNom > 0 && <span className="text-accent">{stats.avecNom} avec nom</span>}
              {stats.avecNom > 0 && stats.avecEmail > 0 && ' • '}
              {stats.avecEmail > 0 && <span className="text-accent">{stats.avecEmail} avec email</span>}
              {stats.avecEmail > 0 && stats.avecTelephone > 0 && ' • '}
              {stats.avecTelephone > 0 && <span className="text-accent">{stats.avecTelephone} avec téléphone</span>}
            </p>
          </div>
        )}

        {/* Aide */}
        {contacts.length === 0 && !prenom && (
          <div className="text-center mt-12">
            <div className="text-5xl mb-4">🚀</div>
            <p className="text-muted">
              Commence à taper un prénom
            </p>
            <p className="text-muted text-sm mt-1">
              La date de fête s&apos;affichera automatiquement
            </p>
          </div>
        )}
      </div>

      {/* Overlay des bulles */}
      {bulleOuverte && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
          onClick={fermerBulle}
        />
      )}
      
      {bulleOuverte && rendreBulle(bulleOuverte)}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        kbd {
          font-family: monospace;
          font-size: 0.75em;
        }
      `}</style>
    </div>
  )
}
