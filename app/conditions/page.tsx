// app/conditions/page.tsx
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'

export default function ConditionsPage() {
  const currentYear = new Date().getFullYear()

  return (
    <AppLayout>
      {/* Conteneur centré + largeur max pour la lisibilité */}
      <div className="relative z-10 w-full max-w-3xl px-5 py-10 sm:py-14 text-muted leading-relaxed">

        {/* Lien retour */}
        <Link
          href="/"
          className="text-sm text-accent hover:text-accent transition-colors"
        >
          ← Retour à l&apos;accueil
        </Link>

        {/* En-tête */}
        <header className="mt-8 mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-3">
            Conditions Générales d&apos;Utilisation (CGU)
          </h1>
          <p className="text-sm text-muted">
            Dernière mise à jour : 18 mai 2026
          </p>
        </header>

        {/* 1 */}
        <Section titre="1. Objet">
          <p>Les présentes Conditions Générales d&apos;Utilisation (CGU) ont pour objet de définir les modalités d&apos;utilisation du service Ephemer.name, application permettant la gestion de contacts, la génération de messages personnalisés et la planification de rappels d&apos;événements.</p>
        </Section>

        {/* 2 */}
        <Section titre="2. Acceptation des conditions">
          <p>En accédant et en utilisant le service, l&apos;utilisateur accepte sans réserve les présentes CGU. En cas de désaccord, l&apos;utilisateur doit cesser d&apos;utiliser le service.</p>
        </Section>

        {/* 3 */}
        <Section titre="3. Accès au service">
          <p>Le service est accessible gratuitement, hors coûts éventuels liés à l&apos;accès internet. Certaines fonctionnalités peuvent évoluer ou être restreintes sans préavis.</p>
        </Section>

        {/* 4 */}
        <Section titre="4. Création de compte">
          <p>L&apos;utilisateur s&apos;engage à fournir des informations exactes lors de son inscription. Il est responsable de la confidentialité de ses identifiants.</p>
        </Section>

        {/* 5 */}
        <Section titre="5. Fonctionnalités">
          <Liste>
            <li>Gestion de contacts (ajout manuel ou import) ;</li>
            <li>Détection d&apos;événements (anniversaires, fêtes) ;</li>
            <li>Génération de messages personnalisés ;</li>
            <li>Notifications et rappels.</li>
          </Liste>
        </Section>

        {/* 6 */}
        <Section titre="6. Responsabilités">
          <p>Ephemer.name met tout en œuvre pour assurer la fiabilité du service, mais ne garantit pas l&apos;absence d&apos;erreurs ou d&apos;interruptions.</p>
          <p>L&apos;utilisateur est seul responsable de l&apos;utilisation qu&apos;il fait des messages générés.</p>
        </Section>

        {/* 7 */}
        <Section titre="7. Données personnelles">
          <p>
            Les données personnelles sont traitées conformément au RGPD. Pour plus d&apos;informations, consultez la{' '}
            <Link href="/confidentialite" className="text-accent hover:text-accent font-medium">
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
          <p>L&apos;utilisateur peut supprimer son compte à tout moment. L&apos;éditeur se réserve le droit de suspendre un compte en cas de non-respect des CGU.</p>
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
        <div className="mt-10 p-5 rounded-xl bg-ink/5 border border-line">
          <h2 className="text-lg font-semibold text-ink mb-2">12. Contact</h2>
          <p className="mb-2">Pour toute question concernant ces conditions, écrivez-nous à :</p>
          <p>
            <a href="mailto:ephemer.team@gmail.com" className="text-accent hover:text-accent font-medium">
              ephemer.team@gmail.com
            </a>
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-5 border-t border-line text-xs text-muted">
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
      <h2 className="text-xl sm:text-2xl font-semibold text-ink mb-3">{titre}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Liste({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 space-y-1.5 marker:text-accent">{children}</ul>
}
