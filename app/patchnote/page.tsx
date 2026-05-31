import { createClient } from '@supabase/supabase-js';

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
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-semibold mb-2">Journal des mises à jour</h1>
      <p className="text-gray-400 mb-10">Toutes les évolutions d’Ephemer, version par version.</p>

      {patchNotes && patchNotes.length > 0 ? (
        <div className="space-y-8">
          {patchNotes.map((note: PatchNote) => (
            <div key={note.id} className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm px-3 py-1 bg-white/10 rounded-full">
                  v{note.version}
                </span>
                {note.is_major && (
                  <span className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                    Version majeure
                  </span>
                )}
                <span className="text-gray-400 ml-auto">
                  {new Date(note.release_date).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <h2 className="text-2xl font-medium mb-5">{note.title}</h2>

              <ul className="space-y-2 text-gray-300">
                {note.changes.map((change, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          Aucune mise à jour pour le moment.
        </div>
      )}
    </div>
  );
}
