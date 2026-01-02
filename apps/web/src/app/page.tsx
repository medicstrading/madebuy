import { redirect } from 'next/navigation'

// Skip static generation
export const dynamic = 'force-dynamic'

export default function RootPage() {
  redirect('/marketplace')
}
