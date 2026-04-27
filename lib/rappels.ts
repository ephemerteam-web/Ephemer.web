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
