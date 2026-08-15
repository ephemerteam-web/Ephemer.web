// app/dashboard/ce-mois-ci/page.tsx
import EvenementsMois from '@/components/EvenementsMois';

export default function CeMoisCiPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <EvenementsMois />
      </div>
    </div>
  );
}