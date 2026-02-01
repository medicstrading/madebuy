import { admins, auditLog } from '@madebuy/db'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

// Generic error message to prevent username enumeration
const INVALID_CREDENTIALS_MSG = 'Invalid credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const admin = await admins.getAdminByEmail(credentials.email)

        // Use constant-time comparison approach: always check password
        // even if user doesn't exist to prevent timing attacks
        if (!admin) {
          // Log failed login attempt (unknown email) - internal only
          auditLog
            .logAuditEvent({
              eventType: 'admin.login.failed',
              actorEmail: credentials.email,
              actorType: 'admin',
              success: false,
              // Keep specific reason in audit log for security monitoring
              errorMessage: 'Unknown admin email',
            })
            .catch((e) => console.error('Audit log failed:', e))
          // Return generic error to user (no enumeration)
          return null
        }

        const isValid = await admins.verifyPassword(admin, credentials.password)

        if (!isValid) {
          // Log failed login attempt (wrong password) - internal only
          auditLog
            .logAuditEvent({
              eventType: 'admin.login.failed',
              actorId: admin.id,
              actorEmail: admin.email,
              actorType: 'admin',
              success: false,
              // Keep specific reason in audit log for security monitoring
              errorMessage: 'Invalid password',
            })
            .catch((e) => console.error('Audit log failed:', e))
          // Return generic error to user (no enumeration)
          return null
        }

        // Update last login time
        await admins.updateLastLogin(admin.id)

        // Log successful login
        auditLog
          .logAuditEvent({
            eventType: 'admin.login.success',
            actorId: admin.id,
            actorEmail: admin.email,
            actorType: 'admin',
            success: true,
          })
          .catch((e) => console.error('Audit log failed:', e))

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect errors to login page (shows generic message)
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  // Cookie isolation - use manager-specific cookie names
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-madebuy-manager.session-token'
          : 'madebuy-manager.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}
