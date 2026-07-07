// app/confidentialite/page.tsx
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'

export default function ConfidentialitePage() {
  const currentDate = new Date().toLocaleDateString('fr-FR')
  const currentYear = new Date().getFullYear()

  return (
    <AppLayout>
      {/* Conteneur centré + largeur max pour la lisibilité */}
      {/* px-5 = marges latérales confortables sur mobile */}
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
            Politique de confidentialité
          </h1>
          <p className="text-sm text-gray-500 mb-3">
            Dernière mise à jour : {currentDate}
          </p>
          <p className="text-gray-400">
            La présente politique de confidentialité explique comment Ephemer.name
            collecte, utilise, protège et conserve vos données personnelles lorsque
            vous utilisez notre application.
          </p>
        </header>

        {/* 1 */}
        <Section titre="1. Responsable du traitement">
          <p>Le responsable du traitement des données personnelles collectées sur Ephemer.name est :</p>
          <Liste>
            <li><strong className="text-gray-200">Nom du service :</strong> Ephemer.name</li>
            <li><strong className="text-gray-200">Contact :</strong> <Mail /></li>
            <li><strong className="text-gray-200">Site web :</strong> Ephemer.name</li>
          </Liste>
          <p>Si une société est créée ou si le service est exploité par une structure juridique, cette section devra être complétée avec la dénomination sociale, l'adresse du siège, le numéro SIRET et les coordonnées du représentant légal.</p>
        </Section>

        {/* 2 */}
        <Section titre="2. Données personnelles collectées">
          <p>Nous collectons uniquement les données nécessaires au fonctionnement du service.</p>
          <SousTitre>2.1 Données liées à votre compte</SousTitre>
          <Liste>
            <li>Adresse email ;</li>
            <li>Mot de passe chiffré via notre prestataire d'authentification ;</li>
            <li>Nom et prénom, si vous choisissez de les renseigner ;</li>
            <li>Date de création du compte ;</li>
            <li>Paramètres de notification.</li>
          </Liste>
          <SousTitre>2.2 Données liées aux contacts que vous ajoutez</SousTitre>
          <Liste>
            <li>Nom et prénom du contact ;</li>
            <li>Date de naissance ;</li>
            <li>Relation avec vous : famille, ami, professionnel ou autre ;</li>
            <li>Préférences de communication ;</li>
            <li>Événements associés : anniversaire, fête prénominale ou autre ;</li>
            <li>Notes ou informations facultatives que vous ajoutez volontairement.</li>
          </Liste>
          <SousTitre>2.3 Données techniques</SousTitre>
          <Liste>
            <li>Adresse IP, lorsque cela est nécessaire à la sécurité du service ;</li>
            <li>Logs techniques ;</li>
            <li>Informations de navigation strictement nécessaires ;</li>
            <li>Données relatives aux erreurs applicatives pour améliorer la stabilité.</li>
          </Liste>
        </Section>

        {/* 3 */}
        <Section titre="3. Finalités du traitement">
          <p>Les données collectées sont utilisées pour les finalités suivantes :</p>
          <Liste>
            <li>Créer et sécuriser votre compte utilisateur ;</li>
            <li>Vous permettre d'ajouter, gérer et importer vos contacts ;</li>
            <li>Calculer automatiquement les événements importants ;</li>
            <li>Générer des messages personnalisés selon le ton choisi ;</li>
            <li>Programmer et envoyer des rappels par email ;</li>
            <li>Afficher un tableau de bord avec les événements à venir ;</li>
            <li>Améliorer la sécurité, la performance et la fiabilité du service ;</li>
            <li>Vous proposer, le cas échéant, des suggestions de cadeaux ou offres partenaires.</li>
          </Liste>
        </Section>

        {/* 4 */}
        <Section titre="4. Bases légales du traitement">
          <p>Conformément au RGPD, chaque traitement de données repose sur une base légale.</p>
          <Liste>
            <li><strong className="text-gray-200">Exécution du contrat :</strong> pour créer votre compte, gérer vos contacts, afficher vos événements et fournir les fonctionnalités principales.</li>
            <li><strong className="text-gray-200">Consentement :</strong> pour l'envoi de certaines notifications, l'import de contacts, ou l'utilisation éventuelle de cookies non essentiels.</li>
            <li><strong className="text-gray-200">Intérêt légitime :</strong> pour sécuriser le service, prévenir les abus, corriger les erreurs et améliorer l'expérience utilisateur.</li>
            <li><strong className="text-gray-200">Obligation légale :</strong> si certaines données doivent être conservées pour répondre à une obligation réglementaire.</li>
          </Liste>
        </Section>

        {/* 5 */}
        <Section titre="5. Données des contacts ajoutés par l'utilisateur">
          <p>Lorsque vous ajoutez un contact dans Ephemer.name, vous êtes responsable de vous assurer que vous disposez d'une raison légitime pour enregistrer ses informations.</p>
          <p>Ces données sont utilisées uniquement pour vous fournir les fonctionnalités du service : rappels, calendrier, génération de messages et suggestions associées.</p>
          <p>Nous ne contactons pas directement vos contacts sans action explicite de votre part.</p>
        </Section>

        {/* 6 */}
        <Section titre="6. Import de contacts">
          <p>Ephemer.name pourra proposer des fonctionnalités d'import de contacts via fichiers CSV, vCard ou d'autres services compatibles.</p>
          <p>Lors d'un import, seules les données nécessaires seront conservées. Vous pourrez modifier ou supprimer les contacts importés à tout moment.</p>
          <p>Si une intégration avec un service tiers est proposée à l'avenir, une information spécifique vous sera présentée avant toute connexion.</p>
        </Section>

        {/* 7 */}
        <Section titre="7. Destinataires et sous-traitants">
          <p>Vos données ne sont jamais vendues.</p>
          <p>Elles peuvent être traitées par des prestataires techniques strictement nécessaires :</p>
          <Liste>
            <li><strong className="text-gray-200">Supabase :</strong> hébergement de la base de données et authentification ;</li>
            <li><strong className="text-gray-200">Vercel :</strong> hébergement de l'application web ;</li>
            <li><strong className="text-gray-200">Resend :</strong> gestion de l'envoi des emails ;</li>
            <li><strong className="text-gray-200">Prestataires d'analyse ou de sécurité :</strong> uniquement si nécessaires et conformes au RGPD.</li>
          </Liste>
          <p>Ces prestataires agissent comme sous-traitants et traitent les données uniquement pour fournir le service demandé.</p>
        </Section>

        {/* 8 */}
        <Section titre="8. Transferts de données hors Union européenne">
          <p>Certains prestataires peuvent traiter des données en dehors de l'Union européenne ou de l'Espace économique européen.</p>
          <p>Dans ce cas, nous veillons à ce que ces transferts soient encadrés par des garanties appropriées, comme des clauses contractuelles types approuvées par la Commission européenne.</p>
        </Section>

        {/* 9 */}
        <Section titre="9. Durées de conservation">
          <p>Les données sont conservées uniquement pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées.</p>
          <Liste>
            <li><strong className="text-gray-200">Données de compte :</strong> tant que votre compte est actif.</li>
            <li><strong className="text-gray-200">Données de contacts :</strong> tant que vous les gardez.</li>
            <li><strong className="text-gray-200">Données de notification :</strong> tant qu'elles sont nécessaires aux rappels.</li>
            <li><strong className="text-gray-200">Logs techniques :</strong> durée limitée nécessaire à la sécurité.</li>
            <li><strong className="text-gray-200">Données supprimées :</strong> conservées temporairement dans les sauvegardes avant suppression définitive.</li>
          </Liste>
          <p>Vous pouvez demander la suppression de votre compte et de vos données à tout moment.</p>
        </Section>

        {/* 10 */}
        <Section titre="10. Sécurité des données">
          <p>Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos données.</p>
          <Liste>
            <li>Authentification sécurisée ;</li>
            <li>Gestion des accès par utilisateur ;</li>
            <li>Utilisation de variables d'environnement pour protéger les clés techniques ;</li>
            <li>Accès limité aux données strictement nécessaires ;</li>
            <li>Surveillance des erreurs et incidents techniques.</li>
          </Liste>
          <p>Malgré ces mesures, aucun service en ligne ne peut garantir une sécurité absolue. Nous vous recommandons d'utiliser un mot de passe unique et robuste.</p>
        </Section>

        {/* 11 */}
        <Section titre="11. Cookies et traceurs">
          <p>Ephemer.name peut utiliser des cookies ou technologies similaires pour assurer le bon fonctionnement du site et maintenir votre session connectée.</p>
          <p>Les cookies strictement nécessaires ne nécessitent pas votre consentement préalable.</p>
          <p>Si nous utilisons à l'avenir des cookies non essentiels, un bandeau de consentement vous permettra de les accepter ou de les refuser.</p>
        </Section>

        {/* 12 */}
        <Section titre="12. Suggestions de cadeaux et liens partenaires">
          <p>Ephemer.name peut proposer des suggestions de cadeaux ou des liens vers des partenaires commerciaux en fonction des événements à venir.</p>
          <p>Ces suggestions ont pour objectif de vous aider à trouver des idées adaptées. Nous ne vendons pas vos données personnelles à des annonceurs.</p>
          <p>Si des liens affiliés sont utilisés, cela pourra permettre à Ephemer.name de recevoir une commission, sans coût supplémentaire pour vous. Les partenariats seront indiqués de manière transparente.</p>
        </Section>

        {/* 13 */}
        <Section titre="13. Génération de messages personnalisés">
          <p>Ephemer.name peut vous aider à générer des messages personnalisés pour vos contacts.</p>
          <p>Les informations utilisées sont limitées au strict nécessaire : prénom du contact, type d'événement, relation et ton choisi.</p>
          <p>Si une technologie d'intelligence artificielle externe est utilisée, vous en serez informé et les données transmises seront limitées au strict nécessaire.</p>
        </Section>

        {/* 14 */}
        <Section titre="14. Vos droits">
          <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
          <Liste>
            <li><strong className="text-gray-200">Droit d'accès :</strong> obtenir une copie des données vous concernant ;</li>
            <li><strong className="text-gray-200">Droit de rectification :</strong> corriger des données inexactes ;</li>
            <li><strong className="text-gray-200">Droit à l'effacement :</strong> demander la suppression de vos données ;</li>
            <li><strong className="text-gray-200">Droit à la limitation :</strong> suspendre temporairement un traitement ;</li>
            <li><strong className="text-gray-200">Droit d'opposition :</strong> vous opposer à certains traitements ;</li>
            <li><strong className="text-gray-200">Droit à la portabilité :</strong> récupérer vos données dans un format structuré ;</li>
            <li><strong className="text-gray-200">Droit de retirer votre consentement</strong> lorsque le traitement repose dessus.</li>
          </Liste>
          <p>Pour exercer vos droits, contactez-nous à : <Mail />.</p>
          <p>Nous pourrons vous demander une preuve d'identité si nécessaire pour vous protéger contre une demande frauduleuse.</p>
        </Section>

        {/* 15 */}
        <Section titre="15. Réclamation auprès de la CNIL">
          <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL.</p>
          <p>
            Site officiel :{' '}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#C8A84E] hover:text-[#e0c46a] font-medium">
              www.cnil.fr
            </a>
          </p>
        </Section>

        {/* 16 */}
        <Section titre="16. Mineurs">
          <p>Ephemer.name n'est pas destiné spécifiquement aux enfants. Si vous êtes mineur, utilisez le service avec l'accord d'un parent ou représentant légal.</p>
          <p>Si nous apprenons que des données ont été collectées auprès d'un mineur sans autorisation, nous prendrons les mesures nécessaires pour les supprimer.</p>
        </Section>

        {/* 17 */}
        <Section titre="17. Modification de la politique de confidentialité">
          <p>Nous pouvons modifier la présente politique afin de tenir compte des évolutions du service, de la réglementation ou de nos prestataires.</p>
          <p>En cas de changement important, nous vous informerons par un moyen approprié (application ou email).</p>
        </Section>

        {/* Encart contact */}
        <div className="mt-10 p-5 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-2">Contact</h2>
          <p className="mb-2">Pour toute question concernant cette politique ou l'utilisation de vos données, écrivez-nous à :</p>
          <p><Mail /></p>
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
// (définis ici pour éviter de répéter le style)
// ============================================

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3">{titre}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function SousTitre({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-200 mt-4 mb-1">{children}</h3>
}

function Liste({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 space-y-1.5 marker:text-[#C8A84E]">{children}</ul>
}

function Mail() {
  return (
    <a href="mailto:contact@ephemer.name" className="text-[#C8A84E] hover:text-[#e0c46a] font-medium">
      contact@ephemer.name
    </a>
  )
}
