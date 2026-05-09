// app/confidentialite/page.tsx

import Link from 'next/link';

export default function ConfidentialitePage() {
  const currentDate = new Date().toLocaleDateString('fr-FR');
  const currentYear = new Date().getFullYear();

  const sectionStyle = {
    marginBottom: '32px',
  };

  const titleStyle = {
    fontSize: '1.4rem',
    marginBottom: '10px',
    color: '#111827',
  };

  const paragraphStyle = {
    marginBottom: '12px',
  };

  const linkStyle = {
    color: '#4F46E5',
    textDecoration: 'none',
    fontWeight: 500,
  };

  return (
    <main
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        lineHeight: '1.7',
        color: '#374151',
      }}
    >
      <Link href="/" style={{ ...linkStyle, fontSize: '14px' }}>
        ← Retour à l'accueil
      </Link>

      <header style={{ marginTop: '32px', marginBottom: '40px' }}>
        <h1
          style={{
            fontSize: '2.4rem',
            marginBottom: '10px',
            color: '#111827',
            lineHeight: '1.2',
          }}
        >
          Politique de confidentialité
        </h1>

        <p style={{ color: '#6B7280', marginBottom: '8px' }}>
          Dernière mise à jour : {currentDate}
        </p>

        <p style={{ color: '#4B5563', maxWidth: '760px' }}>
          La présente politique de confidentialité explique comment Ephemer.name collecte,
          utilise, protège et conserve vos données personnelles lorsque vous utilisez notre
          application.
        </p>
      </header>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>1. Responsable du traitement</h2>

        <p style={paragraphStyle}>
          Le responsable du traitement des données personnelles collectées sur Ephemer.name est :
        </p>

        <ul style={{ paddingLeft: '22px' }}>
          <li>
            <strong>Nom du service :</strong> Ephemer.name
          </li>
          <li>
            <strong>Contact :</strong>{' '}
            <a href="mailto:contact@ephemer.name" style={linkStyle}>
              contact@ephemer.name
            </a>
          </li>
          <li>
            <strong>Site web :</strong> Ephemer.name
          </li>
        </ul>

        <p style={paragraphStyle}>
          Si une société est créée ou si le service est exploité par une structure juridique,
          cette section devra être complétée avec la dénomination sociale, l'adresse du siège,
          le numéro SIRET et les coordonnées du représentant légal.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>2. Données personnelles collectées</h2>

        <p style={paragraphStyle}>
          Nous collectons uniquement les données nécessaires au fonctionnement du service.
        </p>

        <h3 style={{ fontSize: '1.1rem', color: '#111827' }}>2.1 Données liées à votre compte</h3>

        <ul style={{ paddingLeft: '22px' }}>
          <li>Adresse email ;</li>
          <li>Mot de passe chiffré via notre prestataire d'authentification ;</li>
          <li>Nom et prénom, si vous choisissez de les renseigner ;</li>
          <li>Date de création du compte ;</li>
          <li>Paramètres de notification.</li>
        </ul>

        <h3 style={{ fontSize: '1.1rem', color: '#111827' }}>
          2.2 Données liées aux contacts que vous ajoutez
        </h3>

        <ul style={{ paddingLeft: '22px' }}>
          <li>Nom et prénom du contact ;</li>
          <li>Date de naissance ;</li>
          <li>Relation avec vous : famille, ami, professionnel ou autre ;</li>
          <li>Préférences de communication ;</li>
          <li>Événements associés : anniversaire, fête prénominale ou autre événement personnel ;</li>
          <li>Notes ou informations facultatives que vous ajoutez volontairement.</li>
        </ul>

        <h3 style={{ fontSize: '1.1rem', color: '#111827' }}>
          2.3 Données techniques
        </h3>

        <ul style={{ paddingLeft: '22px' }}>
          <li>Adresse IP, lorsque cela est nécessaire à la sécurité du service ;</li>
          <li>Logs techniques ;</li>
          <li>Informations de navigation strictement nécessaires au fonctionnement du site ;</li>
          <li>Données relatives aux erreurs applicatives pour améliorer la stabilité du service.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>3. Finalités du traitement</h2>

        <p style={paragraphStyle}>
          Les données collectées sont utilisées pour les finalités suivantes :
        </p>

        <ul style={{ paddingLeft: '22px' }}>
          <li>Créer et sécuriser votre compte utilisateur ;</li>
          <li>Vous permettre d'ajouter, gérer et importer vos contacts ;</li>
          <li>Calculer automatiquement les événements importants : anniversaires, fêtes et dates spéciales ;</li>
          <li>Générer des messages personnalisés selon le ton choisi ;</li>
          <li>Programmer et envoyer des rappels par email ;</li>
          <li>Afficher un tableau de bord avec les événements à venir ;</li>
          <li>Améliorer la sécurité, la performance et la fiabilité du service ;</li>
          <li>Vous proposer, le cas échéant, des suggestions de cadeaux ou offres partenaires en lien avec les événements.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>4. Bases légales du traitement</h2>

        <p style={paragraphStyle}>
          Conformément au RGPD, chaque traitement de données repose sur une base légale.
        </p>

        <ul style={{ paddingLeft: '22px' }}>
          <li>
            <strong>Exécution du contrat :</strong> pour créer votre compte, gérer vos contacts,
            afficher vos événements et fournir les fonctionnalités principales du service.
          </li>
          <li>
            <strong>Consentement :</strong> pour l'envoi de certaines notifications, l'import de
            contacts, ou l'utilisation éventuelle de cookies non essentiels.
          </li>
          <li>
            <strong>Intérêt légitime :</strong> pour sécuriser le service, prévenir les abus,
            corriger les erreurs et améliorer l'expérience utilisateur.
          </li>
          <li>
            <strong>Obligation légale :</strong> si certaines données doivent être conservées pour
            répondre à une obligation réglementaire ou à une demande d'autorité compétente.
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>5. Données des contacts ajoutés par l'utilisateur</h2>

        <p style={paragraphStyle}>
          Lorsque vous ajoutez un contact dans Ephemer.name, vous êtes responsable de vous assurer
          que vous disposez d'une raison légitime pour enregistrer ses informations dans votre espace
          personnel.
        </p>

        <p style={paragraphStyle}>
          Ces données sont utilisées uniquement pour vous fournir les fonctionnalités du service :
          rappels, calendrier, génération de messages et suggestions associées aux événements.
        </p>

        <p style={paragraphStyle}>
          Nous ne contactons pas directement vos contacts sans action explicite de votre part.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>6. Import de contacts</h2>

        <p style={paragraphStyle}>
          Ephemer.name pourra proposer des fonctionnalités d'import de contacts via fichiers CSV,
          vCard ou d'autres services compatibles.
        </p>

        <p style={paragraphStyle}>
          Lors d'un import, seules les données nécessaires au fonctionnement du service seront
          conservées. Vous pourrez modifier ou supprimer les contacts importés à tout moment depuis
          votre espace personnel.
        </p>

        <p style={paragraphStyle}>
          Si une intégration avec un service tiers, comme un réseau social ou un carnet d'adresses
          externe, est proposée à l'avenir, une information spécifique vous sera présentée avant toute
          connexion ou importation.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>7. Destinataires et sous-traitants</h2>

        <p style={paragraphStyle}>
          Vos données ne sont jamais vendues.
        </p>

        <p style={paragraphStyle}>
          Elles peuvent être traitées par des prestataires techniques strictement nécessaires au
          fonctionnement du service :
        </p>

        <ul style={{ paddingLeft: '22px' }}>
          <li>
            <strong>Supabase :</strong> hébergement de la base de données et authentification ;
          </li>
          <li>
            <strong>Vercel :</strong> hébergement de l'application web ;
          </li>
          <li>
            <strong>Resend :</strong> gestion de l'envoi des emails transactionnels et notifications ;
          </li>
          <li>
            <strong>Prestataires d'analyse ou de sécurité :</strong> uniquement si nécessaires et
            configurés dans le respect du RGPD.
          </li>
        </ul>

        <p style={paragraphStyle}>
          Ces prestataires agissent comme sous-traitants, c'est-à-dire qu'ils traitent les données
          uniquement pour fournir le service demandé.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>8. Transferts de données hors Union européenne</h2>

        <p style={paragraphStyle}>
          Certains de nos prestataires peuvent traiter des données en dehors de l'Union européenne
          ou de l'Espace économique européen.
        </p>

        <p style={paragraphStyle}>
          Dans ce cas, nous veillons à ce que ces transferts soient encadrés par des garanties
          appropriées, comme des clauses contractuelles types approuvées par la Commission européenne
          ou tout autre mécanisme reconnu par la réglementation applicable.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>9. Durées de conservation</h2>

        <p style={paragraphStyle}>
          Les données personnelles sont conservées uniquement pendant la durée nécessaire aux
          finalités pour lesquelles elles ont été collectées.
        </p>

        <ul style={{ paddingLeft: '22px' }}>
          <li>
            <strong>Données de compte :</strong> conservées tant que votre compte est actif.
          </li>
          <li>
            <strong>Données de contacts :</strong> conservées tant que vous les gardez dans votre
            espace personnel.
          </li>
          <li>
            <strong>Données de notification :</strong> conservées tant qu'elles sont nécessaires à
            l'envoi des rappels programmés.
          </li>
          <li>
            <strong>Logs techniques :</strong> conservés pour une durée limitée nécessaire à la
            sécurité, au diagnostic et à la maintenance.
          </li>
          <li>
            <strong>Données supprimées :</strong> peuvent être conservées temporairement dans des
            sauvegardes techniques avant suppression définitive.
          </li>
        </ul>

        <p style={paragraphStyle}>
          Vous pouvez demander la suppression de votre compte et de vos données à tout moment.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>10. Sécurité des données</h2>

        <p style={paragraphStyle}>
          Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour
          protéger vos données contre l'accès non autorisé, la modification, la perte ou la
          divulgation.
        </p>

        <ul style={{ paddingLeft: '22px' }}>
          <li>Authentification sécurisée ;</li>
          <li>Gestion des accès par utilisateur ;</li>
          <li>Utilisation de variables d'environnement pour protéger les clés techniques ;</li>
          <li>Accès limité aux données strictement nécessaires ;</li>
          <li>Surveillance des erreurs et incidents techniques.</li>
        </ul>

        <p style={paragraphStyle}>
          Malgré ces mesures, aucun service en ligne ne peut garantir une sécurité absolue. Nous vous
          recommandons d'utiliser un mot de passe unique et robuste.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>11. Cookies et traceurs</h2>

        <p style={paragraphStyle}>
          Ephemer.name peut utiliser des cookies ou technologies similaires pour assurer le bon
          fonctionnement du site, maintenir votre session connectée et améliorer l'expérience
          utilisateur.
        </p>

        <p style={paragraphStyle}>
          Les cookies strictement nécessaires au fonctionnement du service ne nécessitent pas votre
          consentement préalable.
        </p>

        <p style={paragraphStyle}>
          Si nous utilisons à l'avenir des cookies de mesure d'audience, de publicité ou de
          personnalisation non essentiels, un bandeau de consentement vous permettra de les accepter
          ou de les refuser.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>12. Suggestions de cadeaux et liens partenaires</h2>

        <p style={paragraphStyle}>
          Ephemer.name peut proposer des suggestions de cadeaux ou des liens vers des partenaires
          commerciaux en fonction des événements à venir.
        </p>

        <p style={paragraphStyle}>
          Ces suggestions ont pour objectif de vous aider à trouver des idées adaptées aux occasions.
          Nous ne vendons pas vos données personnelles à des annonceurs.
        </p>

        <p style={paragraphStyle}>
          Si des liens affiliés sont utilisés, cela pourra permettre à Ephemer.name de recevoir une
          commission, sans coût supplémentaire pour vous. Les éventuels partenariats commerciaux
          seront indiqués de manière transparente.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>13. Génération de messages personnalisés</h2>

        <p style={paragraphStyle}>
          Ephemer.name peut vous aider à générer des messages personnalisés pour vos contacts, par
          exemple pour un anniversaire, une fête ou un événement spécial.
        </p>

        <p style={paragraphStyle}>
          Les informations utilisées pour générer ces messages sont limitées aux données nécessaires :
          prénom du contact, type d'événement, relation et ton choisi.
        </p>

        <p style={paragraphStyle}>
          Si une technologie d'intelligence artificielle externe est utilisée à l'avenir, vous en
          serez informé et les données transmises seront limitées au strict nécessaire.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>14. Vos droits</h2>

        <p style={paragraphStyle}>
          Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits
          suivants :
        </p>

        <ul style={{ paddingLeft: '22px' }}>
          <li>
            <strong>Droit d'accès :</strong> obtenir une copie des données vous concernant ;
          </li>
          <li>
            <strong>Droit de rectification :</strong> corriger des données inexactes ou incomplètes ;
          </li>
          <li>
            <strong>Droit à l'effacement :</strong> demander la suppression de vos données ;
          </li>
          <li>
            <strong>Droit à la limitation :</strong> demander la suspension temporaire d'un traitement ;
          </li>
          <li>
            <strong>Droit d'opposition :</strong> vous opposer à certains traitements ;
          </li>
          <li>
            <strong>Droit à la portabilité :</strong> récupérer vos données dans un format structuré ;
          </li>
          <li>
            <strong>Droit de retirer votre consentement :</strong> lorsque le traitement repose sur
            votre consentement.
          </li>
        </ul>

        <p style={paragraphStyle}>
          Pour exercer vos droits, vous pouvez nous contacter à l'adresse suivante :{' '}
          <a href="mailto:contact@ephemer.name" style={linkStyle}>
            contact@ephemer.name
          </a>
          .
        </p>

        <p style={paragraphStyle}>
          Nous pourrons vous demander une preuve d'identité si cela est nécessaire pour protéger vos
          données contre une demande frauduleuse.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>15. Réclamation auprès de la CNIL</h2>

        <p style={paragraphStyle}>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
          réclamation auprès de la CNIL, l'autorité française chargée de la protection des données
          personnelles.
        </p>

        <p style={paragraphStyle}>
          Site officiel :{' '}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            www.cnil.fr
          </a>
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>16. Mineurs</h2>

        <p style={paragraphStyle}>
          Ephemer.name n'est pas destiné spécifiquement aux enfants. Si vous êtes mineur, nous vous
          recommandons d'utiliser le service avec l'accord d'un parent ou représentant légal.
        </p>

        <p style={paragraphStyle}>
          Si nous apprenons que des données ont été collectées auprès d'un mineur sans autorisation
          appropriée, nous prendrons les mesures nécessaires pour les supprimer.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>17. Modification de la politique de confidentialité</h2>

        <p style={paragraphStyle}>
          Nous pouvons modifier la présente politique de confidentialité afin de tenir compte des
          évolutions du service, de la réglementation ou de nos prestataires techniques.
        </p>

        <p style={paragraphStyle}>
          En cas de changement important, nous vous informerons par un moyen approprié, par exemple
          via l'application ou par email.
        </p>
      </section>

      <section
        style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
        }}
      >
        <h2 style={{ ...titleStyle, marginTop: 0 }}>Contact</h2>

        <p style={paragraphStyle}>
          Pour toute question concernant cette politique de confidentialité ou l'utilisation de vos
          données personnelles, vous pouvez nous écrire à :
        </p>

        <p style={{ marginBottom: 0 }}>
          <a href="mailto:contact@ephemer.name" style={linkStyle}>
            contact@ephemer.name
          </a>
        </p>
      </section>

      <footer
        style={{
          marginTop: '48px',
          paddingTop: '20px',
          borderTop: '1px solid #E5E7EB',
          fontSize: '13px',
          color: '#6B7280',
        }}
      >
        <p>Ephemer.name © {currentYear} • Tous droits réservés.</p>
      </footer>
    </main>
  );
}
