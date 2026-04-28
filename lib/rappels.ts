import { supabase } from './supabase'

// Type d'un rappel
export type TypeRappel = 'j30' | 'j7' | 'jourj'

// Fonction qui calcule la date d'envoi d'un rappel selon son type
function calculerDateEnvoi(dateAnniversaire: Date, type: TypeRappel): Date {
  const date = new Date(dateAnniversaire)
  
  if (type === 'j30') {
    date.setDate(date.getDate() - 30) // 30 jours avant
  } else if (type === 'j7') {
    date.setDate(date.getDate() - 7) // 7 jours avant
  }
  // 'jourj' = pas de modification, on garde la date de l'anniversaire
  
  return date
}

// Fonction principale : programmer 3 rappels pour un contact
export async function programmerRappels(
  userId: string,
  contactId: string,
  contactNom: string,
  dateAnniversaireProchaine: Date
) {
  // On prépare les 3 rappels à insérer
  const rappels = [
    {
      user_id: userId,
      contact_id: contactId,
      type_evenement: 'anniversaire',
      type_rappel: 'j30' as TypeRappel,
      date_envoi: calculerDateEnvoi(dateAnniversaireProchaine, 'j30').toISOString(),
      message: `📅 Dans 30 jours, c'est l'anniversaire de ${contactNom} !`,
      statut: 'programme'
    },
    {
      user_id: userId,
      contact_id: contactId,
      type_evenement: 'anniversaire',
      type_rappel: 'j7' as TypeRappel,
      date_envoi: calculerDateEnvoi(dateAnniversaireProchaine, 'j7').toISOString(),
      message: `⏰ Plus que 7 jours avant l'anniversaire de ${contactNom} !`,
      statut: 'programme'
    },
    {
      user_id: userId,
      contact_id: contactId,
      type_evenement: 'anniversaire',
      type_rappel: 'jourj' as TypeRappel,
      date_envoi: calculerDateEnvoi(dateAnniversaireProchaine, 'jourj').toISOString(),
      message: `🎉 C'est aujourd'hui l'anniversaire de ${contactNom} !`,
      statut: 'programme'
    }
  ]

  // Insertion dans la base
  const { data, error } = await supabase
    .from('rappels')
    .insert(rappels)
    .select()

  if (error) {
    console.error('Erreur programmation rappels:', error)
    throw error
  }

  return data
}

// Fonction pour récupérer les rappels existants d'un contact
export async function getRappelsContact(userId: string, contactId: string) {
  const { data, error } = await supabase
    .from('rappels')
    .select('*')
    .eq('user_id', userId)
    .eq('contact_id', contactId)
    .eq('statut', 'programme')

  if (error) {
    console.error('Erreur récupération rappels:', error)
    return []
  }

  return data || []
}

// Fonction pour annuler tous les rappels d'un contact
export async function annulerRappelsContact(userId: string, contactId: string) {
  const { error } = await supabase
    .from('rappels')
    .update({ statut: 'annule' })
    .eq('user_id', userId)
    .eq('contact_id', contactId)
    .eq('statut', 'programme')

  if (error) {
    console.error('Erreur annulation rappels:', error)
    throw error
  }
}
// ============================================================
// 📨 NOUVELLE FONCTIONNALITÉ : Messages programmés par l'utilisateur
// ============================================================

import { calculerDateEvenement, TypeEvenement } from './dates-evenements'

// Type des destinataires possibles
export type Destinataire = 'moi' | 'contact' | 'les_deux'

// 📋 Paramètres pour programmer un message
export interface ParametresMessageProgramme {
  userId: string
  contactId: string
  contact: {
    prenom: string
    nom?: string
    email?: string | null
    date_naissance?: string | null
  }
  typeEvenement: TypeEvenement
  message: string         // le texte généré par l'IA
  ton?: string            // ex: "formel", "humoristique"
  destinataire: Destinataire
  emailUtilisateur: string // ton propre email (pour 'moi' ou 'les_deux')
}

/**
 * Programme un message à envoyer le jour J de l'événement.
 * Crée 1 ou 2 entrées dans la table 'rappels' selon le destinataire.
 */
export async function programmerMessage(params: ParametresMessageProgramme) {
  const {
    userId,
    contactId,
    contact,
    typeEvenement,
    message,
    ton,
    destinataire,
    emailUtilisateur,
  } = params

  // 🗓️ 1. Calculer la date d'envoi
  const dateEvenement = calculerDateEvenement(typeEvenement, contact)

  if (!dateEvenement) {
    throw new Error(
      `Impossible de calculer la date pour l'événement "${typeEvenement}". ` +
      `Vérifie que le contact a bien une date de naissance ou un prénom reconnu.`
    )
  }

  // 📧 2. Préparer le sujet de l'email
  const nomComplet = `${contact.prenom}${contact.nom ? ' ' + contact.nom : ''}`
  const sujet = `✨ Message pour ${nomComplet}`

  // 👥 3. Construire les entrées à insérer selon le destinataire
  const entrees = []

  // Pour MOI (l'utilisateur)
  if (destinataire === 'moi' || destinataire === 'les_deux') {
    entrees.push({
      user_id: userId,
      contact_id: contactId,
      type_evenement: typeEvenement,
      type_rappel: 'jourj',
      source: 'message_programme',
      date_envoi: dateEvenement.toISOString().split('T')[0],
      message,
      sujet_email: sujet,
      destinataire: 'moi',
      email_destinataire: emailUtilisateur,
      ton: ton || null,
      statut: 'programme',
    })
  }

  // Pour le CONTACT
  if (destinataire === 'contact' || destinataire === 'les_deux') {
    if (!contact.email) {
      throw new Error(
        `Ce contact n'a pas d'email. Ajoute un email à ${contact.prenom} avant de programmer.`
      )
    }
    entrees.push({
      user_id: userId,
      contact_id: contactId,
      type_evenement: typeEvenement,
      type_rappel: 'jourj',
      source: 'message_programme',
      date_envoi: dateEvenement.toISOString().split('T')[0],
      message,
      sujet_email: sujet,
      destinataire: 'contact',
      email_destinataire: contact.email,
      ton: ton || null,
      statut: 'programme',
    })
  }

  // 💾 4. Insertion dans Supabase
  const { data, error } = await supabase
    .from('rappels')
    .insert(entrees)
    .select()

  if (error) {
    console.error('❌ Erreur programmation message:', error)
    throw error
  }

  return {
    success: true,
    nbMessages: data.length,
    dateEnvoi: dateEvenement,
    data,
  }
}
