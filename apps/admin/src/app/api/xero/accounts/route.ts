import { NextResponse } from 'next/server';
import { getCurrentTenant } from '@/lib/session';
import { accountingConnections } from '@madebuy/db';
import { createXeroClient, xeroApiCall, type TokenUpdateCallback } from '@madebuy/shared';
import type { Account } from 'xero-node';

interface XeroAccount {
  code: string | undefined;
  name: string | undefined;
  type: string | undefined;
  description: string | undefined;
}

// GET - Fetch chart of accounts from Xero
export async function GET() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connection = await accountingConnections.getConnection(tenant.id, 'xero');
  if (!connection) {
    return NextResponse.json({ error: 'Xero not connected' }, { status: 400 });
  }

  try {
    const onTokenRefresh: TokenUpdateCallback = async (tokens) => {
      await accountingConnections.updateConnection(tenant.id, 'xero', {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt
      });
    };

    const { client, tenantId } = await createXeroClient({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.tokenExpiresAt,
      xeroTenantId: connection.externalTenantId
    }, onTokenRefresh);

    const response = await xeroApiCall(() =>
      client.accountingApi.getAccounts(tenantId)
    );

    // Filter to relevant account types and format for UI
    const accounts: XeroAccount[] = (response.body.accounts || [])
      .filter((acc: Account) => ['REVENUE', 'EXPENSE', 'DIRECTCOSTS', 'BANK', 'CURRENT'].includes(acc.type as string))
      .map((acc: Account) => ({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        description: acc.description
      }));

    // Group by type for easier UI rendering
    const grouped = {
      revenue: accounts.filter((a: XeroAccount) => a.type === 'REVENUE'),
      expense: accounts.filter((a: XeroAccount) => ['EXPENSE', 'DIRECTCOSTS'].includes(a.type as string)),
      bank: accounts.filter((a: XeroAccount) => ['BANK', 'CURRENT'].includes(a.type as string))
    };

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Xero accounts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}
