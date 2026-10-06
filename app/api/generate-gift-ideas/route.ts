// 🎁 Idées à rechercher : aucun prix produit, stock ou livraison inventé.
import { NextRequest, NextResponse } from 'next/server'
import { giftOccasion, usableGiftIdeas } from '@/lib/gift-ideas'
import { verifierGardeIA } from '@/lib/garde-ia'
import { personalAIContext } from '@/lib/ai-consent-server'
import { AIInputError, giftAIOptions, GIFT_MODES } from '@/lib/ai-options'
import { aiRequest, providerText } from '@/lib/ai-transport'
import { centsInput } from '@/lib/attention-utils'

export async function POST(request: NextRequest) {
  const garde = await verifierGardeIA(request)
  if (!garde.ok) return NextResponse.json({ error: garde.message }, { status: garde.status })
  try {
    const body = await aiRequest(request), options = giftAIOptions(body)
    const personalContext = await personalAIContext(body, garde.userId)
    const prompt = `Propose 6 idées d'attentions en français pour ${giftOccasion(options.eventType)}.
Relation : ${options.relation}. Mode : ${GIFT_MODES.find(mode => mode.value === options.giftMode)!.label}.
${options.budgetCents === null ? 'Aucun plafond de recherche indiqué.' : `Objectif de recherche : au plus ${centsInput(options.budgetCents)} ${options.currency}. Ce n'est pas un prix confirmé.`}
${options.giftMode === 'no_purchase' ? 'Uniquement des gestes gratuits, réalisables sans achat et sans fourniture à acheter. Pas de recherche marchande.' : ''}
${options.giftMode === 'last_minute' ? 'Privilégie des attentions réalisables rapidement ; ne promets jamais de livraison ni de disponibilité.' : ''}
${options.giftMode === 'personalized' ? 'Propose des façons de personnaliser une attention, sans inventer de souvenirs ni de goûts.' : ''}
Ce sont des idées à rechercher, pas des produits vérifiés. N'invente aucun prix, stock, URL, image ou délai de livraison.
N'invente aucun âge, préférence, détail intime ou souvenir. Les informations explicitement autorisées ci-dessous peuvent guider les idées.
Pas d'alcool, produit médical ou objet dangereux. Varie les catégories.
Réponds uniquement avec un tableau JSON ; chaque objet a exactement les clés idee, raison, categorie, recherche, emoji.
idee : titre concret (200 caractères maximum). raison : courte explication (500 maximum).
categorie : loisir, bien_etre, tech, decoration ou gourmand ; recherche : mots clés (200 maximum) ; emoji : un emoji.
Aucun prix, montant ou promesse commerciale dans ces textes.
${personalContext}`
    const response = await fetch('https://api.mammouth.ai/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MAMMOUTH_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4.1', messages: [{ role: 'user', content: prompt }], temperature: 0.8 }),
    })
    if (!response.ok) return NextResponse.json({ error: 'La génération a échoué. Réessaie.' }, { status: 502 })
    const raw = (await providerText(response, 16000)).replace(/^```(?:json)?\s*|\s*```$/g, '')
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { throw new AIInputError('Réponse IA inutilisable. Réessaie.', 502) }
    const ideas = usableGiftIdeas(parsed)
    if (!ideas.length || !Array.isArray(parsed) || ideas.length !== parsed.length) throw new AIInputError('Réponse IA inutilisable. Réessaie.', 502)
    return NextResponse.json({ ideas })
  } catch (error) {
    if (error instanceof AIInputError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Impossible de générer ces idées. Réessaie.' }, { status: 500 })
  }
}
