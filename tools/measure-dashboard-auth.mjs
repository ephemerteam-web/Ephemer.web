import { execFileSync } from 'node:child_process'
import { harness } from '../tests/ui-harness.mjs'
import { pageDatabase } from '../tests/p2-helpers.mjs'
import React from 'react'

const files=['app/dashboard/layout.tsx','app/dashboard/page.tsx','components/NotificationBell.tsx','app/dashboard/contacts/page.tsx']
const before=Object.fromEntries(files.map(file=>[file,execFileSync('git',['show',(process.argv[2] || 'HEAD')+':'+file],{encoding:'utf8'})]))
for(const version of ['before','after']){
  const counts={getUser:0,getSession:0};const user={id:'u1',email:'test@example.invalid'}
  const queryDb=pageDatabase({profiles:[{...user,prenom:'Test'}],contacts:[],notifications:[]})
  const channel={on:()=>channel,subscribe:()=>channel}
  const client={from(table){const q=queryDb.from(table);q.single=()=>q.maybeSingle();return q},auth:{getUser:async()=>{counts.getUser++;return {data:{user},error:null}},getSession:async()=>{counts.getSession++;return {data:{session:{user,access_token:'simulation'}}}},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},channel:()=>channel,removeChannel(){}}
  const router={push(){},replace(){}}
  const common={'next/navigation':{useRouter:()=>router,usePathname:()=>'/dashboard'},'@/lib/supabase-browser':{supabase:client},'../supabase-browser':{supabase:client},'@/components/DrawerContext':{useDrawer:()=>({ouvrirDrawer(){}}),DrawerProvider:'drawers'},'@/components/DashboardUserContext':{DashboardUserContext:React.createContext(null),useDashboardUser:()=>user},'@vercel/analytics/react':{Analytics:'analytics'}}
  for(const name of ['ContactDraftProvider','CelestialBackdrop','DrawerGlobal','NotificationBell','MenuLateral','MenuNavigation','OfflineBanner','FavorisRow','SaintDuJour','ContactSearchFilters'])common['@/components/'+name]={default:name}
  const instances=[]
  for(const file of files){
    const h=harness(file,{sources:version==='before'?before:{},overrides:common});instances.push(h)
    h.render({children:'Page'});await h.flush()
    if(file==='components/NotificationBell.tsx')console.log(version+' opening',JSON.stringify(counts))
  }
  console.log(version+' navigation Contacts',JSON.stringify(counts))
  instances.forEach(h=>h.unmount())
}
