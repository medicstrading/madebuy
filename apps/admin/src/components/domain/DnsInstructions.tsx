'use client'

import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { useState } from 'react'

interface DnsInstructionsProps {
  domain: string
  verificationToken: string
  targetCname?: string
}

const REGISTRAR_GUIDES = [
  {
    id: 'godaddy',
    name: 'GoDaddy',
    url: 'https://au.godaddy.com/help/manage-dns-records-680',
    steps: [
      'Log in to GoDaddy → My Products → DNS',
      'Find your domain → Manage DNS',
      'Add the CNAME and TXT records as shown below',
      'Save changes',
    ],
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    url: 'https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/',
    steps: [
      'Log in to Namecheap → Domain List → Manage',
      'Click Advanced DNS tab',
      'Add the CNAME and TXT records as shown below',
      'Save all changes',
    ],
  },
  {
    id: 'crazydomains',
    name: 'Crazy Domains',
    url: 'https://www.crazydomains.com.au/help/dns-management/',
    steps: [
      'Log in to Crazy Domains → My Domains',
      'Click your domain → DNS Settings',
      'Add the CNAME and TXT records as shown below',
      'Save changes',
    ],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    url: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
    steps: [
      'Log in to Cloudflare → Select your domain',
      'Go to DNS → Records',
      'Add the CNAME and TXT records as shown below',
      'Proxy status can be on or off for CNAME',
    ],
  },
  {
    id: 'generic',
    name: 'Other Registrar',
    url: null,
    steps: [
      'Log in to your domain registrar',
      'Find DNS management / DNS settings',
      'Add the CNAME and TXT records as shown below',
      'Save and wait a few minutes',
    ],
  },
]

export function DnsInstructions({
  domain,
  verificationToken,
  targetCname = 'shops.madebuy.com.au',
}: DnsInstructionsProps) {
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  // Determine the name based on whether it's www or root
  const isWww = domain.startsWith('www.')
  const cnameHost = isWww ? 'www' : '@'

  const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), 2000)
  }

  const records = [
    {
      type: 'CNAME',
      name: cnameHost,
      value: targetCname,
      description: 'Points your domain to MadeBuy',
    },
    {
      type: 'TXT',
      name: cnameHost,
      value: `madebuy-verify=${verificationToken}`,
      description: 'Verifies domain ownership',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Simple instruction */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="font-medium text-blue-900 mb-2">
          Add these DNS records
        </h4>
        <p className="text-sm text-blue-800">
          Go to your domain registrar and add these 2 records:
        </p>
      </div>

      {/* DNS Records Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name/Host
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Value/Points to
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Copy
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record, idx) => (
              <tr key={idx}>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      record.type === 'CNAME'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {record.type}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-900">
                  {record.name}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-gray-900 break-all">
                  {record.value}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(record.value)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    title="Copy value"
                  >
                    {copiedValue === record.value ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        {cnameHost === '@'
          ? 'The @ symbol means your root domain. Some registrars use the domain name instead.'
          : 'Use "www" as the hostname/name field.'}
      </p>

      {/* Registrar Guides */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Step-by-step guides
        </h4>
        <div className="space-y-2">
          {REGISTRAR_GUIDES.map((guide) => (
            <div
              key={guide.id}
              className="rounded-lg border border-gray-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedGuide(expandedGuide === guide.id ? null : guide.id)
                }
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{guide.name}</span>
                {expandedGuide === guide.id ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {expandedGuide === guide.id && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    {guide.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                  {guide.url && (
                    <a
                      href={guide.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View {guide.name} DNS guide
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timing notice */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">
          <strong>DNS changes usually take 15 minutes to 48 hours.</strong> We
          will check automatically and notify you when your domain is ready.
        </p>
      </div>
    </div>
  )
}
