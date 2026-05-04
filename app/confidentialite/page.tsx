import Link from 'next/link';

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-[#0a0118] relative overflow-hidden px-4 py-12">

      {/* BOULES LUMINEUSES */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-700 opacity-20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-[350px] h-[350px] bg-indigo-600 opacity-20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[60%] w-[200px] h-[200px] bg-pink-600 opacity-10 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">

        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition text-sm mb-8">
          ← Retour à l'accueil
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm p-8 md:p-10">
          <h1 className="text-3xl font-black text-white mb-2">Politique de Confidentialité</h1>
          <p className="text-white/40 text-sm mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">1. Qui collecte vos données ?</h2>
            <p className="text-white/60 leading-relaxed">Ephemer.name, hébergé sur Vercel, est responsable du traitement des données personnelles collectées via l'application.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">2. Quelles données sont collectées ?</h2>
            <ul className="text-white/60 leading-relaxed list-disc list-inside space-y-1">
              <li><strong className="text-white/80">Compte utilisateur</strong> : adresse email, prénom/nom (facultatifs).</li>
              <li><strong className="text-white/80">Contacts importés</strong> : noms, dates de naissance, préférences de communication.</li>
              <li><strong className="text-white/80">Usage</strong> : logs techniques anonymisés pour assurer la sécurité et la maintenance.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">3. Pourquoi collectons-nous ces données ?</h2>
            <p className="text-white/60 leading-relaxed">Pour générer des rappels d'anniversaires/fêtes, personnaliser les messages envoyés, et vous proposer des suggestions de cadeaux pertinentes via des partenaires vérifiés.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">4. Partage des données</h2>
            <p className="text-white/60 leading-relaxed">Vos données ne sont <strong className="text-white/80">jamais vendues</strong>. Elles sont traitées par Supabase (base de données) et Resend (envoi d'emails), deux prestataires certifiés RGPD et hébergés en Europe/USA avec des clauses contractuelles standardisées.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">5. Vos droits (RGPD)</h2>
            <p className="text-white/60 leading-relaxed">
              Conformément au Règlement Général sur la Protection des Données, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Pour l'exercer :{' '}
              <a href="mailto:contact@ephemer.name" className="text-purple-400 hover:text-pink-400 transition">contact@ephemer.name</a>.
            </p>
          </section>

          <footer className="mt-10 pt-6 border-t border-white/10 text-white/30 text-xs">
            <p>Ephemer.name © {new Date().getFullYear()} • Tous droits réservés.</p>
          </footer>
        </div>

      </div>
    </main>
  );
}
