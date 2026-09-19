import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const variants = { primary: 'bg-action text-on-action hover:bg-action-hover border-transparent', secondary: 'bg-surface text-ink border-line hover:border-accent', danger: 'bg-[#b4233b] text-white border-transparent hover:opacity-90' }
  return <button type={type} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`} {...props} />
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm leading-relaxed ${error ? 'border-danger/40 text-danger bg-danger/5' : 'border-line text-muted bg-surface'}`}>{children}</div>
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-sm space-y-4 ${className}`}>{children}</section>
}
export function PageHeading({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="mb-6"><h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">{title}</h1>{children && <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted">{children}</p>}</header>
}
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`w-full min-h-11 rounded-xl border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted focus:border-accent ${className}`} {...props} />
}
