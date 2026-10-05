// app/dashboard/ce-mois-ci/page.tsx
import EvenementsMois from '@/components/EvenementsMois'

export default function CeMoisCiPage() {
  return (
    <div className="min-h-screen bg-canvas/90 px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <EvenementsMois />
      </div>
    </div>
  )
}
