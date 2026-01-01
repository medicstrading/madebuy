import { XeroClient, TokenSet } from 'xero-node';
import Bottleneck from 'bottleneck';

// Rate limiter: 60 requests/minute, max 5 concurrent
const limiter = new Bottleneck({
  reservoir: 60,
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60 * 1000,
  maxConcurrent: 5,
  minTime: 100
});

export interface XeroTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  xeroTenantId: string;
}

export interface TokenUpdateCallback {
  (tokens: { accessToken: string; refreshToken: string; expiresAt: Date }): Promise<void>;
}

export async function createXeroClient(
  tokens: XeroTokens,
  onTokenRefresh?: TokenUpdateCallback
): Promise<{ client: XeroClient; tenantId: string }> {
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [`${process.env.NEXTAUTH_URL}/api/xero/callback`],
    scopes: ['openid', 'profile', 'email', 'accounting.settings', 'accounting.transactions', 'accounting.contacts', 'accounting.reports.read', 'offline_access']
  });

  await xero.initialize();

  // Set existing tokens
  xero.setTokenSet({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: Math.floor(tokens.expiresAt.getTime() / 1000),
    token_type: 'Bearer'
  } as TokenSet);

  // Check if token needs refresh (5 minute buffer)
  const expiresIn = tokens.expiresAt.getTime() - Date.now();
  if (expiresIn < 5 * 60 * 1000) {
    const newTokenSet = await xero.refreshToken();

    if (onTokenRefresh && newTokenSet.access_token && newTokenSet.refresh_token) {
      await onTokenRefresh({
        accessToken: newTokenSet.access_token,
        refreshToken: newTokenSet.refresh_token,
        expiresAt: new Date(newTokenSet.expires_at! * 1000)
      });
    }
  }

  await xero.updateTenants();

  return { client: xero, tenantId: tokens.xeroTenantId };
}

// Rate-limited API call wrapper
export async function xeroApiCall<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  return limiter.schedule(async () => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        if (error?.response?.status === 429 && attempt < retries) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  });
}

// Helper to check if connection needs reauthorization
export function needsReauthorization(error: any): boolean {
  return error?.response?.status === 401 ||
         error?.message?.includes('invalid_grant') ||
         error?.message?.includes('expired');
}
