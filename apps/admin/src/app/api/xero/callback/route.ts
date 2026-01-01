import { NextRequest, NextResponse } from 'next/server';
import { XeroClient } from 'xero-node';
import { accountingConnections } from '@madebuy/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle errors from Xero
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Unknown error';
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings/accounting?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings/accounting?error=missing_params`
    );
  }

  // Decode state to get tenant ID
  let tenantId: string;
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    tenantId = stateData.tenantId;
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings/accounting?error=invalid_state`
    );
  }

  try {
    const xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID!,
      clientSecret: process.env.XERO_CLIENT_SECRET!,
      redirectUris: [`${process.env.NEXTAUTH_URL}/api/xero/callback`],
      scopes: ['openid', 'profile', 'email', 'accounting.settings', 'accounting.transactions', 'accounting.contacts', 'accounting.reports.read', 'offline_access']
    });

    await xero.initialize();

    // Exchange code for tokens
    const tokenSet = await xero.apiCallback(request.nextUrl.toString());

    // Get connected Xero organizations
    await xero.updateTenants();
    const xeroTenant = xero.tenants[0];

    if (!xeroTenant) {
      throw new Error('No Xero organization found');
    }

    // Store connection with default account mappings
    await accountingConnections.createConnection(tenantId, {
      provider: 'xero',
      accessToken: tokenSet.access_token!,
      refreshToken: tokenSet.refresh_token!,
      tokenExpiresAt: new Date(tokenSet.expires_at! * 1000),
      externalTenantId: xeroTenant.tenantId!,
      externalTenantName: xeroTenant.tenantName,
      accountMappings: {
        productSales: '200',
        shippingIncome: '260',
        platformFees: '404',
        paymentFees: '404',
        bankAccount: '090'
      },
      status: 'connected'
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings/accounting?connected=xero`
    );
  } catch (err) {
    console.error('Xero callback error:', err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings/accounting?error=token_exchange_failed`
    );
  }
}
