import { supabase } from './supabase-browser'
import { calculerDateEvenement, TypeEvenement } from './date-utils'

// ============================================================
// 🔔 RAPPELS AUTOMATIQUES
// ============================================================

export type TypeRappel = 'j30' | 'j7' | 'jourj'

function calculerDateEnvoi(dateAnniversaire: Date, type: TypeRappel): Date {
  const date = new Date(dateAnniversaire)

  if (type === 'j30') {
    date.setDate(date.getDate() - 30)
  } else if (type === 'j7') {
    date.setDate(date.getDate() - 7)
  }

  return date
}

export async function programmerRappels(
  userId: string,
  contactId: string,
  contactNom: string,
  dateAnniversaireProchaine: Date,
  // 👇 NOUVEAU : Paramètres optionnels pour les dates spéciales
  eventDate?: string,
  eventDescription?: string
) {
  const typeEvenement = eventDate ? 'jour_special' : 'anniversaire'
  const dateBase = eventDate ? new Date(eventDate) : dateAnniversaireProchaine

  const rappels = [
    {
      user_id: userId,
      contact_id: contactId,
      type_evenement: typeEvenement,
      type_rappel: 'j30' as TypeRappel,
      date_envoi: calculerDateEnvoi(dateBase, 'j30').toISOString(),
      message: eventDate
        ? `📅 Dans 30 jours, c'est ${eventDescription || "cet événement spécial"} pour ${contactNom}!`
        : `📅 Dans 30 jours, c'est l'anniversaire de ${contactNom}!`,
      statut: 'programme',
      // 👇 NOUVEAU : Champs pour les dates spéciales
      event_date: eventDate || null,
      event_description: eventDescription || null,
    },
    {
      user_id: userId,
      contact_id: contactId,
      type_evenement: typeEvenement,
      type_rappel: 'j7' as TypeRappel,
      date_envoi: calculerDateEnvoi(dateBase, 'j7').toISOString(),
      message: eventDate
        ? `⏰ Plus que 7 jours avant ${eventDescription || "cet événement spécial"} pour ${contactNom}!`
        : `⏰ Plus que 7 jours avant l'anniversaire de ${contactNom}!`,
      statut: 'programme',
      event_date: eventDate || null,
      event_description: eventDescription || null,
    },
    {
      user_id: userId,
      contact_id: contactId,
      type_evenement: typeEvenement,
      type_rappel: 'jourj' as TypeRappel,
      date_envoi: dateBase.toISOString(),
      message: eventDate
        ? `🎉 C'est aujourd'hui ${eventDescription || "cet événement spécial"} pour ${contactNom}!`
        : `🎉 C'est aujourd'hui l'anniversaire de ${contactNom}!`,
      statut: 'programme',
      event_date: eventDate || null,
      event_description: eventDescription || null,
    }
  ]

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
// 📨 MESSAGES PROGRAMMÉS (UTILISATEUR)
// ============================================================

export type Destinataire = 'moi' | 'contact' | 'les_deux'

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
  message: string
  ton?: string
  destinataire: Destinataire
  emailUtilisateur: string
  dateOverride?: Date
  // 👇 NOUVEAU : Champs pour les dates spéciales
  eventDate?: string
  eventDescription?: string
}

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
    dateOverride,
    // 👇 NOUVEAU : Récupération des champs pour les dates spéciales
    eventDate,
    eventDescription,
  } = params

  // Gestion de la date
  let dateEvenement: Date

  if (dateOverride) {
    dateEvenement = dateOverride
  } else if (eventDate) {
    // 👇 NOUVEAU : Cas pour les dates spéciales
    dateEvenement = new Date(eventDate)
  } else {
    const dateCalculee = calculerDateEvenement(typeEvenement, contact)
    if (!dateCalculee) {
      throw new Error(
        `Impossible de calculer la date pour l'événement "${typeEvenement}".`
      )
    }
    dateEvenement = new Date(dateCalculee)
  }

  // Sécurité
  if (isNaN(dateEvenement.getTime())) {
    throw new Error("Date invalide.")
  }

  if (dateEvenement < new Date()) {
    throw new Error("La date doit être dans le futur.")
  }

  // Sujet
  const nomComplet = `${contact.prenom}${contact.nom ? ' ' + contact.nom : ''}`
  const sujet = `✨ Message pour ${nomComplet}`

  const entrees = []

  // Pour MOI
  if (destinataire === 'moi' || destinataire === 'les_deux') {
    entrees.push({
      user_id: userId,
      contact_id: contactId,
      type_evenement: typeEvenement,
      type_rappel: 'jourj',
      source: 'message_programme',
      date_envoi: dateEvenement.toISOString(),
      message,
      sujet_email: sujet,
      destinataire: 'moi',
      email_destinataire: emailUtilisateur,
      ton: ton || null,
      statut: 'programme',
      // 👇 NOUVEAU : Champs pour les dates spéciales
      event_date: eventDate || null,
      event_description: eventDescription || null,
    })
  }

  // Pour CONTACT
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
      date_envoi: dateEvenement.toISOString(),
      message,
      sujet_email: sujet,
      destinataire: 'contact',
      email_destinataire: contact.email,
      ton: ton || null,
      statut: 'programme',
      // 👇 NOUVEAU : Champs pour les dates spéciales
      event_date: eventDate || null,
      event_description: eventDescription || null,
    })
  }

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
