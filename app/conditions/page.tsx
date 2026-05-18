import Link from "next/link";

export default function ConditionsPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: '1.7', color: '#333' }}>

      <Link href="/" style={{ color: '#4F46E5', textDecoration: 'none', fontSize: '14px' }}>
        ← Retour à l'accueil
      </Link>

      <h1 style={{ marginTop: '20px' }}>Conditions Générales d’Utilisation (CGU)</h1>

      <p><strong>Dernière mise à jour :</strong> 18 mai 2026</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions Générales d’Utilisation (CGU) ont pour objet de définir les modalités
        d’utilisation du service Ephemer.name, application permettant la gestion de contacts, la
        génération de messages personnalisés et la planification de rappels d’événements.
      </p>

      <h2>2. Acceptation des conditions</h2>
      <p>
        En accédant et en utilisant le service, l’utilisateur accepte sans réserve les présentes CGU.
        En cas de désaccord, l’utilisateur doit cesser d’utiliser le service.
      </p>

      <h2>3. Accès au service</h2>
      <p>
        Le service est accessible gratuitement, hors coûts éventuels liés à l’accès internet.
        Certaines fonctionnalités peuvent évoluer ou être restreintes sans préavis.
      </p>

      <h2>4. Création de compte</h2>
      <p>
        L’utilisateur s’engage à fournir des informations exactes lors de son inscription.
        Il est responsable de la confidentialité de ses identifiants.
      </p>

      <h2>5. Fonctionnalités</h2>
      <ul>
        <li>Gestion de contacts (ajout manuel ou import)</li>
        <li>Détection d’événements (anniversaires, fêtes)</li>
        <li>Génération de messages personnalisés</li>
        <li>Notifications et rappels</li>
      </ul>

      <h2>6. Responsabilités</h2>
      <p>
        Ephemer.name met tout en œuvre pour assurer la fiabilité du service, mais ne garantit pas
        l’absence d’erreurs ou d’interruptions.
      </p>

      <p>
        L’utilisateur est seul responsable de l’utilisation qu’il fait des messages générés.
      </p>

      <h2>7. Données personnelles</h2>
      <p>
        Les données personnelles sont traitées conformément au RGPD. Pour plus d’informations,
        consultez la page de confidentialité.
      </p>

      <h2>8. Propriété intellectuelle</h2>
      <p>
        Tous les éléments du service (design, textes, fonctionnalités) sont protégés par le droit
        de la propriété intellectuelle. Toute reproduction est interdite sans autorisation.
      </p>

      <h2>9. Résiliation</h2>
      <p>
        L’utilisateur peut supprimer son compte à tout moment. L’éditeur se réserve le droit de
        suspendre un compte en cas de non-respect des CGU.
      </p>

      <h2>10. Modification des CGU</h2>
      <p>
        Les présentes conditions peuvent être modifiées à tout moment. Les utilisateurs seront
        informés en cas de modification majeure.
      </p>

      <h2>11. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français
        seront compétents.
      </p>

      <h2>12. Contact</h2>
      <p>
        Pour toute question : ephemer.team@gmail.com
      </p>

    </main>
  );
}
