import type { Order } from '@madebuy/shared'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PackingSlipProps {
  order: Order
  tenant: {
    businessName: string
    location?: string
    phone?: string
    email: string
  }
}

export function PackingSlip({ order, tenant }: PackingSlipProps) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page {
              margin: 1cm;
              size: A4;
            }

            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .no-print {
              display: none !important;
            }

            .packing-slip {
              max-width: none;
              margin: 0;
              padding: 0;
            }
          }
        `,
        }}
      />
      <div className="packing-slip">
        <div className="max-w-4xl mx-auto p-8 bg-white">
          {/* Header */}
          <div className="border-b-2 border-gray-900 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  PACKING SLIP
                </h1>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-semibold text-lg">{tenant.businessName}</p>
                  {tenant.location && <p>{tenant.location}</p>}
                  {tenant.phone && <p>Phone: {tenant.phone}</p>}
                  {tenant.email && <p>Email: {tenant.email}</p>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-semibold">Order:</span>{' '}
                    {order.orderNumber}
                  </p>
                  <p>
                    <span className="font-semibold">Date:</span>{' '}
                    {formatDate(order.createdAt)}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span>{' '}
                    <span className="capitalize">{order.status}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Ship To */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Ship To
            </h2>
            <div className="text-sm">
              <p className="font-semibold text-base mb-1">
                {order.customerName}
              </p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && (
                <p>{order.shippingAddress.line2}</p>
              )}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postcode}
              </p>
              <p className="font-medium">{order.shippingAddress.country}</p>
              {order.customerPhone && (
                <p className="mt-2">Phone: {order.customerPhone}</p>
              )}
            </div>
          </div>

          {/* Shipping Method */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Shipping Method
            </h2>
            <div className="text-sm">
              <p className="font-semibold">{order.shippingMethod}</p>
              <p className="text-gray-600 capitalize">{order.shippingType}</p>
              {order.trackingNumber && (
                <p className="mt-2">
                  <span className="font-semibold">Tracking:</span>{' '}
                  {order.trackingNumber}
                </p>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Items to Pack
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-2 font-semibold">Product</th>
                  <th className="text-center py-2 font-semibold w-20">Qty</th>
                  <th className="text-left py-2 font-semibold">Details</th>
                  <th className="text-center py-2 font-semibold w-16">
                    <input type="checkbox" className="no-print" disabled />
                    <span className="sr-only">Packed</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3">
                      <div className="font-medium">{item.name}</div>
                      {item.category && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.category}
                        </div>
                      )}
                    </td>
                    <td className="text-center py-3">
                      <span className="inline-flex items-center justify-center w-10 h-10 border-2 border-gray-900 rounded font-bold">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-3">
                      {item.variantAttributes &&
                        Object.keys(item.variantAttributes).length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs font-semibold text-gray-700 mb-1">
                              Variant:
                            </div>
                            <div className="text-xs text-gray-600">
                              {Object.entries(item.variantAttributes).map(
                                ([key, value]) => (
                                  <div key={key}>
                                    {key}:{' '}
                                    <span className="font-medium">{value}</span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {item.personalizations &&
                        item.personalizations.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                            <div className="text-xs font-semibold text-yellow-900 mb-1">
                              ⚠️ PERSONALIZATION REQUIRED:
                            </div>
                            <div className="text-xs text-gray-800 space-y-1">
                              {item.personalizations.map((p, idx) => (
                                <div key={idx}>
                                  <span className="font-semibold">
                                    {p.fieldName}:
                                  </span>{' '}
                                  {typeof p.value === 'boolean'
                                    ? p.value
                                      ? 'Yes'
                                      : 'No'
                                    : String(p.value)}
                                  {p.fileUrl && (
                                    <div className="mt-1 text-blue-600">
                                      File: {p.fileUrl}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        className="w-6 h-6 no-print"
                        aria-label="Mark as packed"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {(order.customerNotes || order.adminNotes) && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
                Handling Notes
              </h2>
              {order.customerNotes && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs font-semibold text-blue-900 mb-1">
                    Customer Notes:
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {order.customerNotes}
                  </p>
                </div>
              )}
              {order.adminNotes && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <p className="text-xs font-semibold text-orange-900 mb-1">
                    Admin Notes:
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {order.adminNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-300">
            <div className="grid grid-cols-3 gap-8 text-sm">
              <div>
                <p className="font-semibold mb-2">Packed By:</p>
                <div className="border-b border-gray-400 h-8 mt-4" />
                <p className="text-xs text-gray-500 mt-1">Signature</p>
              </div>
              <div>
                <p className="font-semibold mb-2">Date Packed:</p>
                <div className="border-b border-gray-400 h-8 mt-4" />
                <p className="text-xs text-gray-500 mt-1">Date</p>
              </div>
              <div>
                <p className="font-semibold mb-2">Items Verified:</p>
                <div className="border-b border-gray-400 h-8 mt-4" />
                <p className="text-xs text-gray-500 mt-1">Checked By</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-8 text-right text-sm text-gray-600">
            <p>
              Total Items:{' '}
              {order.items.reduce((sum, item) => sum + item.quantity, 0)}
            </p>
            <p className="font-semibold text-gray-900">
              Order Total: {formatCurrency(order.total, order.currency)}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
