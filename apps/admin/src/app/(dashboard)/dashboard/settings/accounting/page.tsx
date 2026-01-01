'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link2, Unlink, RefreshCw, CheckCircle, AlertCircle, Settings } from 'lucide-react';

interface AccountOption {
  code: string;
  name: string;
  type: string;
}

interface AccountGroups {
  revenue: AccountOption[];
  expense: AccountOption[];
  bank: AccountOption[];
}

interface ConnectionStatus {
  mappings: {
    productSales: string;
    shippingIncome: string;
    platformFees: string;
    paymentFees: string;
    bankAccount: string;
  };
  lastSyncAt: string | null;
  status: 'connected' | 'needs_reauth' | 'error' | 'disconnected';
}

export default function AccountingSettingsPage() {
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [accounts, setAccounts] = useState<AccountGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mappings, setMappings] = useState({
    productSales: '',
    shippingIncome: '',
    platformFees: '',
    paymentFees: '',
    bankAccount: ''
  });

  const connected = searchParams.get('connected');
  const error = searchParams.get('error');

  useEffect(() => {
    loadConnection();
  }, []);

  async function loadConnection() {
    try {
      const res = await fetch('/api/xero/mappings');
      if (res.ok) {
        const data = await res.json();
        setConnection(data);
        setMappings(data.mappings);
        // Load accounts if connected
        const accountsRes = await fetch('/api/xero/accounts');
        if (accountsRes.ok) {
          setAccounts(await accountsRes.json());
        }
      }
    } catch (err) {
      // Not connected
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Xero? This will stop syncing transactions.')) return;

    await fetch('/api/xero/disconnect', { method: 'POST' });
    setConnection(null);
    setAccounts(null);
  }

  async function handleSaveMappings() {
    setSaving(true);
    try {
      const res = await fetch('/api/xero/mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappings)
      });
      if (res.ok) {
        alert('Mappings saved');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch('/api/xero/sync', { method: 'POST' });
      await loadConnection();
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Accounting Integration</h1>

      {/* Status messages */}
      {connected === 'xero' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
          <CheckCircle className="w-5 h-5" />
          Successfully connected to Xero
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          Connection failed: {error}
        </div>
      )}

      {/* Xero Connection Card */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#13B5EA] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">X</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Xero</h2>
              <p className="text-sm text-gray-500">
                {connection ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>

          {connection ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync Now
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 hover:bg-red-50"
              >
                <Unlink className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/api/xero/connect"
              className="px-4 py-2 bg-[#13B5EA] text-white rounded-lg flex items-center gap-2 hover:bg-[#0ea5d3]"
            >
              <Link2 className="w-4 h-4" />
              Connect Xero
            </a>
          )}
        </div>

        {connection?.lastSyncAt && (
          <p className="text-sm text-gray-500">
            Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Account Mappings */}
      {connection && accounts && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Account Mappings</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Map MadeBuy transactions to your Xero chart of accounts
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product Sales</label>
              <select
                value={mappings.productSales}
                onChange={(e) => setMappings({ ...mappings, productSales: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select account...</option>
                {accounts.revenue.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Shipping Income</label>
              <select
                value={mappings.shippingIncome}
                onChange={(e) => setMappings({ ...mappings, shippingIncome: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select account...</option>
                {accounts.revenue.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Platform Fees</label>
              <select
                value={mappings.platformFees}
                onChange={(e) => setMappings({ ...mappings, platformFees: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select account...</option>
                {accounts.expense.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Payment Processing Fees</label>
              <select
                value={mappings.paymentFees}
                onChange={(e) => setMappings({ ...mappings, paymentFees: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select account...</option>
                {accounts.expense.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Bank Account</label>
              <select
                value={mappings.bankAccount}
                onChange={(e) => setMappings({ ...mappings, bankAccount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select account...</option>
                {accounts.bank.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveMappings}
              disabled={saving}
              className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Mappings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
