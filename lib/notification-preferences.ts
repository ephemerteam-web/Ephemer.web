// 🔔 Les valeurs du schéma sont partagées par les écrans et les traitements serveur.
export const DEFAULT_PREFERENCES = {
  canal_email: true, canal_push: false,
  rappel_j7: true, rappel_j3: true, rappel_j1: false, rappel_jourj: true,
  newsletter_mensuelle: false,
}
export type NotificationPreferences = typeof DEFAULT_PREFERENCES
export type OptionalPreferences = { [K in keyof NotificationPreferences]?: boolean | null }

// Un false enregistré reste false. Une erreur de lecture doit être gérée par l'appelant.
export function resolvePreferences(value: OptionalPreferences | null | undefined): NotificationPreferences {
  return Object.fromEntries(Object.entries(DEFAULT_PREFERENCES).map(([key, fallback]) => {
    const saved = value?.[key as keyof NotificationPreferences]
    return [key, typeof saved === 'boolean' ? saved : fallback]
  })) as NotificationPreferences
}
