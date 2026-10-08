import { avatarRenderConfig, type AvatarRenderConfig } from '@/lib/avatar-render-config'
import AvatarRendererV1 from './AvatarRendererV1'
import AvatarRendererV3 from './AvatarRendererV3'
export default function AvatarRenderer({ config: input, decorative = false, className = '' }: {
  config: AvatarRenderConfig; decorative?: boolean; className?: string
}) {
  const config = avatarRenderConfig(input)
  return config.format === 2 ? <AvatarRendererV3 config={config} decorative={decorative} className={className} /> :
    <AvatarRendererV1 config={config} decorative={decorative} className={className} />
}
