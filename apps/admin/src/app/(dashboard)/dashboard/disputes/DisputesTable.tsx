'use client'

import type { Dispute } from '@madebuy/shared'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  HelpCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react'

interface DisputesTableProps {
  disputes: Dispute[]
}

/**
 * DisputesTable - Client component displaying dispute records
 *
 * Key behaviors:
 * - Shows dispute amount, reason, status, and evidence deadline
 * - Status badges indicate urgency
 * - Links directly to Stripe Dashboard for responding
 */
export function DisputesTable({ disputes }: DisputesTableProps) {
  return (
    <div className="rounded-lg bg-white shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Reason
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Evidence Due
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {disputes.map((dispute) => (
            <tr key={dispute.id} className="hover:bg-gray-50 group">
              <td className="whitespace-nowrap px-6 py-4">
                <div className="text-sm font-semibold text-gray-900">
                  {formatCurrency(dispute.amount, dispute.currency)}
                </div>
                {dispute.orderId && (
                  <div className="text-xs text-gray-500">Order linked</div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <ReasonIcon reason={dispute.reason} />
                  <span className="text-sm text-gray-900">
                    {formatReason(dispute.reason)}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <DisputeStatusBadge status={dispute.status} />
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                {dispute.evidenceDueBy ? (
                  <div
                    className={`text-sm ${isUrgent(dispute.evidenceDueBy) ? 'text-red-600 font-semibold' : 'text-gray-700'}`}
                  >
                    {formatDate(dispute.evidenceDueBy)}
                    {isUrgent(dispute.evidenceDueBy) && (
                      <span className="ml-1 text-xs">(Soon!)</span>
                    )}
                  </div>
                ) : dispute.resolvedAt ? (
                  <span className="text-sm text-gray-500">Resolved</span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {formatDate(dispute.createdAt)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <a
                  href={`https://dashboard.stripe.com/disputes/${dispute.stripeDisputeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    dispute.status === 'needs_response'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {dispute.status === 'needs_response' ? 'Respond' : 'View'}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DisputeStatusBadge({ status }: { status: Dispute['status'] }) {
  const config = {
    needs_response: {
      label: 'Needs Response',
      classes: 'bg-red-100 text-red-800 border border-red-200',
      icon: AlertTriangle,
    },
    under_review: {
      label: 'Under Review',
      classes: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      icon: Clock,
    },
    won: {
      label: 'Won',
      classes: 'bg-green-100 text-green-800 border border-green-200',
      icon: CheckCircle,
    },
    lost: {
      label: 'Lost',
      classes: 'bg-gray-100 text-gray-800 border border-gray-200',
      icon: XCircle,
    },
    charge_refunded: {
      label: 'Refunded',
      classes: 'bg-blue-100 text-blue-800 border border-blue-200',
      icon: RefreshCw,
    },
    warning_closed: {
      label: 'Warning Closed',
      classes: 'bg-gray-100 text-gray-600 border border-gray-200',
      icon: CheckCircle,
    },
  }

  const { label, classes, icon: Icon } = config[status] || config.needs_response

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function ReasonIcon({ reason }: { reason: Dispute['reason'] }) {
  // Show warning for high-risk reasons
  const highRisk = ['fraudulent', 'unrecognized', 'product_not_received']
  if (highRisk.includes(reason)) {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />
  }
  return <HelpCircle className="h-4 w-4 text-gray-400" />
}

function formatReason(reason: Dispute['reason']): string {
  const labels: Record<Dispute['reason'], string> = {
    bank_cannot_process: 'Bank cannot process',
    credit_not_processed: 'Credit not processed',
    customer_initiated: 'Customer initiated',
    debit_not_authorized: 'Debit not authorized',
    duplicate: 'Duplicate charge',
    fraudulent: 'Fraudulent',
    general: 'General',
    incorrect_account_details: 'Incorrect account',
    insufficient_funds: 'Insufficient funds',
    product_not_received: 'Product not received',
    product_unacceptable: 'Product unacceptable',
    subscription_canceled: 'Subscription canceled',
    unrecognized: 'Unrecognized',
  }
  return labels[reason] || reason
}

function formatCurrency(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isUrgent(dueDate: Date | string): boolean {
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const now = new Date()
  const daysUntilDue = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return daysUntilDue <= 3 && daysUntilDue >= 0
}
