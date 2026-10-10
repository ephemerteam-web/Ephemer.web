import { redirect } from 'next/navigation'
import { legacyDestination } from '@/lib/legacy-navigation'

export default async function GiftIdeas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(legacyDestination('gifts', await searchParams))
}
