// app/confidentialite/page.tsx
import Link from 'next/link';

export default function ConfidentialitePage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: '1.7', color: '#333' }}>
      <Link href="/" style={{ color: '#4F46E5', textDecoration: 'none', fontSize: '14px' }}>← Retour à l'accueil</Link>
      
      <h1 style={{ fontSize: '2.2rem', marginBottom: '10px' }}>Politique de Confidentialité</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>1. Qui collecte vos données ?</h2>
        <p>Ephemer.name, hébergé sur Vercel, est responsable du traitement des données personnelles collectées via l'application.</p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>2. Quelles données sont collectées ?</h2>
        <ul style={{ paddingLeft: '20px' }}>
          <li><strong>Compte utilisateur</strong> : adresse email, prénom/nom (facultatifs).</li>
          <li><strong>Contacts importés</strong> : noms, dates de naissance, préférences de communication.</li>
          <li><strong>Usage</strong> : logs techniques anonymisés pour assurer la sécurité et la maintenance.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>3. Pourquoi collectons-nous ces données ?</h2>
        <p>Pour générer des rappels d'anniversaires/fêtes, personnaliser les messages envoyés, et vous proposer des suggestions de cadeaux pertinentes via des partenaires vérifiés.</p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>4. Partage des données</h2>
        <p>Vos données ne sont <strong>jamais vendues</strong>. Elles sont traitées par Supabase (base de données) et Resend (envoi d'emails), deux prestataires certifiés RGPD et hébergés en Europe/USA avec des clauses contractuelles standardisées.</p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>5. Vos droits (RGPD)</h2>
        <p>Conformément au Règlement Général sur la Protection des Données, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Pour l'exercer : <a href="mailto:contact@ephemer.name" style={{ color: '#4F46E5' }}>contact@ephemer.name</a>.</p>
      </section>

      <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', fontSize: '13px', color: '#888' }}>
        <p>Ephemer.name © {new Date().getFullYear()} • Tous droits réservés.</p>
      </footer>
    </main>
  );
}
