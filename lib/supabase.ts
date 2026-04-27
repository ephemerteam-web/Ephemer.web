// On importe la fonction "createClient" depuis la boîte à outils Supabase
import { createClient } from '@supabase/supabase-js'

// On récupère nos clés secrètes depuis le fichier .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Vérification : si les clés sont absentes, on affiche une erreur claire
// plutôt que de laisser l'app planter avec un message incompréhensible
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('⚠️ Variables Supabase manquantes dans .env.local')
}

// On crée le "client" Supabase : c'est l'objet qui nous permettra
// de communiquer avec notre base de données (inscription, connexion, etc.)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
