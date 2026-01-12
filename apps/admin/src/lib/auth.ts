import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { tenants, auditLog } from '@madebuy/db'

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

        const tenant = await tenants.getTenantByEmail(credentials.email)

        if (!tenant) {
          // Log failed login attempt (unknown email) - fire-and-forget for faster response
          auditLog.logAuditEvent({
            eventType: 'auth.login.failed',
            actorEmail: credentials.email,
            actorType: 'anonymous',
            success: false,
            errorMessage: 'Unknown email address',
          }).catch(e => console.error('Audit log failed (login failure - unknown email):', e))
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, tenant.passwordHash)

        if (!isValid) {
          // Log failed login attempt (wrong password) - fire-and-forget for faster response
          auditLog.logAuditEvent({
            tenantId: tenant.id,
            eventType: 'auth.login.failed',
            actorId: tenant.id,
            actorEmail: tenant.email,
            actorType: 'tenant',
            success: false,
            errorMessage: 'Invalid password',
          }).catch(e => console.error('Audit log failed (login failure - invalid password):', e))
          return null
        }

        // Log successful login - fire-and-forget for faster response
        auditLog.logAuditEvent({
          tenantId: tenant.id,
          eventType: 'auth.login.success',
          actorId: tenant.id,
          actorEmail: tenant.email,
          actorType: 'tenant',
          success: true,
        }).catch(e => console.error('Audit log failed (login success):', e))

        return {
          id: tenant.id,
          email: tenant.email,
          name: tenant.businessName,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    // Token expires after 8 hours (reduced from 24 hours for improved security)
    maxAge: 8 * 60 * 60, // 8 hours in seconds
  },
  // JWT configuration
  jwt: {
    // Token expires after 8 hours
    maxAge: 8 * 60 * 60,
  },
}
