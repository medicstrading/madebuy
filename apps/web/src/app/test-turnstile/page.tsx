// Server component wrapper - enables dynamic rendering
export const dynamic = 'force-dynamic'

import { TestTurnstileClient } from './TestTurnstileClient'

export default function TestTurnstilePage() {
  return <TestTurnstileClient />
}
