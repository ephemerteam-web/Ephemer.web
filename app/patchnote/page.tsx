import { createClient } from '@supabase/supabase-js';
import Link from 'next/link'; // 1. Importation nécessaire pour le lien

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PatchNote {
  id: string;
  version: string;
  title: string;
  changes: string[];
  release_date: string;
  is_major: boolean;
}

export default async function PatchNotePage() {
  const { data: patchNotes, error } = await supabase
    .from('patch_notes')
    .select('*')
    .order('release_date', { ascending: false });

  if (error) {
    console.error('Erreur Supabase:', error);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      {/* --- Bouton de retour vers la page d'accueil --- */}
      <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 transition mb-8 text-base font-medium">
        &larr; Retour à l'accueil
      </Link>
      {/* ---------------------------------------------------- */}

      <header className="mb-12 border-b border-gray-200 pb-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-1">Journal des mises à jour</h1>
        <p className="text-lg text-gray-500">Toutes les évolutions d’Ephemer, version par version.</p>
      </header>
      {/* ---------------------------------------------------- */}

      {patchNotes && patchNotes.length > 0 ? (
        <div className="space-y-10">
          {patchNotes.map((note: PatchNote) => (
            <div key={note.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <span className="font-mono text-sm px-3 py-1 bg-white/10 rounded-full whitespace-nowrap">
                  v{note.version}
                </span>
                {note.is_major && (
                  <span className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full whitespace-nowrap">
                    Version majeure
                  </span>
                )}
                <span className="text-gray-400 text-sm sm:text-base whitespace-nowrap">
                  {new Date(note.release_date).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <h2 className="text-2xl font-semibold mb-5">{note.title}</h2>

              <ul className="space-y-3 text-gray-300">
                {note.changes.map((change, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span className="flex-1">{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
          <p className='text-lg'>Aucune mise à jour pour le moment.</p>
          <p className='text-sm mt-1'>Revenez plus tard pour voir les dernières nouveautés.</p>
        </div>
      )}
    </div>
  );
}
