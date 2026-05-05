import Link from "next/link"

// ============================================================
// PAGE D'ACCUEIL EphemER.NAME
// Thème : Nuit élégante avec accents dorés
// ============================================================

export default function Accueil() {
  return (
    // ==========================================
    // CONTENEUR PRINCIPAL
    // min-h-screen = hauteur minimum = 100% de l'écran
    // bg-[#0B1120] = fond bleu très sombre (presque noir bleuté)
    // overflow-hidden = cache tout ce qui dépasse (les étoiles décoratives)
    // ==========================================
    <main className="min-h-screen bg-[#0B1120] flex flex-col items-center relative overflow-hidden">
      
      {/* ==========================================
          ÉTOILES EN ARRIÈRE-PLAN
          Des petits points dorés positionnés en absolu
          pour créer un ciel étoilé subtil
          pointer-events-none = la souris les ignore (on peut cliquer à travers)
          ========================================== */}
      
      {/* Groupe d'étoiles en haut à gauche */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Étoile 1 - Grande et brillante */}
        <div className="absolute top-[15%] left-[20%] w-1 h-1 bg-[#C8A84E] rounded-full shadow-[0_0_6px_2px_rgba(200,168,78,0.4)]" />
        {/* Étoile 2 - Petite */}
        <div className="absolute top-[25%] left-[35%] w-0.5 h-0.5 bg-[#C8A84E]/60 rounded-full" />
        {/* Étoile 3 - Moyenne */}
        <div className="absolute top-[10%] right-[25%] w-1 h-1 bg-[#C8A84E]/80 rounded-full shadow-[0_0_4px_1px_rgba(200,168,78,0.3)]" />
        {/* Étoile 4 - Très petite */}
        <div className="absolute top-[30%] right-[15%] w-0.5 h-0.5 bg-[#C8A84E]/40 rounded-full" />
        {/* Étoile 5 */}
        <div className="absolute top-[8%] left-[55%] w-0.5 h-0.5 bg-[#C8A84E]/50 rounded-full" />
        {/* Étoile 6 */}
        <div className="absolute top-[20%] right-[40%] w-1 h-1 bg-[#C8A84E]/30 rounded-full" />
        {/* Étoile 7 */}
        <div className="absolute top-[35%] left-[10%] w-0.5 h-0.5 bg-[#C8A84E]/40 rounded-full" />
        {/* Étoile 8 */}
        <div className="absolute top-[12%] left-[75%] w-1 h-1 bg-[#C8A84E]/60 rounded-full shadow-[0_0_4px_1px_rgba(200,168,78,0.2)]" />
      </div>

      {/* ==========================================
          LUNE DÉCORATIVE GÉANTE (arrière-plan)
          Un grand cercle semi-transparent bleu marine
          avec un effet de lueur dorée subtile
          ========================================== */}
      <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] pointer-events-none">
        {/* La lune elle-même (cercle bleu foncé) */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#1B2A4A] via-[#152038] to-[#0B1120] opacity-60" />
        {/* Lueur dorée derrière la lune */}
        <div className="absolute inset-[-20px] rounded-full bg-[#C8A84E]/5 blur-3xl" />
        {/* Bordure dorée très subtile (comme l'arc du logo) */}
        <div className="absolute inset-0 rounded-full border border-[#C8A84E]/10" />
      </div>

      {/* ==========================================
          NAVIGATION (menu du haut)
          Position fixe en haut, transparent
          backdrop-blur = effet "verre dépoli" derrière
          ========================================== */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        
        {/* LOGO - Lune + Texte */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* Icône Lune (SVG inline pour un rendu net) */}
          <svg 
            className="w-8 h-8 text-[#C8A84E] transition-transform duration-300 group-hover:rotate-12" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Croissant de lune */}
            <path 
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" 
              fill="currentColor" 
              className="text-[#1B2A4A]" 
            />
            {/* Contour doré */}
            <path 
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" 
              stroke="currentColor" 
              strokeWidth="1" 
              fill="none" 
            />
            {/* Petite étoile à l'intérieur */}
            <circle cx="15" cy="9" r="1" fill="currentColor" />
          </svg>
          
          {/* Texte du logo */}
          <span className="text-xl font-semibold tracking-tight">
            {/* "Ephemer" en blanc */}
            <span className="text-white">Ephemer</span>
            {/* ".name" en gris avec point doré */}
            <span className="text-white/40 font-light">
              <span className="text-[#C8A84E]">.</span>name
            </span>
          </span>
        </Link>

        {/* Liens de navigation (Connexion) */}
        <div className="flex items-center gap-4">
          <Link 
            href="/connexion" 
            className="text-sm text-white/60 hover:text-[#C8A84E] transition-colors duration-200"
          >
            Se connecter
          </Link>
          <Link 
            href="/inscription" 
            className="text-sm bg-white/10 hover:bg-[#C8A84E]/20 text-white border border-white/10 hover:border-[#C8A84E]/30 px-4 py-2 rounded-full transition-all duration-300"
          >
            S'inscrire
          </Link>
        </div>
      </nav>

      {/* ==========================================
          SECTION HERO (centre de la page)
          C'est la partie principale qu'on voit en premier
          ========================================== */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 z-10 max-w-4xl mx-auto text-center">
        
        {/* Badge "Rappels intelligents" en haut du hero */}
        <div className="mb-10 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2 backdrop-blur-sm">
          {/* Point vert qui pulse (clignote doucement) */}
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-white/70 text-sm font-medium tracking-wide">
            Rappels intelligents • 100% Gratuit
          </span>
        </div>

        {/* GRAND LOGO LUNE CENTRAL */}
        {/* On agrandit le logo pour en faire un élément visuel fort */}
        <div className="mb-8 relative">
          {/* Lueur dorée derrière le logo */}
          <div className="absolute inset-0 bg-[#C8A84E]/10 blur-3xl rounded-full scale-150" />
          
          <svg 
            className="w-24 h-24 md:w-32 md:h-32 relative z-10 drop-shadow-2xl" 
            viewBox="0 0 120 120" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Grand croissant de lune bleu nuit */}
            <path 
              d="M100 60C100 87.6142 77.6142 110 50 110C28.3662 110 10 96.2582 3 77C18 90 40 85 55 70C70 55 65 35 55 20C75 25 100 35 100 60Z" 
              fill="#1B2A4A" 
              stroke="#C8A84E" 
              strokeWidth="2"
            />
            {/* Arc doré autour (comme le logo) */}
            <path 
              d="M15 30C5 50 10 85 30 100" 
              stroke="#C8A84E" 
              strokeWidth="1.5" 
              fill="none" 
              opacity="0.6"
            />
            {/* Grande étoile dorée à 4 branches */}
            <path 
              d="M45 45L47 52L54 54L47 56L45 63L43 56L36 54L43 52L45 45Z" 
              fill="#C8A84E" 
              opacity="0.9"
            />
            {/* Petite étoile */}
            <path 
              d="M70 35L71 38L74 39L71 40L70 43L69 40L66 39L69 38L70 35Z" 
              fill="#C8A84E" 
              opacity="0.6"
            />
            {/* Points dorés */}
            <circle cx="65" cy="55" r="2" fill="#C8A84E" opacity="0.4" />
            <circle cx="35" cy="70" r="1.5" fill="#C8A84E" opacity="0.5" />
            <circle cx="80" cy="75" r="1" fill="#C8A84E" opacity="0.3" />
          </svg>
        </div>

        {/* TITRE PRINCIPAL */}
        {/* tracking-tight = lettres un peu rapprochées (plus élégant) */}
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          {/* "Ephemer" en blanc pur */}
          <span className="inline-block">
            Ephemer
          </span>
          {/* ".name" avec point doré */}
          <span className="inline-block text-white/40 font-light ml-1">
            <span className="text-[#C8A84E]">.</span>name
          </span>
        </h1>

        {/* SOUS-TITRE / ACCROCHE */}
        <p className="text-lg md:text-xl text-white/50 max-w-lg mx-auto leading-relaxed mb-4">
          Votre assistant céleste pour ne plus jamais oublier
          <span className="text-[#C8A84E]/80 font-medium"> un moment important</span>.
        </p>
        <p className="text-sm text-white/30 mb-12">
          Anniversaires • Fêtes • Événements — Tout organisé, tout automatisé.
        </p>

        {/* ==========================================
            BOUTONS D'ACTION
            ========================================== */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          
          {/* BOUTON PRINCIPAL "Commencer" */}
          {/* Effet de brillance au survol avec un dégradé doré */}
          <Link href="/inscription">
            <button className="group relative bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold px-10 py-4 rounded-full hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition-all duration-500 hover:scale-105 overflow-hidden">
              {/* Effet de brillance qui traverse le bouton au survol */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative z-10 flex items-center gap-2">
                ✨ Commencer gratuitement
              </span>
            </button>
          </Link>

          {/* BOUTON SECONDAIRE "Se connecter" */}
          {/* Style minimal avec bordure fine */}
          <Link href="/connexion">
            <button className="group text-white/60 hover:text-white px-8 py-4 rounded-full border border-white/10 hover:border-[#C8A84E]/30 hover:bg-white/5 transition-all duration-300 flex items-center gap-2">
              Se connecter
              {/* Flèche qui se déplace au survol */}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
          </Link>
        </div>

        {/* ==========================================
            3 ARGUMENTS VISUELS (cartes)
            Grid responsive : 1 colonne sur mobile, 3 sur desktop
            ========================================== */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">

          {/* CARTE 1 : Anniversaires */}
          <div className="group bg-white/[0.03] border border-white/[0.08] hover:border-[#C8A84E]/20 rounded-2xl p-6 backdrop-blur-sm text-center transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1">
            {/* Icône stylisée (remplace l'emoji) */}
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#C8A84E]/10 flex items-center justify-center group-hover:bg-[#C8A84E]/20 transition-colors duration-300">
              <span className="text-2xl">🎂</span>
            </div>
            <p className="text-white font-semibold text-sm mb-1">Anniversaires</p>
            <p className="text-white/30 text-xs leading-relaxed">
              Rappels automatiques J-7, J-1 et jour J
            </p>
          </div>

          {/* CARTE 2 : Messages personnalisés */}
          <div className="group bg-white/[0.03] border border-white/[0.08] hover:border-[#C8A84E]/20 rounded-2xl p-6 backdrop-blur-sm text-center transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#C8A84E]/10 flex items-center justify-center group-hover:bg-[#C8A84E]/20 transition-colors duration-300">
              <span className="text-2xl">✉️</span>
            </div>
            <p className="text-white font-semibold text-sm mb-1">Messages personnalisés</p>
            <p className="text-white/30 text-xs leading-relaxed">
              Générés par IA selon votre relation
            </p>
          </div>

          {/* CARTE 3 : Tous vos contacts */}
          <div className="group bg-white/[0.03] border border-white/[0.08] hover:border-[#C8A84E]/20 rounded-2xl p-6 backdrop-blur-sm text-center transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#C8A84E]/10 flex items-center justify-center group-hover:bg-[#C8A84E]/20 transition-colors duration-300">
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-white font-semibold text-sm mb-1">Tous vos contacts</p>
            <p className="text-white/30 text-xs leading-relaxed">
              Famille, amis, collègues organisés
            </p>
          </div>

        </div>

        {/* ==========================================
            FOOTER DISCRET
            Tout en bas de la page
            ========================================== */}
        <div className="mt-16 pb-8 text-center">
          <p className="text-white/15 text-xs tracking-wider uppercase">
            © 2025 Ephemer.name — Votre compagnon nocturne
          </p>
        </div>

      </div>
    </main>
  )
}
