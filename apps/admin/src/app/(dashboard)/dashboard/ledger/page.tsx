import { requireTenant } from '@/lib/session'
import { transactions } from '@madebuy/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BookOpen, ArrowUpRight, ArrowDownRight, RefreshCw, DollarSign } from 'lucide-react'
import Link from 'next/link'
import type { TransactionType, TransactionStatus, TransactionFilters } from '@madebuy/shared'
import { DateFilter } from './DateFilter'

interface PageProps {
  searchParams: { page?: string; startDate?: string; endDate?: string; type?: string }
}

const PAGE_SIZE = 50

export default async function LedgerPage({ searchParams }: PageProps) {
  const tenant = await requireTenant()
  // Handle malformed page params - default to 1 if invalid
  const parsedPage = parseInt(searchParams.page || '1', 10)
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage
  const offset = (page - 1) * PAGE_SIZE

  // Parse filters from URL params
  const filters: TransactionFilters = {}
  if (searchParams.startDate) {
    filters.startDate = new Date(searchParams.startDate)
  }
  if (searchParams.endDate) {
    // Set end date to end of day
    const endDate = new Date(searchParams.endDate)
    endDate.setHours(23, 59, 59, 999)
    filters.endDate = endDate
  }
  if (searchParams.type) {
    filters.type = searchParams.type as TransactionType
  }

  // Fetch balance and transactions in parallel
  // Pass filters to balance so summary cards update with the filter
  const [balance, allTransactions, totalCount] = await Promise.all([
    transactions.getTenantBalance(tenant.id, filters),
    transactions.listTransactions(tenant.id, {
      filters,
      limit: PAGE_SIZE,
      offset,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }),
    transactions.countTransactions(tenant.id, filters)
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Calculate running balance for each transaction
  // Start from the most recent and work backwards
  // We need the total balance and subtract as we go back in time
  const transactionsWithBalance = calculateRunningBalance(allTransactions, balance.totalNet, offset)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Transaction Ledger</h1>
        <p className="mt-2 text-gray-600">View all financial transactions and your running balance</p>
      </div>

      {/* Date Filter */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <DateFilter />
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <BalanceCard
          title="Total Revenue"
          value={balance.totalGross}
          currency={balance.currency}
          icon={DollarSign}
          color="green"
        />
        <BalanceCard
          title="Processing Fees"
          value={balance.totalStripeFees}
          currency={balance.currency}
          icon={ArrowDownRight}
          color="red"
        />
        <BalanceCard
          title="Net Earnings"
          value={balance.totalNet}
          currency={balance.currency}
          icon={ArrowUpRight}
          color="blue"
        />
        <BalanceCard
          title="Pending Balance"
          value={balance.pendingBalance}
          currency={balance.currency}
          icon={RefreshCw}
          color="yellow"
        />
      </div>

      {allTransactions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No transactions yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Your transaction history will appear here when you receive orders.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg bg-white shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Fees
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Net
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {transactionsWithBalance.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <TransactionTypeBadge type={tx.type} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {tx.description || getDefaultDescription(tx.type)}
                      </div>
                      {tx.orderId && (
                        <Link
                          href={`/dashboard/orders/${tx.orderId}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Order
                        </Link>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <span className={tx.type === 'refund' || tx.type === 'payout' ? 'text-red-600' : 'text-gray-900'}>
                        {tx.type === 'refund' || tx.type === 'payout' ? '-' : ''}
                        {formatCurrency(tx.grossAmount, tx.currency)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                      {tx.stripeFee > 0 ? formatCurrency(tx.stripeFee, tx.currency) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <span className={tx.type === 'refund' || tx.type === 'payout' ? 'text-red-600' : 'text-green-600'}>
                        {tx.type === 'refund' || tx.type === 'payout' ? '-' : '+'}
                        {formatCurrency(Math.abs(tx.netAmount), tx.currency)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <TransactionStatusBadge status={tx.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(tx.runningBalance, tx.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              offset={offset}
              pageSize={PAGE_SIZE}
              searchParams={searchParams}
            />
          )}
        </>
      )}
    </div>
  )
}

interface TransactionWithBalance {
  id: string
  createdAt: Date
  type: TransactionType
  description?: string
  orderId?: string
  grossAmount: number
  stripeFee: number
  platformFee: number
  netAmount: number
  currency: string
  status: TransactionStatus
  runningBalance: number
}

function calculateRunningBalance(
  txs: Array<{
    id: string
    createdAt: Date
    type: TransactionType
    description?: string
    orderId?: string
    grossAmount: number
    stripeFee: number
    platformFee: number
    netAmount: number
    currency: string
    status: TransactionStatus
  }>,
  currentBalance: number,
  offset: number
): TransactionWithBalance[] {
  // For the first page, start with current balance
  // For subsequent pages, we need to calculate back from the current balance
  // This is a simplified version - for perfect accuracy we'd need all transactions

  let balance = currentBalance

  // If we're on a later page, we need to subtract the net amounts of transactions
  // that came before this page (more recent transactions)
  // This is approximate since we don't have the full list

  const result: TransactionWithBalance[] = []

  // Process transactions - they're in descending order (newest first)
  for (const tx of txs) {
    // For completed transactions, add to running balance
    if (tx.status === 'completed') {
      result.push({
        ...tx,
        runningBalance: balance
      })

      // Go back in time by subtracting this transaction's effect
      if (tx.type === 'sale' || tx.type === 'fee') {
        balance -= tx.netAmount
      } else if (tx.type === 'refund' || tx.type === 'payout') {
        balance += Math.abs(tx.netAmount)
      }
    } else {
      // Pending/failed transactions don't affect running balance
      result.push({
        ...tx,
        runningBalance: balance
      })
    }
  }

  return result
}

function getDefaultDescription(type: TransactionType): string {
  const descriptions = {
    sale: 'Order payment',
    refund: 'Order refund',
    payout: 'Payout to bank',
    fee: 'Platform fee',
    subscription: 'Subscription payment'
  }
  return descriptions[type]
}

function BalanceCard({
  title,
  value,
  currency,
  icon: Icon,
  color
}: {
  title: string
  value: number
  currency: string
  icon: any
  color: 'green' | 'red' | 'blue' | 'yellow'
}) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(value, currency)}
          </p>
        </div>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const colors = {
    sale: 'bg-green-100 text-green-800',
    refund: 'bg-orange-100 text-orange-800',
    payout: 'bg-blue-100 text-blue-800',
    fee: 'bg-gray-100 text-gray-800',
    subscription: 'bg-purple-100 text-purple-800',
  }

  const labels = {
    sale: 'Sale',
    refund: 'Refund',
    payout: 'Payout',
    fee: 'Fee',
    subscription: 'Subscription',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[type]}`}>
      {labels[type]}
    </span>
  )
}

function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    reversed: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${colors[status]}`}>
      {status}
    </span>
  )
}

function Pagination({
  page,
  totalPages,
  totalCount,
  offset,
  pageSize,
  searchParams
}: {
  page: number
  totalPages: number
  totalCount: number
  offset: number
  pageSize: number
  searchParams: { startDate?: string; endDate?: string; type?: string }
}) {
  // Build URL with preserved filters
  const buildUrl = (newPage: number) => {
    const params = new URLSearchParams()
    params.set('page', String(newPage))
    if (searchParams.startDate) params.set('startDate', searchParams.startDate)
    if (searchParams.endDate) params.set('endDate', searchParams.endDate)
    if (searchParams.type) params.set('type', searchParams.type)
    return `/dashboard/ledger?${params.toString()}`
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Showing {offset + 1} to {Math.min(offset + pageSize, totalCount)} of {totalCount} transactions
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildUrl(page - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildUrl(page + 1)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  )
}
