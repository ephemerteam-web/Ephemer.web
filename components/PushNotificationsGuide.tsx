"use client"
import Link from 'next/link'
import PushPermissionButton from './PushPermissionButton'
export default function PushNotificationsGuide() {
  return <main className="max-w-2xl mx-auto p-4 space-y-6">
    <Link href="/dashboard/notifications" className="underline">← Retour aux notifications</Link>
    <h1 className="text-2xl font-bold text-ink">Préparer cet appareil</h1>
    <p role="status" className="rounded-xl border border-line p-4 text-warning">Envoi push indisponible actuellement.</p>
    <p className="text-muted">Tu peux autoriser les notifications et enregistrer cet appareil. Cette préparation ne déclenche aucun rappel push. Les alertes dans l’application et les rappels par email suivent leurs propres réglages.</p>
    <section className="rounded-xl border border-line p-5 space-y-3">
      <h2 className="text-lg font-semibold">Enregistrer ou retirer cet appareil</h2>
      <p>Ouvre Ephemer sur l’appareil concerné, connecte-toi et utilise le bouton ci-dessous. Si ton navigateur le permet, il demandera l’autorisation d’afficher des notifications.</p>
      <PushPermissionButton />
      <p className="text-sm text-muted">Une fois l’appareil enregistré, le bouton « Retirer cet appareil » supprime son abonnement.</p>
    </section>
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Sans connexion</h2>
      <p className="text-muted">L’application installée affiche une page de secours publique hors ligne. Pour consulter tes contacts et événements, une connexion est nécessaire. Ces données privées ne sont pas conservées dans le cache hors ligne.</p>
    </section>
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Permission refusée ou navigateur incompatible</h2>
      <p className="text-muted">Vérifie l’autorisation de notifications pour Ephemer dans les réglages du navigateur ou de l’application installée. Recharge ensuite la page. Sur un appareil qui propose l’installation d’Ephemer, essaie également depuis l’application ajoutée à l’écran d’accueil.</p>
      <p className="text-muted">Même avec l’autorisation accordée, aucun push ne sera envoyé tant que l’envoi reste indisponible.</p>
    </section>
  </main>
}
