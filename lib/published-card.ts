import { supportedCardSnapshot, type SupportedCardSnapshot } from './card-snapshot-v2'
import { collectiveCardSnapshot, type CollectiveCardSnapshot } from './collective-card'

export type PublishedCardSnapshot = SupportedCardSnapshot | CollectiveCardSnapshot
export function publishedCardSnapshot(value: unknown): PublishedCardSnapshot {
  return value && typeof value === 'object' && 'format' in value && value.format === 3 ? collectiveCardSnapshot(value) : supportedCardSnapshot(value, true)
}
