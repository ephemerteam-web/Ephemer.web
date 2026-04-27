import Link from "next/link"

export default function Accueil() {
  return (
    <main className="min-h-screen bg-[#0a0118] flex flex-col items-center justify-center relative overflow-hidden px-4">

      {/* BOULES LUMINEUSES EN ARRIÈRE-PLAN */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-700 opacity-20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-[350px] h-[350px] bg-indigo-600 opacity-20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[60%] w-[200px] h-[200px] bg-pink-600 opacity-10 rounded-full blur-[80px] pointer-events-none" />

      {/* BADGE EN HAUT */}
      <div className="mb-8 flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 backdrop-blur-sm">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-white/80 text-sm font-medium">Rappels intelligents • Gratuit</span>
      </div>

      {/* LOGO + TITRE */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">🌙</div>
        <h1 className="text-6xl md:text-7xl font-black text-white tracking-tight leading-none">
          Ephe<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">mer</span>
        </h1>
        <p className="mt-4 text-lg md:text-xl text-white/60 max-w-md mx-auto leading-relaxed">
          Ne manquez plus jamais un moment important.<br />
          <span className="text-white/40 text-base">Anniversaires, fêtes, événements — tout en un.</span>
        </p>
      </div>

      {/* BOUTONS */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link href="/inscription">
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-8 py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-purple-900/40 hover:scale-105">
            ✨ Commencer gratuitement
          </button>
        </Link>
        <Link href="/connexion">
          <button className="bg-white/10 border border-white/20 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-white/20 transition-all backdrop-blur-sm hover:scale-105">
            Se connecter →
          </button>
        </Link>
      </div>

      {/* 3 ARGUMENTS VISUELS */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm text-center">
          <div className="text-3xl mb-2">🎂</div>
          <p className="text-white font-semibold text-sm">Anniversaires</p>
          <p className="text-white/40 text-xs mt-1">Rappels automatiques J-7, J-1 et jour J</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm text-center">
          <div className="text-3xl mb-2">✉️</div>
          <p className="text-white font-semibold text-sm">Messages personnalisés</p>
          <p className="text-white/40 text-xs mt-1">Générés par IA selon votre relation</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm text-center">
          <div className="text-3xl mb-2">👥</div>
          <p className="text-white font-semibold text-sm">Tous vos contacts</p>
          <p className="text-white/40 text-xs mt-1">Famille, amis, collègues organisés</p>
        </div>

      </div>

      {/* FOOTER DISCRET */}
      <p className="mt-12 text-white/20 text-xs">
        © 2025 Ephemer — Fait avec 💜
      </p>

    </main>
  )
}
