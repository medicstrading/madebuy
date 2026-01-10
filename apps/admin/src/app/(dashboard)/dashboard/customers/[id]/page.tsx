'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ShoppingCart,
  MapPin,
  Tag,
  Save,
  Trash2,
  MailCheck,
  MailX
} from 'lucide-react'
import type { CustomerWithOrders } from '@madebuy/shared'

export default function CustomerDetailPage() {
  const params = useParams()
  const customerId = params?.id as string | undefined
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerWithOrders | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
    tags: '',
    emailSubscribed: true,
  })

  useEffect(() => {
    if (customerId) fetchCustomer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  async function fetchCustomer() {
    if (!customerId) return
    try {
      const res = await fetch(`/api/customers/${customerId}?includeOrders=true`)
      const data = await res.json()

      if (data.customer) {
        setCustomer(data.customer)
        setFormData({
          name: data.customer.name || '',
          phone: data.customer.phone || '',
          notes: data.customer.notes || '',
          tags: (data.customer.tags || []).join(', '),
          emailSubscribed: data.customer.emailSubscribed ?? true,
        })
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!customerId) return
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update customer')
      }

      fetchCustomer()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!customerId) return
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return
    }

    try {
      await fetch(`/api/customers/${customerId}`, { method: 'DELETE' })
      router.push('/dashboard/customers')
    } catch (error) {
      console.error('Failed to delete customer:', error)
    }
  }

  function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Customer not found</h2>
        <Link href="/dashboard/customers" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to customers
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/customers"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-500">{customer.email}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete customer"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm">Orders</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{customer.totalOrders}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total Spent</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(customer.totalSpent)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Avg Order</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(customer.averageOrderValue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Customer Since</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {new Date(customer.createdAt).toLocaleDateString('en-AU', {
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Orders */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Order History</h2>
            </div>
            {customer.orders && customer.orders.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {customer.orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        Order #{order.orderNumber || order.id.slice(-6)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()} · {order.itemCount} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(order.total)}</p>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          order.status === 'delivered' || order.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No orders yet
              </div>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <div className="space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Customer Details</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(04) xxx xxx xxx"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="VIP, Wholesale, etc."
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Internal notes about this customer..."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, emailSubscribed: !formData.emailSubscribed })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  formData.emailSubscribed
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                {formData.emailSubscribed ? (
                  <>
                    <MailCheck className="h-4 w-4" />
                    Subscribed
                  </>
                ) : (
                  <>
                    <MailX className="h-4 w-4" />
                    Unsubscribed
                  </>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Contact Information</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                  {customer.email}
                </a>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
            </div>

            {customer.addresses && customer.addresses.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Addresses</h3>
                <div className="space-y-3">
                  {customer.addresses.map((address) => (
                    <div key={address.id} className="flex items-start gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        {address.label && (
                          <span className="text-xs font-medium text-gray-500 uppercase">{address.label}</span>
                        )}
                        <p className="text-gray-700">{address.line1}</p>
                        {address.line2 && <p className="text-gray-700">{address.line2}</p>}
                        <p className="text-gray-700">
                          {address.city}, {address.state} {address.postcode}
                        </p>
                        <p className="text-gray-500">{address.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
