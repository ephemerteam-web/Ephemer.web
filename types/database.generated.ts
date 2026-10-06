export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appartenances_listes: {
        Row: {
          contact_id: number
          created_at: string
          id: string
          liste_id: string
          user_id: string
        }
        Insert: {
          contact_id: number
          created_at?: string
          id?: string
          liste_id: string
          user_id?: string
        }
        Update: {
          contact_id?: number
          created_at?: string
          id?: string
          liste_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot03_appartenances_contact"
            columns: ["user_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "lot03_appartenances_liste"
            columns: ["user_id", "liste_id"]
            isOneToOne: false
            referencedRelation: "listes_personnelles"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      cadeaux_offerts: {
        Row: {
          achat_declare: boolean
          choix_id: string | null
          contact_id: number | null
          created_at: string
          date_achat: string | null
          date_don: string
          destinataire_historique: string
          devise_depensee: string | null
          id: string
          montant_depense_centimes: number | null
          occurrence_id: string | null
          reaction: string | null
          revision: number
          titre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achat_declare?: boolean
          choix_id?: string | null
          contact_id?: number | null
          created_at?: string
          date_achat?: string | null
          date_don: string
          destinataire_historique: string
          devise_depensee?: string | null
          id?: string
          montant_depense_centimes?: number | null
          occurrence_id?: string | null
          reaction?: string | null
          revision?: number
          titre: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          achat_declare?: boolean
          choix_id?: string | null
          contact_id?: number | null
          created_at?: string
          date_achat?: string | null
          date_don?: string
          destinataire_historique?: string
          devise_depensee?: string | null
          id?: string
          montant_depense_centimes?: number | null
          occurrence_id?: string | null
          reaction?: string | null
          revision?: number
          titre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot05_don_choix"
            columns: ["user_id", "choix_id"]
            isOneToOne: true
            referencedRelation: "choix_cadeaux"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "lot05_don_contact"
            columns: ["user_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "lot05_don_occurrence"
            columns: ["user_id", "occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences_evenements"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      choix_cadeaux: {
        Row: {
          created_at: string
          date_achat: string | null
          devise_depensee: string | null
          devise_estimee: string | null
          etat: string
          id: string
          idee_id: string | null
          montant_depense_centimes: number | null
          preparation_id: string
          prix_estime_centimes: number | null
          revision: number
          titre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_achat?: string | null
          devise_depensee?: string | null
          devise_estimee?: string | null
          etat?: string
          id?: string
          idee_id?: string | null
          montant_depense_centimes?: number | null
          preparation_id: string
          prix_estime_centimes?: number | null
          revision?: number
          titre: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date_achat?: string | null
          devise_depensee?: string | null
          devise_estimee?: string | null
          etat?: string
          id?: string
          idee_id?: string | null
          montant_depense_centimes?: number | null
          preparation_id?: string
          prix_estime_centimes?: number | null
          revision?: number
          titre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot05_choix_idee"
            columns: ["user_id", "idee_id"]
            isOneToOne: false
            referencedRelation: "idees_cadeaux"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "lot05_choix_preparation"
            columns: ["user_id", "preparation_id"]
            isOneToOne: false
            referencedRelation: "preparations_evenements"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          date_naissance: string | null
          email: string | null
          est_favori: boolean | null
          id: number
          invitation_id: string | null
          nom: string | null
          note: string | null
          prenom: string | null
          relation: string | null
          telephone_indicatif: string | null
          telephone_numero: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date_naissance?: string | null
          email?: string | null
          est_favori?: boolean | null
          id?: number
          invitation_id?: string | null
          nom?: string | null
          note?: string | null
          prenom?: string | null
          relation?: string | null
          telephone_indicatif?: string | null
          telephone_numero?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date_naissance?: string | null
          email?: string | null
          est_favori?: boolean | null
          id?: number
          invitation_id?: string | null
          nom?: string | null
          note?: string | null
          prenom?: string | null
          relation?: string | null
          telephone_indicatif?: string | null
          telephone_numero?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      evenements_personnels: {
        Row: {
          archive: boolean
          arrete_apres_cycle: number | null
          choix_a_reconfirmer: boolean
          contact_id: number | null
          created_at: string
          id: string
          origine: string
          rappels_actifs: boolean
          recurrence: string
          revision: number
          titre: string
          type_evenement: string
          updated_at: string
          user_id: string
          visible: boolean
        }
        Insert: {
          archive?: boolean
          arrete_apres_cycle?: number | null
          choix_a_reconfirmer?: boolean
          contact_id?: number | null
          created_at?: string
          id?: string
          origine: string
          rappels_actifs?: boolean
          recurrence?: string
          revision?: number
          titre: string
          type_evenement: string
          updated_at?: string
          user_id: string
          visible?: boolean
        }
        Update: {
          archive?: boolean
          arrete_apres_cycle?: number | null
          choix_a_reconfirmer?: boolean
          contact_id?: number | null
          created_at?: string
          id?: string
          origine?: string
          rappels_actifs?: boolean
          recurrence?: string
          revision?: number
          titre?: string
          type_evenement?: string
          updated_at?: string
          user_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lot02_evenement_contact_owner"
            columns: ["user_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      idees_cadeaux: {
        Row: {
          archivee: boolean
          contact_id: number | null
          created_at: string
          devise_estimee: string | null
          id: string
          lien_marchand: string | null
          note: string | null
          prix_estime_centimes: number | null
          revision: number
          titre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archivee?: boolean
          contact_id?: number | null
          created_at?: string
          devise_estimee?: string | null
          id?: string
          lien_marchand?: string | null
          note?: string | null
          prix_estime_centimes?: number | null
          revision?: number
          titre: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archivee?: boolean
          contact_id?: number | null
          created_at?: string
          devise_estimee?: string | null
          id?: string
          lien_marchand?: string | null
          note?: string | null
          prix_estime_centimes?: number | null
          revision?: number
          titre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot05_idee_contact"
            columns: ["user_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      invitations: {
        Row: {
          actif: boolean
          created_at: string
          expires_at: string
          id: string
          label: string | null
          max_utilisations: number
          nb_utilisations: number
          token: string
          user_id: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          label?: string | null
          max_utilisations?: number
          nb_utilisations?: number
          token: string
          user_id: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          label?: string | null
          max_utilisations?: number
          nb_utilisations?: number
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      listes_personnelles: {
        Row: {
          created_at: string
          id: string
          nom: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          canal_email: boolean
          canal_push: boolean
          newsletter_mensuelle: boolean
          rappel_j1: boolean
          rappel_j3: boolean
          rappel_j7: boolean
          rappel_jourj: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          canal_email?: boolean
          canal_push?: boolean
          newsletter_mensuelle?: boolean
          rappel_j1?: boolean
          rappel_j3?: boolean
          rappel_j7?: boolean
          rappel_jourj?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          canal_email?: boolean
          canal_push?: boolean
          newsletter_mensuelle?: boolean
          rappel_j1?: boolean
          rappel_j3?: boolean
          rappel_j7?: boolean
          rappel_jourj?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          contact_id: number | null
          created_at: string | null
          email_envoye: boolean
          event_date: string | null
          event_description: string | null
          id: string
          jours_restants: number | null
          lue: boolean | null
          message: string
          occurrence_id: string | null
          occurrence_revision: number | null
          type: string
          user_id: string
        }
        Insert: {
          contact_id?: number | null
          created_at?: string | null
          email_envoye?: boolean
          event_date?: string | null
          event_description?: string | null
          id?: string
          jours_restants?: number | null
          lue?: boolean | null
          message: string
          occurrence_id?: string | null
          occurrence_revision?: number | null
          type: string
          user_id: string
        }
        Update: {
          contact_id?: number | null
          created_at?: string | null
          email_envoye?: boolean
          event_date?: string | null
          event_description?: string | null
          id?: string
          jours_restants?: number | null
          lue?: boolean | null
          message?: string
          occurrence_id?: string | null
          occurrence_revision?: number | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot02_notification_occurrence_owner"
            columns: ["user_id", "occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences_evenements"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "notifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrences_evenements: {
        Row: {
          annulee: boolean
          created_at: string
          cycle: number
          date_exception: boolean
          date_occurrence: string
          evenement_id: string
          id: string
          regle_id: string
          revision: number
          titre_historique: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annulee?: boolean
          created_at?: string
          cycle: number
          date_exception?: boolean
          date_occurrence: string
          evenement_id: string
          id?: string
          regle_id: string
          revision?: number
          titre_historique: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annulee?: boolean
          created_at?: string
          cycle?: number
          date_exception?: boolean
          date_occurrence?: string
          evenement_id?: string
          id?: string
          regle_id?: string
          revision?: number
          titre_historique?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot02_occurrence_regle_owner"
            columns: ["user_id", "evenement_id", "regle_id"]
            isOneToOne: false
            referencedRelation: "regles_evenements"
            referencedColumns: ["user_id", "evenement_id", "id"]
          },
        ]
      }
      patch_notes: {
        Row: {
          changes: string[]
          created_at: string
          id: string
          is_major: boolean | null
          release_date: string
          title: string
          version: string
        }
        Insert: {
          changes: string[]
          created_at?: string
          id?: string
          is_major?: boolean | null
          release_date: string
          title: string
          version: string
        }
        Update: {
          changes?: string[]
          created_at?: string
          id?: string
          is_major?: boolean | null
          release_date?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      preferences_cadeaux_contacts: {
        Row: {
          categories: string[]
          contact_id: number
          created_at: string
          id: string
          revision: number
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: string[]
          contact_id: number
          created_at?: string
          id?: string
          revision?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          categories?: string[]
          contact_id?: number
          created_at?: string
          id?: string
          revision?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferences_cadeaux_contacts_user_id_contact_id_fkey"
            columns: ["user_id", "contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      preferences_styles_messages: {
        Row: {
          created_at: string
          id: string
          revision: number
          style_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          revision?: number
          style_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          revision?: number
          style_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferences_styles_messages_user_id_style_id_fkey"
            columns: ["user_id", "style_id"]
            isOneToOne: false
            referencedRelation: "styles_messages"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      preparations_evenements: {
        Row: {
          created_at: string
          etat: string
          id: string
          occurrence_id: string
          revision: number
          sans_achat: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          etat?: string
          id?: string
          occurrence_id: string
          revision?: number
          sans_achat?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          etat?: string
          id?: string
          occurrence_id?: string
          revision?: number
          sans_achat?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot04_preparation_occurrence"
            columns: ["user_id", "occurrence_id"]
            isOneToOne: true
            referencedRelation: "occurrences_evenements"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          date_naissance: string | null
          email: string | null
          id: string
          nom: string | null
          prenom: string | null
          telephone_indicatif: string | null
          telephone_numero: string | null
        }
        Insert: {
          created_at?: string
          date_naissance?: string | null
          email?: string | null
          id?: string
          nom?: string | null
          prenom?: string | null
          telephone_indicatif?: string | null
          telephone_numero?: string | null
        }
        Update: {
          created_at?: string
          date_naissance?: string | null
          email?: string | null
          id?: string
          nom?: string | null
          prenom?: string | null
          telephone_indicatif?: string | null
          telephone_numero?: string | null
        }
        Relationships: []
      }
      quotas_ia: {
        Row: {
          created_at: string
          id: string
          jour: string
          nb_appels: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jour?: string
          nb_appels?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jour?: string
          nb_appels?: number
          user_id?: string
        }
        Relationships: []
      }
      rappels: {
        Row: {
          contact_id: number | null
          created_at: string
          date_envoi: string
          destinataire: string
          email_destinataire: string | null
          event_date: string | null
          event_description: string | null
          id: number
          message: string
          occurrence_id: string | null
          occurrence_revision: number | null
          sent_at: string | null
          source: string | null
          statut: string | null
          sujet_email: string
          ton: string | null
          type_evenement: string
          type_rappel: string
          user_id: string
        }
        Insert: {
          contact_id?: number | null
          created_at?: string
          date_envoi: string
          destinataire: string
          email_destinataire?: string | null
          event_date?: string | null
          event_description?: string | null
          id?: never
          message: string
          occurrence_id?: string | null
          occurrence_revision?: number | null
          sent_at?: string | null
          source?: string | null
          statut?: string | null
          sujet_email: string
          ton?: string | null
          type_evenement?: string
          type_rappel: string
          user_id: string
        }
        Update: {
          contact_id?: number | null
          created_at?: string
          date_envoi?: string
          destinataire?: string
          email_destinataire?: string | null
          event_date?: string | null
          event_description?: string | null
          id?: never
          message?: string
          occurrence_id?: string | null
          occurrence_revision?: number | null
          sent_at?: string | null
          source?: string | null
          statut?: string | null
          sujet_email?: string
          ton?: string | null
          type_evenement?: string
          type_rappel?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot02_rappel_occurrence_owner"
            columns: ["user_id", "occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences_evenements"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "rappels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      regles_evenements: {
        Row: {
          annee_naissance: number | null
          created_at: string
          date_ponctuelle: string | null
          debut_cycle: number
          evenement_id: string
          fete_prenom_cle: string | null
          fin_cycle: number | null
          id: string
          jour: number | null
          mois: number | null
          retiree: boolean
          user_id: string
        }
        Insert: {
          annee_naissance?: number | null
          created_at?: string
          date_ponctuelle?: string | null
          debut_cycle: number
          evenement_id: string
          fete_prenom_cle?: string | null
          fin_cycle?: number | null
          id?: string
          jour?: number | null
          mois?: number | null
          retiree?: boolean
          user_id: string
        }
        Update: {
          annee_naissance?: number | null
          created_at?: string
          date_ponctuelle?: string | null
          debut_cycle?: number
          evenement_id?: string
          fete_prenom_cle?: string | null
          fin_cycle?: number | null
          id?: string
          jour?: number | null
          mois?: number | null
          retiree?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot02_regle_owner"
            columns: ["user_id", "evenement_id"]
            isOneToOne: false
            referencedRelation: "evenements_personnels"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      saint_du_jour: {
        Row: {
          caption: string | null
          created_at: string | null
          date_fete: string
          id: string
          image_url: string
          prenom: string | null
          saint: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          date_fete: string
          id?: string
          image_url: string
          prenom?: string | null
          saint: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          date_fete?: string
          id?: string
          image_url?: string
          prenom?: string | null
          saint?: string
        }
        Relationships: []
      }
      styles_messages: {
        Row: {
          adresse: string
          created_at: string
          emojis: boolean
          id: string
          longueur: string
          nom: string
          revision: number
          signature: string
          ton: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse?: string
          created_at?: string
          emojis?: boolean
          id?: string
          longueur?: string
          nom: string
          revision?: number
          signature?: string
          ton: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          adresse?: string
          created_at?: string
          emojis?: boolean
          id?: string
          longueur?: string
          nom?: string
          revision?: number
          signature?: string
          ton?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      styles_messages_contacts: {
        Row: {
          contact_id: number
          created_at: string
          id: string
          revision: number
          style_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: number
          created_at?: string
          id?: string
          revision?: number
          style_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          contact_id?: number
          created_at?: string
          id?: string
          revision?: number
          style_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "styles_messages_contacts_user_id_contact_id_fkey"
            columns: ["user_id", "contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "styles_messages_contacts_user_id_style_id_fkey"
            columns: ["user_id", "style_id"]
            isOneToOne: false
            referencedRelation: "styles_messages"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      taches_preparation: {
        Row: {
          brouillon_texte: string | null
          created_at: string
          etat: string
          id: string
          preparation_id: string
          revision: number
          titre: string
          type_tache: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brouillon_texte?: string | null
          created_at?: string
          etat?: string
          id?: string
          preparation_id: string
          revision?: number
          titre: string
          type_tache: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          brouillon_texte?: string | null
          created_at?: string
          etat?: string
          id?: string
          preparation_id?: string
          revision?: number
          titre?: string
          type_tache?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot04_tache_preparation"
            columns: ["user_id", "preparation_id"]
            isOneToOne: false
            referencedRelation: "preparations_evenements"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      user_push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ajouter_tache_lot04: {
        Args: {
          p_id: string
          p_preparation: string
          p_titre: string
          p_type: string
        }
        Returns: {
          brouillon_texte: string | null
          created_at: string
          etat: string
          id: string
          preparation_id: string
          revision: number
          titre: string
          type_tache: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "taches_preparation"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      budget_cadeaux_lot05: {
        Args: { p_debut: string; p_fin: string }
        Returns: {
          depense: string
          depense_sans_date: string
          devise: string
          nb_depense_inconnu: number
          nb_depense_sans_date: number
          nb_depense_sans_date_inconnu: number
          nb_prevu_inconnu: number
          prevu: string
        }[]
      }
      choisir_idee_lot05: {
        Args: { p_id: string; p_idee: string; p_preparation: string }
        Returns: {
          created_at: string
          date_achat: string | null
          devise_depensee: string | null
          devise_estimee: string | null
          etat: string
          id: string
          idee_id: string | null
          montant_depense_centimes: number | null
          preparation_id: string
          prix_estime_centimes: number | null
          revision: number
          titre: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "choix_cadeaux"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      creer_invitation: {
        Args: { p_label?: string }
        Returns: {
          actif: boolean
          created_at: string
          expires_at: string
          id: string
          label: string
          max_utilisations: number
          nb_utilisations: number
          token: string
        }[]
      }
      desactiver_invitation: { Args: { p_id: string }; Returns: undefined }
      enregistrer_evenement_lot02: { Args: { p_donnees: Json }; Returns: Json }
      enregistrer_preparation_lot04: {
        Args: {
          p_etat: string
          p_id: string
          p_revision: number
          p_sans_achat: boolean
        }
        Returns: {
          created_at: string
          etat: string
          id: string
          occurrence_id: string
          revision: number
          sans_achat: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "preparations_evenements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      enregistrer_tache_lot04: {
        Args: {
          p_brouillon: string
          p_etat: string
          p_id: string
          p_revision: number
          p_titre: string
        }
        Returns: {
          brouillon_texte: string | null
          created_at: string
          etat: string
          id: string
          preparation_id: string
          revision: number
          titre: string
          type_tache: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "taches_preparation"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      est_contact_lie: {
        Args: { email_du_contact: string; mon_user_id: string }
        Returns: boolean
      }
      incrementer_quota_ia: { Args: { p_user_id: string }; Returns: number }
      materialiser_occurrences_lot02: {
        Args: { p_debut: string; p_fin: string }
        Returns: {
          annulee: boolean
          created_at: string
          cycle: number
          date_exception: boolean
          date_occurrence: string
          evenement_id: string
          id: string
          regle_id: string
          revision: number
          titre_historique: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "occurrences_evenements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      materialiser_occurrences_serveur_lot02: {
        Args: { p_debut: string; p_fin: string; p_user: string }
        Returns: {
          annulee: boolean
          created_at: string
          cycle: number
          date_exception: boolean
          date_occurrence: string
          evenement_id: string
          id: string
          regle_id: string
          revision: number
          titre_historique: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "occurrences_evenements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      modifier_occurrence_lot02: {
        Args: {
          p_annulee: boolean
          p_date: string
          p_id: string
          p_revision: number
        }
        Returns: Json
      }
      noter_cadeau_offert_lot05: {
        Args: {
          p_choix: string
          p_date: string
          p_id: string
          p_reaction: string
        }
        Returns: {
          achat_declare: boolean
          choix_id: string | null
          contact_id: number | null
          created_at: string
          date_achat: string | null
          date_don: string
          destinataire_historique: string
          devise_depensee: string | null
          id: string
          montant_depense_centimes: number | null
          occurrence_id: string | null
          reaction: string | null
          revision: number
          titre: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cadeaux_offerts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ouvrir_preparation_lot04: {
        Args: { p_occurrence: string }
        Returns: {
          created_at: string
          etat: string
          id: string
          occurrence_id: string
          revision: number
          sans_achat: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "preparations_evenements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      preferences_evenement_lot02: {
        Args: {
          p_archive: boolean
          p_arret: number
          p_id: string
          p_rappels: boolean
          p_revision: number
          p_visible: boolean
        }
        Returns: Json
      }
      repondre_invitation: {
        Args: {
          p_date_naissance: string
          p_email: string
          p_nom: string
          p_note: string
          p_prenom: string
          p_relation: string
          p_tel_indicatif: string
          p_tel_numero: string
          p_token: string
        }
        Returns: {
          inviteur_prenom: string
          raison: string
          succes: boolean
        }[]
      }
      soumettre_invitation: {
        Args: {
          p_date_naissance?: string
          p_email?: string
          p_nom?: string
          p_note?: string
          p_prenom: string
          p_relation?: string
          p_telephone_indicatif?: string
          p_telephone_numero?: string
          p_token: string
        }
        Returns: {
          message: string
          prenom_hote: string
          succes: boolean
        }[]
      }
      supprimer_evenement_lot02: {
        Args: { p_confirmer: boolean; p_id: string; p_revision: number }
        Returns: undefined
      }
      verifier_invitation: {
        Args: { p_token: string }
        Returns: {
          places_restantes: number
          prenom_hote: string
          raison: string
          valide: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
