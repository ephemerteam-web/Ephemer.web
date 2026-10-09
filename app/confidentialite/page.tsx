// app/confidentialite/page.tsx
import { AI_NOTICE } from '@/lib/ai-privacy'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'

export default function ConfidentialitePage() {
  const currentDate = '9 octobre 2026'
  const currentYear = new Date().getFullYear()

  return (
    <AppLayout>
      {/* Conteneur centré + largeur max pour la lisibilité */}
      {/* px-5 = marges latérales confortables sur mobile */}
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
            Politique de confidentialité
          </h1>
          <p className="text-sm text-muted mb-3">
            Dernière mise à jour : {currentDate}
          </p>
          <p className="text-muted">
            La présente politique de confidentialité explique comment Ephemer.name
            collecte, utilise, protège et conserve vos données personnelles lorsque
            vous utilisez notre application.
          </p>
        </header>

        {/* 1 */}
        <Section titre="1. Responsable du traitement">
          <p>Le responsable du traitement des données personnelles collectées sur Ephemer.name est :</p>
          <Liste>
            <li><strong className="text-muted">Nom du service :</strong> Ephemer.name</li>
            <li><strong className="text-muted">Contact :</strong> <Mail /></li>
            <li><strong className="text-muted">Site web :</strong> Ephemer.name</li>
          </Liste>
          <p>Adresse de contact du siège : 23 route du Mont Agel, 06320 La Turbie. Les autres mentions de l’exploitant restent à compléter après validation.</p>
        </Section>

        {/* 2 */}
        <Section titre="2. Données personnelles collectées">
          <p>Nous collectons uniquement les données nécessaires au fonctionnement du service.</p>
          <SousTitre>2.1 Données liées à votre compte</SousTitre>
          <Liste>
            <li>Adresse email ;</li>
            <li>Mot de passe chiffré via notre prestataire d&apos;authentification ;</li>
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
            <li>Styles personnels de message, signatures locales et affectations choisies ;</li>
            <li>Catégories de centres d’intérêt choisies explicitement pour un contact, utilisées seulement dans les filtres locaux.</li>
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
            <li>Vous permettre d&apos;ajouter, gérer et importer vos contacts ;</li>
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
            <li><strong className="text-muted">Exécution du contrat :</strong> pour créer votre compte, gérer vos contacts, afficher vos événements et fournir les fonctionnalités principales.</li>
            <li><strong className="text-muted">Consentement :</strong> pour l&apos;envoi de certaines notifications, l&apos;import de contacts, ou l&apos;utilisation éventuelle de cookies non essentiels.</li>
            <li><strong className="text-muted">Intérêt légitime :</strong> pour sécuriser le service, prévenir les abus, corriger les erreurs et améliorer l&apos;expérience utilisateur.</li>
            <li><strong className="text-muted">Obligation légale :</strong> si certaines données doivent être conservées pour répondre à une obligation réglementaire.</li>
          </Liste>
        </Section>

        {/* 5 */}
        <Section titre="5. Données des contacts ajoutés par l'utilisateur">
          <p>Lorsque vous ajoutez un contact dans Ephemer.name, vous êtes responsable de vous assurer que vous disposez d&apos;une raison légitime pour enregistrer ses informations.</p>
          <p>Ces données sont utilisées uniquement pour vous fournir les fonctionnalités du service : rappels, calendrier, génération de messages et suggestions associées.</p>
          <p>Nous ne contactons pas directement vos contacts sans action explicite de votre part.</p>
          <SousTitre>Mes étoiles : relations privées</SousTitre>
          <p>Vos carnets peuvent reconnaître une relation lorsque chacun contient l’adresse de connexion vérifiée de l’autre. Votre prénom ou pseudonyme choisi dans Mon univers est montré à vos étoiles et aux destinataires vérifiés de vos demandes ; avant ce choix, le prénom minimal est utilisé. Vous pouvez aussi proposer une relation par adresse, depuis une fiche de contact ou avec un lien. Les demandes expirent après 30 jours et nécessitent une acceptation ; leur confirmation ne révèle pas si l’adresse possède un compte. Une étoile n’ajoute aucune fiche automatiquement : l’association et l’enregistrement dans votre carnet restent volontaires.</p>
          <p>Retirer une relation empêche sa reconnaissance automatique ultérieure. Bloquer retire la relation et empêche les demandes de la rétablir ; débloquer nécessite une nouvelle demande acceptée. Les coordonnées, notes, anniversaires exacts, préparations et idées de votre carnet restent privés. Ces fonctions sociales ne transmettent aucune donnée à une IA.</p>
          <p>Les liens sociaux expirent après 7 jours, peuvent être révoqués et ne révèlent pas votre identité dans leur page d’entrée. Leur secret est remis une seule fois, conservé uniquement en mémoire et retiré de l’adresse après ouverture ; après connexion, il faut rouvrir le lien reçu. Une ouverture seule n’envoie aucune demande. Le secret est exclu de l’export, du suivi analytique et du cache hors ligne.</p>
          <p>Les notifications sociales figurent avec vos rappels, avec leur propre source. Vous pouvez les marquer comme lues ; « Supprimer les rappels » ne les supprime pas. L’export personnel version 9 comprend vos relations, demandes, blocages, métadonnées de liens, associations et notifications sociales, sans secret ni identité résolue des destinataires de demandes envoyées. La suppression du compte retire les lignes sociales rattachées au compte ; supprimer un contact retire ses associations, sans supprimer à lui seul la relation.</p>
          <SousTitre>Mon univers : partage volontaire avec vos étoiles</SousTitre>
          <p>Vous saisissez volontairement votre identité sociale, présentation, passions, envies, préférences à éviter, anniversaire, email et téléphone. Aucune note, coordonnée, date du carnet ou ancien texte d’invitation n’est repris automatiquement. Chaque information facultative commence privée et dispose de son réglage ; le jour/mois de naissance et l’année se partagent séparément. Les informations activées deviennent visibles par toutes vos étoiles actuelles et futures après enregistrement commun des valeurs et permissions. L’aperçu n’est pas une publication.</p>
          <p>Le partage de l’avatar est volontaire et affiche le dernier avatar valide enregistré : ses modifications validées sont actualisées, ses essais restent privés. Sans avatar valide, une initiale apparaît. « Masquer toutes mes informations facultatives » retire leur partage sans effacer vos valeurs personnelles enregistrées. Retrait ou blocage d’une relation empêche les nouvelles consultations ; aucune action ne peut retirer une information déjà vue ou copiée par un destinataire.</p>
          <p>L’univers partagé est présenté séparément du carnet privé, sans modifier ses contacts, événements ou rappels. Son contenu est retiré de l’affichage hors ligne et lorsque la page est masquée ; il n’est pas conservé dans le stockage persistant ou le cache du navigateur. Ces informations ne sont pas utilisées par les générateurs IA dans cette version. L’export version 9 contient votre univers et vos permissions uniquement, jamais les univers de vos étoiles. La suppression du compte retire son univers et son journal d’opérations ; la durée de conservation et la purge de ce journal restent à définir avant l’ouverture publique.</p>
          <SousTitre>Cartes personnelles et partage par lien privé</SousTitre>
          <p>Depuis une préparation, vous pouvez choisir un modèle gratuit, saisir votre message et votre signature, puis enregistrer un brouillon privé. La reprise du message préparé est volontaire ; aucune fiche contact, note ou information de profil n’est ajoutée automatiquement. Les cartes ne transmettent pas votre texte à une intelligence artificielle.</p>
          <p>Publier fige une version de la carte, consultable sans compte par son lien secret. Toute personne possédant ce lien peut ouvrir la carte, y compris après transfert. Le lien expire après la durée choisie (7, 30, 90 ou 365 jours ; 30 par défaut). Vous pouvez le désactiver ou le remplacer. Une republication invalide le lien précédent. La révocation bloque les consultations suivantes ; elle ne retire pas une copie déjà faite.</p>
          <p>Le destinataire reçoit uniquement la version publiée : ni brouillon, ni coordonnées, ni notes privées. Le lien est conservé chiffré côté serveur pour permettre sa récupération par le créateur après reconnexion. Le contenu consulté ne reste pas dans le stockage persistant du navigateur ou le cache hors ligne. La page de carte exclut l’indexation et le suivi analytique, et ses métadonnées sociales restent génériques. Le partage par copie ou menu natif est toujours manuel.</p>
          <p>Supprimer une carte retire ses versions et ses liens. Supprimer sa préparation ou le compte les retire également. L’export personnel inclut les brouillons, versions et statuts des liens, sans leurs secrets ni empreintes. Aucune photo n’est conservée par cette collection.</p>
          <p>Ton avatar illustré est enregistré dans ton compte privé après validation, à partir d’éléments gratuits prédéfinis. Les bases Homme et Femme concernent uniquement son apparence et ne renseignent aucun champ d’identité. Son ajout à une carte est volontaire : la carte conserve une copie, qui ne change pas quand tu modifies ton profil. Le destinataire reçoit seulement le contenu publié et l’avatar choisi, sans accès à ton profil. L’export personnel version 9 inclut les configurations complètes de ton avatar et les copies des cartes ; supprimer le compte les retire. Aucun selfie, service de reconnaissance ou générateur d’image n’est utilisé.</p>
        </Section>

        {/* 6 */}
        <Section titre="6. Import de contacts">
          <p>Ephemer.name pourra proposer des fonctionnalités d&apos;import de contacts via fichiers CSV, vCard ou d&apos;autres services compatibles.</p>
          <p>Lors d&apos;un import, seules les données nécessaires seront conservées. Vous pourrez modifier ou supprimer les contacts importés à tout moment.</p>
          <p>Si une intégration avec un service tiers est proposée à l&apos;avenir, une information spécifique vous sera présentée avant toute connexion.</p>
        </Section>

        {/* 7 */}
        <Section titre="7. Destinataires et sous-traitants">
          <p>Vos données ne sont jamais vendues.</p>
          <p>Elles peuvent être traitées par des prestataires techniques strictement nécessaires :</p>
          <Liste>
            <li><strong className="text-muted">Supabase :</strong> hébergement de la base de données et authentification ;</li>
            <li><strong className="text-muted">Vercel :</strong> hébergement de l&apos;application web ;</li>
            <li><strong className="text-muted">Mammouth AI :</strong> génération à la demande à partir des catégories décrites ci-dessus ;</li>
            <li><strong className="text-muted">Resend :</strong> gestion de l&apos;envoi des emails ;</li>
            <li><strong className="text-muted">Prestataires d&apos;analyse ou de sécurité :</strong> uniquement si nécessaires et conformes au RGPD.</li>
          </Liste>
          <p>Ces prestataires agissent comme sous-traitants et traitent les données uniquement pour fournir le service demandé.</p>
        </Section>

        {/* 8 */}
        <Section titre="8. Transferts de données hors Union européenne">
          <p>Certains prestataires peuvent traiter des données en dehors de l&apos;Union européenne ou de l&apos;Espace économique européen.</p>
          <p>Dans ce cas, nous veillons à ce que ces transferts soient encadrés par des garanties appropriées, comme des clauses contractuelles types approuvées par la Commission européenne.</p>
        </Section>

        {/* 9 */}
        <Section titre="9. Durées de conservation">
          <p>Les données sont conservées uniquement pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées.</p>
          <Liste>
            <li><strong className="text-muted">Données de compte :</strong> tant que votre compte est actif.</li>
            <li><strong className="text-muted">Données de contacts :</strong> tant que vous les gardez.</li>
            <li><strong className="text-muted">Données de notification :</strong> tant qu&apos;elles sont nécessaires aux rappels.</li>
            <li><strong className="text-muted">Logs techniques :</strong> durée limitée nécessaire à la sécurité.</li>
            <li><strong className="text-muted">Données supprimées :</strong> conservées temporairement dans les sauvegardes avant suppression définitive.</li>
          </Liste>
          <p>Vous pouvez demander la suppression de votre compte et de vos données à tout moment.</p>
          <p>Les brouillons de contacts restent uniquement en mémoire pendant la session de navigation et disparaissent lorsque l’espace connecté est fermé ou le compte change.</p>
          <p>Les brouillons d’invitation sont conservés dans ce navigateur. Ils expirent après sept jours sans modification ; leur suppression intervient lors d’une utilisation ultérieure du formulaire.</p>
          <p>L’expiration d’une demande ou d’un lien social désactive son utilisation, sans effacer son historique. Les relations retirées, blocages et journaux d’opérations empêchent les réapparitions involontaires et les doubles actions. Le calendrier de conservation et de purge de ces historiques ainsi que la limitation de débit globale doivent être définis avant l’ouverture publique de ces fonctions.</p>
        </Section>

        {/* 10 */}
        <Section titre="10. Sécurité des données">
          <p>Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos données.</p>
          <Liste>
            <li>Authentification sécurisée ;</li>
            <li>Gestion des accès par utilisateur ;</li>
            <li>Utilisation de variables d&apos;environnement pour protéger les clés techniques ;</li>
            <li>Accès limité aux données strictement nécessaires ;</li>
            <li>Surveillance des erreurs et incidents techniques.</li>
          </Liste>
          <p>Malgré ces mesures, aucun service en ligne ne peut garantir une sécurité absolue. Nous vous recommandons d&apos;utiliser un mot de passe unique et robuste.</p>
        </Section>

        {/* 11 */}
        <Section titre="11. Cookies et traceurs">
          <p>Ephemer.name peut utiliser des cookies ou technologies similaires pour assurer le bon fonctionnement du site et maintenir votre session connectée.</p>
          <p>Les cookies strictement nécessaires ne nécessitent pas votre consentement préalable.</p>
          <p>Si nous utilisons à l&apos;avenir des cookies non essentiels, un bandeau de consentement vous permettra de les accepter ou de les refuser.</p>
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
          <p>{AI_NOTICE}</p>
          <p>Le prestataire est appelé uniquement lorsque vous lancez une génération. Les cases facultatives, décochées par défaut, autorisent pour cette demande le prénom, l’âge calculé et/ou la note du contact. Vous pouvez les décocher avant la demande suivante. Les notes d’idées cadeaux, réactions et brouillons restent privés.</p>
          <p>Les préparations, tâches, idées, cadeaux offerts et montants déclarés sont conservés dans votre espace privé, inclus dans l’export de données et effacés lors de la suppression du compte. Supprimer un contact détache ses références dans les historiques ; supprimer une idée conserve les choix historiques.</p>
        </Section>

        {/* 14 */}
        <Section titre="14. Vos droits">
          <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
          <Liste>
            <li><strong className="text-muted">Droit d&apos;accès :</strong> obtenir une copie des données vous concernant ;</li>
            <li><strong className="text-muted">Droit de rectification :</strong> corriger des données inexactes ;</li>
            <li><strong className="text-muted">Droit à l&apos;effacement :</strong> demander la suppression de vos données ;</li>
            <li><strong className="text-muted">Droit à la limitation :</strong> suspendre temporairement un traitement ;</li>
            <li><strong className="text-muted">Droit d&apos;opposition :</strong> vous opposer à certains traitements ;</li>
            <li><strong className="text-muted">Droit à la portabilité :</strong> récupérer vos données dans un format structuré ;</li>
            <li><strong className="text-muted">Droit de retirer votre consentement</strong> lorsque le traitement repose dessus.</li>
          </Liste>
          <p>Pour exercer vos droits, contactez-nous à : <Mail />.</p>
          <p>Nous pourrons vous demander une preuve d&apos;identité si nécessaire pour vous protéger contre une demande frauduleuse.</p>
        </Section>

        {/* 15 */}
        <Section titre="15. Réclamation auprès de la CNIL">
          <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL.</p>
          <p>
            Site officiel :{' '}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent font-medium">
              www.cnil.fr
            </a>
          </p>
        </Section>

        {/* 16 */}
        <Section titre="16. Mineurs">
          <p>Ephemer.name n&apos;est pas destiné spécifiquement aux enfants. Si vous êtes mineur, utilisez le service avec l&apos;accord d&apos;un parent ou représentant légal.</p>
          <p>Si nous apprenons que des données ont été collectées auprès d&apos;un mineur sans autorisation, nous prendrons les mesures nécessaires pour les supprimer.</p>
        </Section>

        {/* 17 */}
        <Section titre="17. Modification de la politique de confidentialité">
          <p>Nous pouvons modifier la présente politique afin de tenir compte des évolutions du service, de la réglementation ou de nos prestataires.</p>
          <p>En cas de changement important, nous vous informerons par un moyen approprié (application ou email).</p>
        </Section>

        {/* Encart contact */}
        <div className="mt-10 p-5 rounded-xl bg-ink/5 border border-line">
          <h2 className="text-lg font-semibold text-ink mb-2">Contact</h2>
          <p className="mb-2">Pour toute question concernant cette politique ou l&apos;utilisation de vos données, écrivez-nous à :</p>
          <p><Mail /></p>
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
// (définis ici pour éviter de répéter le style)
// ============================================

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl sm:text-2xl font-semibold text-ink mb-3">{titre}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function SousTitre({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-muted mt-4 mb-1">{children}</h3>
}

function Liste({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 space-y-1.5 marker:text-accent">{children}</ul>
}

function Mail() {
  return (
    <a href="mailto:contact@ephemer.name" className="text-accent hover:text-accent font-medium">
      contact@ephemer.name
    </a>
  )
}
