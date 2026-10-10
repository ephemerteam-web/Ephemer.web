export type ImageField = { id: string; label: string; value: string | null | undefined; sensitive?: boolean }
export function selectedImageFields(fields: ImageField[], selected: string[]) {
  return fields.filter(field => !!field.value && selected.includes(field.id))
}
export function defaultImageFields(fields: ImageField[]) { return fields.filter(field => !field.sensitive && field.value).map(field => field.id) }
export function downloadImage(file: File) {
  const url = URL.createObjectURL(file), link = document.createElement('a')
  link.href = url; link.download = file.name; link.hidden = true
  // Dans un dialogue modal, le reste du document est inerte : placer le lien
  // dans le dialogue actif garde le téléchargement lié au clic de l'utilisateur.
  const dialogs = Array.from(document.querySelectorAll('dialog[open]'))
  ;(dialogs.at(-1) ?? document.body).append(link)
  link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

// Chaque page se termine entre des lignes de texte ou des illustrations.
// Un élément indivisible trop haut est refusé, jamais coupé silencieusement.
export function imagePageCuts(height: number, intervals: { top: number; bottom: number }[], limit = 2048) {
  const pages: { top: number; height: number }[] = []
  let top = 0
  while (top < height) {
    let end = Math.min(height, top + limit)
    if (end < height) {
      const candidates = [end, ...intervals.map(item => Math.floor(item.top) - 1)].filter(y => y > top && y <= end).sort((a,b) => b-a)
      const safe = candidates.find(y => !intervals.some(item => item.top < y && item.bottom > y))
      if (!safe || safe - top < 20) throw new Error('Cette illustration est trop haute pour une image. Réduis-la avant de partager.')
      end = safe
    }
    pages.push({ top, height: end - top }); top = end
  }
  return pages
}
export async function prepareImages(node: HTMLElement): Promise<File[]> {
  await document.fonts.ready
  const intervals: { top: number; bottom: number }[] = [], base = node.getBoundingClientRect().top
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const text = walker.currentNode, content = text.textContent ?? ''
    for (const match of content.matchAll(/\S+\s*/g)) {
      const range = document.createRange(); range.setStart(text, match.index!); range.setEnd(text, match.index! + match[0].length)
      for (const rect of Array.from(range.getClientRects())) if (rect.height) intervals.push({ top: rect.top - base, bottom: rect.bottom - base })
    }
  }
  for (const element of Array.from(node.querySelectorAll('svg, img'))) {
    const rect = element.getBoundingClientRect(); intervals.push({ top: rect.top - base, bottom: rect.bottom - base })
  }
  const height = Math.ceil(node.getBoundingClientRect().height)
  const pages = imagePageCuts(height, intervals)
  if (pages.length > 20) throw new Error('Le contenu est trop long. Sélectionne moins de champs pour préparer les images.')
  const { toBlob } = await import('html-to-image')
  const files: File[] = []
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index], host = document.createElement('div'), stage = document.createElement('div'), clone = node.cloneNode(true) as HTMLElement
    // Déplacer l'hôte, pas la racine exportée : les propriétés CSS logiques
    // d'un élément hors écran peuvent sinon déplacer son contenu dans le SVG.
    Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0' })
    Object.assign(stage.style, { position: 'relative', width: '640px', height: `${page.height}px`, overflow: 'hidden', background: '#111827' })
    Object.assign(clone.style, { width: '640px', height: `${height}px`, transform: `translateY(-${page.top}px)` })
    stage.append(clone); host.append(stage); document.body.append(host)
    try {
      const blob = await toBlob(stage, { pixelRatio: 2, backgroundColor: '#111827' })
      if (!blob) throw new Error('Le navigateur n’a pas pu préparer cette image.')
      files.push(new File([blob], `ephemer${pages.length > 1 ? '-' + (index + 1) : ''}.png`, { type: 'image/png' }))
    } finally { host.remove() }
  }
  return files
}
