// 📋 Généré depuis le schéma public réel le 4 octobre 2026. Ne pas modifier à la main.
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
          contact_id: number
          created_at: string | null
          email_envoye: boolean
          event_date: string | null
          event_description: string | null
          id: string
          jours_restants: number | null
          lue: boolean | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          contact_id: number
          created_at?: string | null
          email_envoye?: boolean
          event_date?: string | null
          event_description?: string | null
          id?: string
          jours_restants?: number | null
          lue?: boolean | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          contact_id?: number
          created_at?: string | null
          email_envoye?: boolean
          event_date?: string | null
          event_description?: string | null
          id?: string
          jours_restants?: number | null
          lue?: boolean | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
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
          contact_id: number
          created_at: string
          date_envoi: string
          destinataire: string
          email_destinataire: string | null
          event_date: string | null
          event_description: string | null
          id: number
          message: string
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
          contact_id: number
          created_at?: string
          date_envoi: string
          destinataire: string
          email_destinataire?: string | null
          event_date?: string | null
          event_description?: string | null
          id?: never
          message: string
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
          contact_id?: number
          created_at?: string
          date_envoi?: string
          destinataire?: string
          email_destinataire?: string | null
          event_date?: string | null
          event_description?: string | null
          id?: never
          message?: string
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
            foreignKeyName: "rappels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
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
      est_contact_lie: {
        Args: { email_du_contact: string; mon_user_id: string }
        Returns: boolean
      }
      incrementer_quota_ia: { Args: { p_user_id: string }; Returns: number }
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

