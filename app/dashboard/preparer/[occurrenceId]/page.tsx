import PreparationScreen from '@/components/PreparationScreen'
export default async function Page({ params }: { params: Promise<{ occurrenceId: string }> }) {
 const { occurrenceId } = await params
 return <PreparationScreen key={occurrenceId} occurrenceId={occurrenceId} />
}

