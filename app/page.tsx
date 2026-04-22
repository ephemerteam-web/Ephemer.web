import Link from "next/link"

export default function Accueil() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-950 to-indigo-800 flex flex-col items-center justify-center gap-6">
      
      <h1 className="text-5xl font-bold text-white">
        🌙 Ephemer
      </h1>
      
      <p className="text-indigo-200 text-xl">
        Ne manquez plus jamais un moment important
      </p>

      <div className="flex flex-col gap-3 mt-4">
        
        {/* Link = comme une balise <a> mais optimisée pour Next.js */}
        <Link href="/inscription">
          <button className="bg-white text-indigo-900 font-bold px-8 py-3 rounded-xl hover:bg-indigo-100">
            Commencer gratuitement
          </button>
        </Link>

        <Link href="/connexion">
          <button className="border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-white hover:text-indigo-900">
            Se connecter
          </button>
        </Link>

      </div>

    </main>
  )
}
