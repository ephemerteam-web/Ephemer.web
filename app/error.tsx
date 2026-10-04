'use client'
import ErrorRecovery from '@/components/ErrorRecovery'
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorRecovery reset={reset} />
}
