import 'next-auth'
import type { AdminRole } from '@madebuy/shared'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    role: AdminRole
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: AdminRole
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: AdminRole
  }
}
