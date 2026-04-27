// app/api/test-resend-simple/route.ts
// Test ultra-simple de Resend

import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    console.log('🔍 Clé utilisée:', process.env.RESEND_API_KEY?.slice(0, 15))
    
    const response = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'ephemer.team@gmail.com',
      subject: '🎉 Test Simple Resend',
      html: '<p>Si tu reçois ça, Resend marche ! 🚀</p>',
    })

    return NextResponse.json({ 
      success: true, 
      messageId: response.data?.id,
      error: response.error 
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 })
  }
}
