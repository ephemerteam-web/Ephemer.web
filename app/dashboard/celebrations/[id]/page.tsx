import InstalledCelebrationScreen from '@/components/celebrations/CelebrationExperience'
export default async function Page({params}:{params:Promise<{id:string}>}) {
  const {id}=await params
  return <InstalledCelebrationScreen id={id}/>
}
