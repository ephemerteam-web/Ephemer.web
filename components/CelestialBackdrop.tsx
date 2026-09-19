// Motifs vectoriels légers inspirés du fond fourni, sans nouvel asset bitmap.
export default function CelestialBackdrop() {
  return <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none select-none -z-10">
    <svg viewBox="0 0 800 400" className="absolute -left-8 top-0 h-auto w-[320px] sm:w-[440px] opacity-70">
      <g fill="none" stroke="var(--accent)" strokeWidth="0.6"><path d="M-100 300C100 100 240 190 310-70M-90 380C110 280 370 60 350-60" /></g>
      <path d="M155 92A83 83 0 1 0 195 230A76 76 0 0 1 155 92" fill="var(--celestial)" />
      <g fill="var(--accent)"><path d="m75 140 3 14 14 3-14 3-3 14-3-14-14-3 14-3Zm600 740 3 14 14 3-14 3-3 14-3-14-14-3 14-3Z" /><circle cx="280" cy="140" r="3" /><circle cx="540" cy="960" r="4" /><circle cx="95" cy="260" r="2" /></g>
    </svg>
    <svg viewBox="0 0 800 400" className="absolute bottom-0 right-0 h-auto w-full max-w-3xl opacity-30">
      <path d="M0 400Q150 230 300 330T540 240T800 120V400Z" fill="var(--celestial)" />
      <path d="M30 400Q210 150 460 290T850 40M220 430Q340 150 820 100" fill="none" stroke="var(--accent)" strokeWidth="1" />
      <g fill="var(--accent)"><path d="m610 150 3 14 14 3-14 3-3 14-3-14-14-3 14-3Z" /><circle cx="410" cy="310" r="3" /><circle cx="740" cy="70" r="2" /></g>
    </svg>
  </div>
}
