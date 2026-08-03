"use client"

import { useState } from "react"
import Link from "next/link"
import StarryBackground from "@/components/StarryBackground"

type TabKey = "android" | "iphone" | "reactivate" | "faq"

export default function GuideNotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("android")

  const tabs: { key: TabKey; label: string; emoji: string }[] = [
    { key: "android", label: "Android", emoji: "🤖" },
    { key: "iphone", label: "iPhone", emoji: "🍎" },
    { key: "reactivate", label: "Réactiver", emoji: "🔄" },
    { key: "faq", label: "FAQ", emoji: "❓" },
  ]

  return (
    <StarryBackground>
      {/* HEADER avec logo (identique à PatchNotePage) */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <svg
            className="w-8 h-8 text-[#C8A84E] transition-transform duration-300 group-hover:rotate-12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill="currentColor"
              className="text-[#1B2A4A]"
            />
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="15" cy="9" r="1" fill="currentColor" />
          </svg>
          <span className="text-xl font-semibold tracking-tight">
            <span className="text-white">Ephemer</span>
            <span className="text-white/40 font-light">
              <span className="text-[#C8A84E]">.</span>name
            </span>
          </span>
        </Link>
      </nav>

      {/* CONTENU PRINCIPAL (adapté du PushNotificationsGuide) */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 z-10 flex-1">
        {/* Bouton retour (style Ephemer.name) */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A84E] hover:text-white transition-all text-sm font-medium mb-6"
        >
          <span>←</span>
          Retour au Dashboard
        </Link>

        {/* En-tête (style Ephemer.name) */}
        <header className="mb-8 border-b border-white/10 pb-6">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-white">
            Notifications push
          </h1>
          <p className="text-lg text-white/50">
            Active les rappels pour ne plus oublier les dates importantes.
          </p>
        </header>

        {/* Onglets (style adapté) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[#C8A84E] text-white shadow-lg"
                  : "bg-white/10 text-white/40 hover:bg-white/20"
              }`}
            >
              <span className="mr-1">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu des onglets (style Ephemer.name) */}
        <div className="bg-white/5 border border-[#C8A84E]/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          {activeTab === "android" && <AndroidGuide />}
          {activeTab === "iphone" && <IPhoneGuide />}
          {activeTab === "reactivate" && <ReactivateGuide />}
          {activeTab === "faq" && <FAQGuide />}
        </div>

        {/* Lien vidéo tutorielle (style adapté) */}
        <div className="mt-8 text-center">
          <p className="text-white/50 text-sm mb-3">
            🎥 Tu préfères une vidéo ? Regarde ces tutoriels :
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href="https://www.youtube.com/results?search_query=activer+notifications+push+chrome+android"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-600/40 rounded-lg text-red-300 text-sm hover:bg-red-600/30 transition-colors"
            >
              ▶️ Android (Chrome)
            </a>
            <a
              href="https://www.youtube.com/results?search_query=activer+notifications+safari+iphone+pwa"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-600/40 rounded-lg text-red-300 text-sm hover:bg-red-600/30 transition-colors"
            >
              ▶️ iPhone (Safari)
            </a>
          </div>
        </div>
      </div>
    </StarryBackground>
  )
}

/* ═══════════════════════════════════════════════════
   COMPOSANTS RÉUTILISABLES (adaptés au nouveau thème)
   ═══════════════════════════════════════════════════ */

function AndroidGuide() {
  return (
    <div className="space-y-4">
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
        <p className="text-green-300 text-sm font-medium">
          ✅ Simple ! Les notifications fonctionnent directement depuis ton navigateur.
        </p>
      </div>

      <h3 className="text-white font-semibold text-base">📱 Étapes à suivre</h3>

      <ol className="space-y-4">
        <Step
          number={1}
          title="Ouvre Ephemer dans ton navigateur"
          description="De préférence Chrome, Firefox ou Samsung Internet."
        />
        <Step
          number={2}
          title="Va dans les paramètres du site"
          description="Clique sur le petit cadenas 🔒 à gauche de l'adresse du site (en haut)."
          mockup="android-lock"
        />
        <Step
          number={3}
          title="Autorise les notifications"
          description={"Trouve la ligne « Notifications » et sélectionne « Autoriser »."}
          mockup="android-notif"
        />
        <Step
          number={4}
          title="Active les rappels dans Ephemer"
          description="Retourne sur Ephemer et clique sur le bouton « Activer les rappels push »."
        />
        <Step
          number={5}
          title="Accepte la demande"
          description={"Ton téléphone va te demander : « Autoriser Ephemer à envoyer des notifications ? » → Appuie sur Autoriser."}
          mockup="android-prompt"
        />
      </ol>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
        <p className="text-blue-300 text-xs">
          💡 <strong>Astuce :</strong> Pour une meilleure expérience, tu peux aussi
          ajouter Ephemer à ton écran d'accueil :
          menu du navigateur (⋮) → « Ajouter à l'écran d'accueil ».
        </p>
      </div>
    </div>
  )
}

function IPhoneGuide() {
  return (
    <div className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
        <p className="text-amber-300 text-sm font-medium">
          ⚠️ Important : Sur iPhone, les notifications ne fonctionnent que via
          <strong> Safari</strong> et après avoir ajouté le site à l'écran d'accueil.
        </p>
      </div>

      <div className="bg-white/5 rounded-lg p-3">
        <p className="text-white/70 text-xs">
          🍎 C'est une restriction d'Apple. Chrome et Firefox sur iPhone ne
          permettent pas les notifications web. Utilise <strong>Safari</strong> pour cette manipulation.
        </p>
      </div>

      <h3 className="text-white font-semibold text-base">📱 Étapes à suivre</h3>

      <ol className="space-y-4">
        <Step
          number={1}
          title="Ouvre Ephemer dans Safari"
          description="⚠️ Obligatoirement Safari (pas Chrome, pas Firefox)."
        />
        <Step
          number={2}
          title="Ajoute Ephemer à ton écran d'accueil"
          description={"Appuie sur le bouton Partager (le carré avec la flèche vers le haut ↑) puis fais défiler et choisis « Sur l'écran d'accueil »."}
          mockup="iphone-share"
        />
        <Step
          number={3}
          title="Confirme l'ajout"
          description={"Appuie sur « Ajouter » en haut à droite."}
          mockup="iphone-add"
        />
        <Step
          number={4}
          title="Ouvre Ephemer depuis ton écran d'accueil"
          description="Retourne sur ton écran d'accueil et appuie sur l'icône Ephemer qui vient d'apparaître."
        />
        <Step
          number={5}
          title="Active les rappels"
          description={"Dans Ephemer, clique sur « Activer les rappels push ». Une fenêtre va te demander d'autoriser les notifications → Appuie sur « Autoriser »."}
          mockup="iphone-prompt"
        />
      </ol>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
        <p className="text-blue-300 text-xs">
          💡 <strong>Bon à savoir :</strong> Une fois ajouté à l'écran d'accueil,
          Ephemer fonctionne comme une vraie application. Tu n'as à faire
          cette manipulation qu'une seule fois !
        </p>
      </div>
    </div>
  )
}

function ReactivateGuide() {
  return (
    <div className="space-y-4">
      <p className="text-white/70 text-sm">
        Tu as bloqué les notifications par erreur ? Pas de panique, voici comment les réactiver :
      </p>

      {/* Android */}
      <div>
        <h3 className="text-white font-semibold text-base mb-3">🤖 Sur Android</h3>
        <ol className="space-y-3">
          <Step
            number={1}
            title="Ouvre les paramètres de ton téléphone"
            description={"Applications → Chrome (ou ton navigateur) → Notifications → Active le bouton."}
          />
          <Step
            number={2}
            title="Ou via le navigateur"
            description={"Ouvre Ephemer → clique sur le cadenas 🔒 dans la barre d'adresse → Notifications → Autoriser."}
          />
          <Step
            number={3}
            title="Recharge la page"
            description="Actualise Ephemer et clique à nouveau sur « Activer les rappels push »."
          />
        </ol>
      </div>

      <div className="border-t border-white/10 my-4" />

      {/* iPhone */}
      <div>
        <h3 className="text-white font-semibold text-base mb-3">🍎 Sur iPhone</h3>
        <ol className="space-y-3">
          <Step
            number={1}
            title="Ouvre les Réglages de ton iPhone"
            description={"Descends jusqu'à trouver « Ephemer » dans la liste des applications."}
          />
          <Step
            number={2}
            title="Active les notifications"
            description={"Appuie sur Notifications → active « Autoriser les notifications »."}
          />
          <Step
            number={3}
            title="Rouvre Ephemer"
            description={"Depuis l'écran d'accueil, ouvre Ephemer et clique sur « Activer les rappels push »."}
          />
        </ol>
      </div>
    </div>
  )
}

function FAQGuide() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: "Est-ce que ça marche sur tous les téléphones ?",
      answer:
        "Oui ! Sur Android, ça fonctionne avec Chrome, Firefox, Edge et Samsung Internet. Sur iPhone, il faut utiliser Safari et ajouter le site à l'écran d'accueil (voir l'onglet iPhone).",
    },
    {
      question: "Est-ce que ça consomme de la batterie ?",
      answer:
        "Non, les notifications push sont très légères. Elles utilisent le système natif de ton téléphone, exactement comme les notifications de tes autres applications. L'impact sur la batterie est négligeable.",
    },
    {
      question: "Est-ce que je peux désactiver les notifications ?",
      answer:
        "Oui, à tout moment ! Tu peux soit cliquer sur « Désactiver » dans Ephemer, soit aller dans les paramètres de ton téléphone et bloquer les notifications pour Ephemer.",
    },
    {
      question: "Je ne reçois rien, pourquoi ?",
      answer:
        "Plusieurs raisons possibles : (1) Les notifications ne sont pas activées dans les paramètres de ton téléphone, (2) Tu as bloqué les notifications pour Ephemer, (3) Sur iPhone, tu n'as pas ajouté le site à l'écran d'accueil. Consulte l'onglet « Réactiver » pour résoudre le problème.",
    },
    {
      question: "Est-ce que mes données sont privées ?",
      answer:
        "Absolument. Les notifications ne contiennent que le prénom de ton contact et le type d'événement (ex: « Anniversaire de Marie demain »). Aucune donnée sensible n'est transmise. Tout est chiffré et sécurisé.",
    },
    {
      question: "Pourquoi ça ne marche pas sur Chrome iPhone ?",
      answer:
        "C'est une restriction d'Apple. Sur iPhone, seul Safari permet les notifications web. Chrome, Firefox et les autres navigateurs sur iPhone ne peuvent pas envoyer de notifications. C'est pourquoi il faut utiliser Safari.",
    },
    {
      question: "Est-ce que je peux recevoir des notifications la nuit ?",
      answer:
        "Oui, mais tu peux configurer des plages horaires silencieuses dans les paramètres de ton téléphone (mode « Ne pas déranger »). Ephemer respecte les réglages de ton téléphone.",
    },
    {
      question: "Ça marche hors ligne ?",
      answer:
        "Les notifications push peuvent fonctionner même si tu n'as pas ouvert Ephemer récemment, tant que ton téléphone est connecté à internet au moment où la notification est envoyée.",
    },
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold text-base mb-4">
        Questions fréquentes
      </h3>

      {faqs.map((faq, index) => (
        <div
          key={index}
          className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-white/10 transition-colors"
          >
            <span className="text-white text-sm font-medium">{faq.question}</span>
            <span
              className={`text-white/40 transition-transform flex-shrink-0 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>
          {openIndex === index && (
            <div className="px-4 pb-3 pt-0">
              <p className="text-white/70 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}

      <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
        <p className="text-indigo-300 text-sm">
          💬 Tu as une autre question ? Contacte-nous à{" "}
          <a
            href="mailto:support@ephemer.name"
            className="underline hover:text-indigo-200"
          >
            support@ephemer.name
          </a>
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   COMPOSANT STEP (inchangé, mais intégré ci-dessus)
   ═══════════════════════════════════════════════════ */
function Step({
  number,
  title,
  description,
  mockup,
}: {
  number: number
  title: string
  description: string
  mockup?: string
}) {
  return (
    <li className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#C8A84E] text-white text-sm font-bold flex items-center justify-center">
        {number}
      </div>
      <div className="flex-1">
        <p className="text-white text-sm font-medium">{title}</p>
        <p className="text-white/70 text-xs mt-0.5">{description}</p>
        {mockup && <MockupScreen type={mockup} />}
      </div>
    </li>
  )
}

/* ═══════════════════════════════════════════════════
   MOCKUPSCREEN (inchangé, mais intégré ci-dessus)
   ═══════════════════════════════════════════════════ */
function MockupScreen({ type }: { type: string }) {
  return (
    <div className="mt-3 mb-2 mx-auto max-w-[280px] bg-white/5 border-2 border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-sm">
      {/* Barre de statut */}
      <div className="flex justify-between items-center text-[10px] text-white/40 mb-2 px-1">
        <span>9:41</span>
        <div className="flex gap-1">
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Contenu selon le type */}
      {type === "android-lock" && (
        <div className="space-y-2">
          <div className="bg-white/10 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs">🔒</span>
              <span className="text-white text-xs font-medium">ephemer.name</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-[10px]">Notifications</span>
                <span className="text-green-400 text-[10px] font-medium">✓ Autoriser</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-[10px]">Localisation</span>
                <span className="text-white/50 text-[10px]">Bloquer</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-[10px]">Caméra</span>
                <span className="text-white/50 text-[10px]">Demander</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === "android-notif" && (
        <div className="bg-white/10 rounded-lg p-2">
          <div className="text-white text-xs font-medium mb-2">Paramètres du site</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-white/20 rounded p-1.5">
              <span className="text-white/70 text-[10px]">🔔 Notifications</span>
              <div className="bg-green-500 w-8 h-4 rounded-full relative">
                <div className="absolute right-0.5 top-0.5 bg-white w-3 h-3 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === "android-prompt" && (
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-center mb-2">
            <div className="text-2xl mb-1">🔔</div>
            <p className="text-white text-[10px] font-medium">ephemer.name</p>
            <p className="text-white/50 text-[9px] mt-0.5">
              souhaite t'envoyer des notifications
            </p>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-1.5 bg-white/20 text-white/50 text-[10px] rounded font-medium">
              Bloquer
            </button>
            <button className="flex-1 py-1.5 bg-[#C8A84E] text-white text-[10px] rounded font-medium">
              Autoriser
            </button>
          </div>
        </div>
      )}

      {type === "iphone-share" && (
        <div className="bg-white/10 rounded-lg p-2">
          <div className="text-white text-xs font-medium mb-2 text-center">Partager</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-2 mb-1">
                <span className="text-sm">💬</span>
              </div>
              <span className="text-white/40 text-[8px]">Message</span>
            </div>
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-2 mb-1">
                <span className="text-sm">📧</span>
              </div>
              <span className="text-white/40 text-[8px]">Mail</span>
            </div>
            <div className="text-center">
              <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-2 mb-1">
                <span className="text-sm">📱</span>
              </div>
              <span className="text-blue-300 text-[8px] font-medium">Écran d'accueil</span>
            </div>
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-2 mb-1">
                <span className="text-sm">📋</span>
              </div>
              <span className="text-white/40 text-[8px]">Copier</span>
            </div>
          </div>
        </div>
      )}

      {type === "iphone-add" && (
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-center mb-2">
            <div className="text-2xl mb-1">📱</div>
            <p className="text-white text-[10px] font-medium">Ajouter à l'écran d'accueil</p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2 mb-3">
            <div className="w-8 h-8 bg-[#C8A84E] rounded-lg flex items-center justify-center text-white text-xs font-bold">
              E
            </div>
            <span className="text-white text-[10px]">Ephemer</span>
          </div>
          <button className="w-full py-1.5 bg-[#C8A84E] text-white text-[10px] rounded-lg font-medium">
            Ajouter
          </button>
        </div>
      )}

      {type === "iphone-prompt" && (
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-center mb-2">
            <div className="text-2xl mb-1">🔔</div>
            <p className="text-white text-[10px] font-medium">{"\"ephemer.name\" souhaite t'envoyer des notifications"}</p>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-1.5 bg-white/20 text-white/50 text-[10px] rounded font-medium">
              Refuser
            </button>
            <button className="flex-1 py-1.5 bg-[#C8A84E] text-white text-[10px] rounded font-medium">
              Autoriser
            </button>
          </div>
        </div>
      )}
    </div>
  )
}