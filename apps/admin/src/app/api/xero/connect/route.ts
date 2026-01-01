import { NextResponse } from 'next/server';
import { getCurrentTenant } from '@/lib/session';
import { XeroClient } from 'xero-node';

const xeroScopes = [
  'openid',
  'profile',
  'email',
  'accounting.settings',
  'accounting.transactions',
  'accounting.contacts',
  'accounting.reports.read',
  'offline_access'
].join(' ');

export async function GET() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [`${process.env.NEXTAUTH_URL}/api/xero/callback`],
    scopes: xeroScopes.split(' ')
  });

  await xero.initialize();

  // Store tenant ID in state for callback
  const state = Buffer.from(JSON.stringify({ tenantId: tenant.id })).toString('base64');
  const consentUrl = await xero.buildConsentUrl();

  // Append state to URL
  const urlWithState = `${consentUrl}&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(urlWithState);
}
