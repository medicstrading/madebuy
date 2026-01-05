import type { SectionProps } from './SectionRenderer'

const HEIGHT_MAP = {
  small: 'h-8 md:h-12',
  medium: 'h-12 md:h-20',
  large: 'h-20 md:h-32',
}

export function Spacer({ settings }: SectionProps) {
  const height = settings.spacerHeight || 'medium'

  return <div className={HEIGHT_MAP[height]} aria-hidden="true" />
}
