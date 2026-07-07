// app/conditions/page.tsx
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'

export default function ConditionsPage() {
  const currentYear = new Date().getFullYear()

  return (
    <AppLayout>
      {/* Conteneur centré + largeur max pour la lisibilité */}
      <div className="relative z-10 w-full max-w-3xl px-5 py-10 sm:py-14 text-gray-300 leading-relaxed">

        {/* Lien retour */}
        <Link
          href="/"
          className="text-sm text-[#C8A84E] hover:text-[#e0c46a] transition-colors"
        >
          ← Retour à l'accueil
        </Link>

        {/* En-tête */}
        <header className="mt-8 mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            Conditions Générales d'Utilisation (CGU)
          </h1>
          <p className="text-sm text-gray-500">
            Dernière mise à jour : 18 mai 2026
          </p>
        </header>

        {/* 1 */}
        <Section titre="1. Objet">
          <p>Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités d'utilisation du service Ephemer.name, application permettant la gestion de contacts, la génération de messages personnalisés et la planification de rappels d'événements.</p>
        </Section>

        {/* 2 */}
        <Section titre="2. Acceptation des conditions">
          <p>En accédant et en utilisant le service, l'utilisateur accepte sans réserve les présentes CGU. En cas de désaccord, l'utilisateur doit cesser d'utiliser le service.</p>
        </Section>

        {/* 3 */}
        <Section titre="3. Accès au service">
          <p>Le service est accessible gratuitement, hors coûts éventuels liés à l'accès internet. Certaines fonctionnalités peuvent évoluer ou être restreintes sans préavis.</p>
        </Section>

        {/* 4 */}
        <Section titre="4. Création de compte">
          <p>L'utilisateur s'engage à fournir des informations exactes lors de son inscription. Il est responsable de la confidentialité de ses identifiants.</p>
        </Section>

        {/* 5 */}
        <Section titre="5. Fonctionnalités">
          <Liste>
            <li>Gestion de contacts (ajout manuel ou import) ;</li>
            <li>Détection d'événements (anniversaires, fêtes) ;</li>
            <li>Génération de messages personnalisés ;</li>
            <li>Notifications et rappels.</li>
          </Liste>
        </Section>

        {/* 6 */}
        <Section titre="6. Responsabilités">
          <p>Ephemer.name met tout en œuvre pour assurer la fiabilité du service, mais ne garantit pas l'absence d'erreurs ou d'interruptions.</p>
          <p>L'utilisateur est seul responsable de l'utilisation qu'il fait des messages générés.</p>
        </Section>

        {/* 7 */}
        <Section titre="7. Données personnelles">
          <p>
            Les données personnelles sont traitées conformément au RGPD. Pour plus d'informations, consultez la{' '}
            <Link href="/confidentialite" className="text-[#C8A84E] hover:text-[#e0c46a] font-medium">
              politique de confidentialité
            </Link>
            .
          </p>
        </Section>

        {/* 8 */}
        <Section titre="8. Propriété intellectuelle">
          <p>Tous les éléments du service (design, textes, fonctionnalités) sont protégés par le droit de la propriété intellectuelle. Toute reproduction est interdite sans autorisation.</p>
        </Section>

        {/* 9 */}
        <Section titre="9. Résiliation">
          <p>L'utilisateur peut supprimer son compte à tout moment. L'éditeur se réserve le droit de suspendre un compte en cas de non-respect des CGU.</p>
        </Section>

        {/* 10 */}
        <Section titre="10. Modification des CGU">
          <p>Les présentes conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés en cas de modification majeure.</p>
        </Section>

        {/* 11 */}
        <Section titre="11. Droit applicable">
          <p>Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français seront compétents.</p>
        </Section>

        {/* Encart contact */}
        <div className="mt-10 p-5 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-2">12. Contact</h2>
          <p className="mb-2">Pour toute question concernant ces conditions, écrivez-nous à :</p>
          <p>
            <a href="mailto:ephemer.team@gmail.com" className="text-[#C8A84E] hover:text-[#e0c46a] font-medium">
              ephemer.team@gmail.com
            </a>
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-5 border-t border-white/10 text-xs text-gray-500">
          <p>Ephemer.name © {currentYear} • Tous droits réservés.</p>
        </footer>
      </div>
    </AppLayout>
  )
}

// ============================================
// 🧩 PETITS COMPOSANTS RÉUTILISABLES
// (identiques à ceux de la page confidentialité)
// ============================================

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3">{titre}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Liste({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 space-y-1.5 marker:text-[#C8A84E]">{children}</ul>
}
