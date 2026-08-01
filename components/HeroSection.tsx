"use client"

import Link from "next/link"
import InstallPWAButton from "@/components/InstallPWAButton"
import StarryBackground from "@/components/StarryBackground"

type HeroSectionProps = {
  onOpenInscription: () => void
  onOpenConnexion: () => void
}

export default function HeroSection({ onOpenInscription, onOpenConnexion }: HeroSectionProps) {
  return (
    <StarryBackground>
      {/* NAVIGATION */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <svg
            className="w-8 h-8 text-[#C8A84E] transition-transform duration-300 group-hover:rotate-12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" className="text-[#1B2A4A]" />
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="15" cy="9" r="1" fill="currentColor" />
          </svg>
          <span className="text-xl font-semibold tracking-tight">
            <span className="text-white">Ephemer</span>
            <span className="text-white/40 font-light">
              <span className="text-[#C8A84E]">.</span>name
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenConnexion}
            className="text-sm bg-white/10 hover:bg-[#C8A84E]/20 text-white border border-white/10 hover:border-[#C8A84E]/30 px-4 py-2 rounded-full transition-all duration-300"
          >
            Se connecter
          </button>
        </div>
      </nav>

      {/* SECTION HERO */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 z-10 max-w-4xl mx-auto text-center">

        <div className="mb-10 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2 backdrop-blur-sm">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-white/70 text-sm font-medium tracking-wide">
            Rappels intelligents • 100% Gratuit
          </span>
        </div>

        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-[#C8A84E]/10 blur-3xl rounded-full scale-150" />
          <svg
            className="w-24 h-24 md:w-32 md:h-32 relative z-10 drop-shadow-2xl"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M100 60C100 87.6142 77.6142 110 50 110C28.3662 110 10 96.2582 3 77C18 90 40 85 55 70C70 55 65 35 55 20C75 25 100 35 100 60Z" fill="#1B2A4A" stroke="#C8A84E" strokeWidth="2" />
            <path d="M15 30C5 50 10 85 30 100" stroke="#C8A84E" strokeWidth="1.5" fill="none" opacity="0.6" />
            <path d="M45 45L47 52L54 54L47 56L45 63L43 56L36 54L43 52L45 45Z" fill="#C8A84E" opacity="0.9" />
            <path d="M70 35L71 38L74 39L71 40L70 43L69 40L66 39L69 38L70 35Z" fill="#C8A84E" opacity="0.6" />
            <circle cx="65" cy="55" r="2" fill="#C8A84E" opacity="0.4" />
            <circle cx="35" cy="70" r="1.5" fill="#C8A84E" opacity="0.5" />
            <circle cx="80" cy="75" r="1" fill="#C8A84E" opacity="0.3" />
          </svg>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          <span className="inline-block">Ephemer</span>
          <span className="inline-block text-white/40 font-light ml-1">
            <span className="text-[#C8A84E]">.</span>name
          </span>
        </h1>

        <p className="text-lg md:text-xl text-white/50 max-w-lg mx-auto leading-relaxed mb-4">
          Votre assistant céleste pour ne plus jamais oublier
          <span className="text-[#C8A84E]/80 font-medium"> un moment important</span>.
        </p>
        <p className="text-sm text-white/30 mb-12">
          Anniversaires • Fêtes • Événements — Tout organisé, tout automatisé.
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onOpenInscription}
            className="group relative bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] px-8 py-4 rounded-2xl text-[#0B1120] font-bold text-lg hover:shadow-[0_0_30px_rgba(200,168,78,0.4)] transition-all duration-300 hover:scale-105"
          >
            ✨ Commencer gratuitement
          </button>

          <button
            onClick={onOpenConnexion}
            className="text-white/40 hover:text-white text-sm transition-colors duration-200"
          >
            Déjà un compte ? Se connecter →
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
          <div className="group bg-white/[0.03] border border-white/[0.08] hover:border-[#C8A84E]/20 rounded-2xl p-6 backdrop-blur-sm text-center transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#C8A84E]/10 flex items-center justify-center group-hover:bg-[#C8A84E]/20 transition-colors duration-300">
              <span className="text-2xl">🎂</span>
            </div>
            <p className="text-white font-semibold text-sm mb-1">Anniversaires</p>
            <p className="text-white/30 text-xs leading-relaxed">Rappels automatiques J-7, J-1 et jour J</p>
          </div>

          <div className="group bg-white/[0.03] border border-white/[0.08] hover:border-[#C8A84E]/20 rounded-2xl p-6 backdrop-blur-sm text-center transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#C8A84E]/10 flex items-center justify-center group-hover:bg-[#C8A84E]/20 transition-colors duration-300">
              <span className="text-2xl">✉️</span>
            </div>
            <p className="text-white font-semibold text-sm mb-1">Messages personnalisés</p>
            <p className="text-white/30 text-xs leading-relaxed">Générés par IA selon votre relation</p>
          </div>

          <div className="group bg-white/[0.03] border border-white/[0.08] hover:border-[#C8A84E]/20 rounded-2xl p-6 backdrop-blur-sm text-center transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#C8A84E]/10 flex items-center justify-center group-hover:bg-[#C8A84E]/20 transition-colors duration-300">
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-white font-semibold text-sm mb-1">Tous vos contacts</p>
            <p className="text-white/30 text-xs leading-relaxed">Famille, amis, collègues organisés</p>
          </div>
        </div>

        <div className="mt-16 pb-10 text-center space-y-5">
          <div className="flex justify-center">
            <InstallPWAButton />
          </div>

          {/* ============ FOOTER (AMÉLIORÉ) ============ */}
          <div className="space-y-4">
            <p className="text-white/15 text-xs tracking-wider uppercase">
              © 2026 Ephemer.name — Votre compagnon nocturne
            </p>

            {/* Boutons d'action du dashboard */}
            <div className="flex justify-center gap-2 flex-wrap max-w-2xl mx-auto">
              <a
                href="mailto:ephemer.team@gmail.com?subject=Ephemer - Support&body=Bonjour,%0D%0A%0D%0A[Décris ton bug ou ta suggestion ici]%0D%0A%0D%0AMerci !"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#C8A84E]/80 hover:text-[#C8A84E] bg-white/5 hover:bg-[#C8A84E]/10 rounded-lg transition border border-white/10 hover:border-[#C8A84E]/30"
              >
                💬 Support
              </a>
              <Link
                href="/guide-notifications"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#C8A84E]/80 hover:text-[#C8A84E] bg-white/5 hover:bg-[#C8A84E]/10 rounded-lg transition border border-white/10 hover:border-[#C8A84E]/30"
              >
                🔔 Tuto Notifications
              </Link>
              <Link
                href="/confidentialite"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#C8A84E]/80 hover:text-[#C8A84E] bg-white/5 hover:bg-[#C8A84E]/10 rounded-lg transition border border-white/10 hover:border-[#C8A84E]/30"
              >
                🔒 Confidentialité
              </Link>
              <Link
                href="/conditions"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#C8A84E]/80 hover:text-[#C8A84E] bg-white/5 hover:bg-[#C8A84E]/10 rounded-lg transition border border-white/10 hover:border-[#C8A84E]/30"
              >
                📄 Conditions
              </Link>
              <Link
                href="/patchnote"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#C8A84E]/80 hover:text-[#C8A84E] bg-white/5 hover:bg-[#C8A84E]/10 rounded-lg transition border border-white/10 hover:border-[#C8A84E]/30"
              >
                📜 Quoi de neuf ?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </StarryBackground>
  )
}