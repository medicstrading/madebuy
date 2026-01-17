import { media, pieces } from '@madebuy/db'
import type { MediaItem, Piece } from '@madebuy/shared'
import {
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Star,
  Video,
} from 'lucide-react'
import { MediaLibraryClient } from '@/components/media/MediaLibraryClient'
import { PieceFolderHeader } from '@/components/media/PieceFolderHeader'
import { PieceMediaThumbnail } from '@/components/media/PieceMediaThumbnail'
import { UnlinkedMediaGrid } from '@/components/media/UnlinkedMediaGrid'
import { requireTenant } from '@/lib/session'

// Serialize MongoDB document for client components (strip _id, convert dates)
function serializeMedia(item: any): MediaItem {
  const { _id, ...rest } = item
  return {
    ...rest,
    createdAt:
      item.createdAt instanceof Date
        ? item.createdAt.toISOString()
        : item.createdAt,
    updatedAt:
      item.updatedAt instanceof Date
        ? item.updatedAt.toISOString()
        : item.updatedAt,
  } as MediaItem
}

function serializePiece(piece: any): Piece {
  const { _id, ...rest } = piece
  return {
    ...rest,
    createdAt:
      piece.createdAt instanceof Date
        ? piece.createdAt.toISOString()
        : piece.createdAt,
    updatedAt:
      piece.updatedAt instanceof Date
        ? piece.updatedAt.toISOString()
        : piece.updatedAt,
  } as Piece
}

export default async function MediaPage() {
  const tenant = await requireTenant()
  const allMedia = await media.listMedia(tenant.id)
  const allPieces = await pieces.listPieces(tenant.id)

  // Use stored URLs directly - no signed URL generation needed
  // Product images are public (visible on storefronts, social media, etc.)
  // URLs stored in DB are already public (R2 public URL or Unsplash for seed data)
  const serializedMedia = allMedia.map((item) => serializeMedia(item))

  // Create a map for quick media lookup
  const mediaMap = new Map(serializedMedia.map((m) => [m.id, m]))

  // Track which media are linked to pieces
  const linkedMediaIds = new Set<string>()

  // Group media by piece (show ALL pieces, even without media)
  const piecesWithMedia = allPieces.map((piece) => {
    const pieceMedia = (piece.mediaIds || [])
      .map((id) => {
        linkedMediaIds.add(id)
        return mediaMap.get(id)
      })
      .filter((m): m is MediaItem => m !== undefined)

    return {
      piece: serializePiece(piece),
      media: pieceMedia,
      primaryMedia: piece.primaryMediaId
        ? mediaMap.get(piece.primaryMediaId)
        : pieceMedia[0],
    }
  })

  // Unlinked media (orphans)
  const unlinkedMedia = serializedMedia.filter((m) => !linkedMediaIds.has(m.id))

  const stats = {
    total: serializedMedia.length,
    images: serializedMedia.filter((m) => m.type === 'image').length,
    videos: serializedMedia.filter((m) => m.type === 'video').length,
    favorites: serializedMedia.filter((m) => m.isFavorite).length,
    folders: piecesWithMedia.length,
    unlinked: unlinkedMedia.length,
  }

  // Prepare pieces data for client component (serialized)
  const piecesData = allPieces.map((piece) => ({
    piece: serializePiece(piece),
    mediaCount: (piece.mediaIds || []).length,
  }))

  return (
    <MediaLibraryClient piecesData={piecesData}>
      <div className="grid gap-4 sm:grid-cols-6 mb-6">
        <StatCard
          title="Total Files"
          value={stats.total}
          icon={ImageIcon}
          color="blue"
        />
        <StatCard
          title="Images"
          value={stats.images}
          icon={ImageIcon}
          color="green"
        />
        <StatCard
          title="Videos"
          value={stats.videos}
          icon={Video}
          color="purple"
        />
        <StatCard
          title="Favorites"
          value={stats.favorites}
          icon={Star}
          color="yellow"
        />
        <StatCard
          title="Folders"
          value={stats.folders}
          icon={Folder}
          color="indigo"
        />
        <StatCard
          title="Unlinked"
          value={stats.unlinked}
          icon={FolderOpen}
          color="gray"
        />
      </div>

      {serializedMedia.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No media yet
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Use the <strong>Upload Media</strong> button above to add photos and
            videos.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Unlinked Media Section */}
          {unlinkedMedia.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Unlinked Media
                  </h2>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {unlinkedMedia.length}
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Media not yet linked to any inventory piece. Click on media to
                link it to a piece.
              </p>
              <UnlinkedMediaGrid media={unlinkedMedia} />
            </section>
          )}

          {/* Piece Folders */}
          {piecesWithMedia.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Inventory Folders
                  </h2>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {piecesWithMedia.length}
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Each piece in your inventory has its own media folder.
              </p>
              <div className="grid gap-6">
                {piecesWithMedia.map(
                  ({ piece, media: pieceMedia, primaryMedia }) => (
                    <div
                      key={piece.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      {/* Folder Header */}
                      <PieceFolderHeader
                        piece={piece}
                        mediaCount={pieceMedia.length}
                        primaryMedia={primaryMedia}
                      />

                      {/* Media Grid */}
                      {pieceMedia.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                          {pieceMedia.map((item) => (
                            <PieceMediaThumbnail key={item.id} item={item} />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                          <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            No media linked to this piece yet
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Upload media above and link it to this piece
                          </p>
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </section>
          )}

          {/* Empty State */}
          {piecesWithMedia.length === 0 &&
            unlinkedMedia.length === 0 &&
            serializedMedia.length > 0 && (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <Folder className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No organized media
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Link your media to inventory pieces to organize them into
                  folders.
                </p>
              </div>
            )}
        </div>
      )}
    </MediaLibraryClient>
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
  icon: any
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'indigo' | 'gray'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    gray: 'bg-gray-100 text-gray-600',
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
