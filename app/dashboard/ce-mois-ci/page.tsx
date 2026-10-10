import { redirect } from 'next/navigation'
import { legacyDestination } from '@/lib/legacy-navigation'

export default async function CeMoisCi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(legacyDestination('month', await searchParams))
}
