import CelestialBackdrop from './CelestialBackdrop'
export default function AppLayout({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <main className={`min-h-screen bg-canvas text-ink flex flex-col items-center relative isolate overflow-hidden ${className}`}>
    <CelestialBackdrop />
    {children}
  </main>
}
