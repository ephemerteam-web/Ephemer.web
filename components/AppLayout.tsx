type AppLayoutProps = {
  children: React.ReactNode
  className?: string
}

export default function AppLayout({ children, className = "" }: AppLayoutProps) {
  return (
    <main className={`min-h-screen bg-[#0B1120] flex flex-col items-center relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[20%] w-1 h-1 bg-[#C8A84E] rounded-full shadow-[0_0_6px_2px_rgba(200,168,78,0.4)]" />
        <div className="absolute top-[25%] left-[35%] w-0.5 h-0.5 bg-[#C8A84E]/60 rounded-full" />
        <div className="absolute top-[10%] right-[25%] w-1 h-1 bg-[#C8A84E]/80 rounded-full shadow-[0_0_4px_1px_rgba(200,168,78,0.3)]" />
        <div className="absolute top-[30%] right-[15%] w-0.5 h-0.5 bg-[#C8A84E]/40 rounded-full" />
        <div className="absolute top-[8%] left-[55%] w-0.5 h-0.5 bg-[#C8A84E]/50 rounded-full" />
        <div className="absolute top-[20%] right-[40%] w-1 h-1 bg-[#C8A84E]/30 rounded-full" />
        <div className="absolute top-[35%] left-[10%] w-0.5 h-0.5 bg-[#C8A84E]/40 rounded-full" />
        <div className="absolute top-[12%] left-[75%] w-1 h-1 bg-[#C8A84E]/60 rounded-full shadow-[0_0_4px_1px_rgba(200,168,78,0.2)]" />
      </div>

      <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#1B2A4A] via-[#152038] to-[#0B1120] opacity-60" />
        <div className="absolute inset-[-20px] rounded-full bg-[#C8A84E]/5 blur-3xl" />
        <div className="absolute inset-0 rounded-full border border-[#C8A84E]/10" />
      </div>

      {children}
    </main>
  )
}