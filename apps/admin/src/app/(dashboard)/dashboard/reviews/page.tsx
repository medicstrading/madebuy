import { requireTenant } from '@/lib/session'
import { reviews } from '@madebuy/db'
import { formatDate } from '@/lib/utils'
import { Star, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { Review, ReviewStatus } from '@madebuy/shared'

interface PageProps {
  searchParams: { status?: string; page?: string }
}

const PAGE_SIZE = 20

export default async function ReviewsPage({ searchParams }: PageProps) {
  const tenant = await requireTenant()
  const statusFilter = searchParams.status as ReviewStatus | undefined
  const page = parseInt(searchParams.page || '1', 10)
  const offset = (page - 1) * PAGE_SIZE

  // Fetch reviews with optional status filter
  const [allReviews, pendingCount] = await Promise.all([
    reviews.listReviews(tenant.id, {
      filters: statusFilter ? { status: statusFilter } : undefined,
      limit: PAGE_SIZE,
      offset,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    reviews.getPendingReviewCount(tenant.id),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
        <p className="mt-2 text-gray-600">Moderate customer reviews for your products</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          title="Pending Review"
          value={pendingCount}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Approved"
          value={0}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Rejected"
          value={0}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Status Filter */}
      <div className="mb-6 flex gap-2">
        <StatusFilterLink status={undefined} current={statusFilter} label="All" />
        <StatusFilterLink status="pending" current={statusFilter} label="Pending" />
        <StatusFilterLink status="approved" current={statusFilter} label="Approved" />
        <StatusFilterLink status="rejected" current={statusFilter} label="Rejected" />
      </div>

      {allReviews.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No reviews yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Customer reviews will appear here when customers leave feedback on their purchases.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'yellow' | 'green' | 'red'
}) {
  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function StatusFilterLink({
  status,
  current,
  label,
}: {
  status: ReviewStatus | undefined
  current: ReviewStatus | undefined
  label: string
}) {
  const isActive = status === current
  const href = status ? `/dashboard/reviews?status=${status}` : '/dashboard/reviews'

  return (
    <a
      href={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </a>
  )
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <StarRating rating={review.rating} />
            <ReviewStatusBadge status={review.status} />
            {review.isVerifiedPurchase && (
              <span className="text-xs text-green-600 font-medium">Verified Purchase</span>
            )}
          </div>

          {review.title && (
            <h3 className="mt-2 text-lg font-medium text-gray-900">{review.title}</h3>
          )}

          <p className="mt-2 text-gray-700">{review.text}</p>

          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <span>{review.customerName}</span>
            <span>&middot;</span>
            <span>{formatDate(review.createdAt)}</span>
          </div>

          {review.photos && review.photos.length > 0 && (
            <div className="mt-4 flex gap-2">
              {review.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="h-16 w-16 rounded-lg bg-gray-100 overflow-hidden"
                >
                  {/* Photo thumbnail */}
                </div>
              ))}
            </div>
          )}

          {review.sellerResponse && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">Your Response:</p>
              <p className="mt-1 text-sm text-gray-600">{review.sellerResponse}</p>
            </div>
          )}
        </div>

        {review.status === 'pending' && (
          <div className="ml-4 flex flex-col gap-2">
            <form action={`/api/reviews/${review.id}/moderate`} method="POST">
              <input type="hidden" name="status" value="approved" />
              <button
                type="submit"
                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
            </form>
            <form action={`/api/reviews/${review.id}/moderate`} method="POST">
              <input type="hidden" name="status" value="rejected" />
              <button
                type="submit"
                className="flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${colors[status]}`}
    >
      {status}
    </span>
  )
}
