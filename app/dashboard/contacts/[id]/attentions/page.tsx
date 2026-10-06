import ContactAttentions from '@/components/ContactAttentions'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params
 return <ContactAttentions key={id} contactId={Number(id)} />
}

