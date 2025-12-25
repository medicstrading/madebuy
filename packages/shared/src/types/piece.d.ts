/**
 * Piece - Product/inventory item
 */
import type { MediaItem } from './media';
export interface EtsyListingIntegration {
    listingId: string;
    listingUrl: string;
    state: 'draft' | 'active' | 'inactive' | 'sold_out' | 'expired';
    lastSyncedAt: Date;
    etsyQuantity: number;
    syncEnabled: boolean;
}

export interface PieceIntegrations {
    etsy?: EtsyListingIntegration;
}

export interface Piece {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    description?: string;
    stones: string[];
    metals: string[];
    techniques: string[];
    dimensions?: string;
    weight?: string;
    chainLength?: string;
    price?: number;
    currency: string;
    cogs?: number;
    stock?: number;
    status: PieceStatus;
    mediaIds: string[];
    primaryMediaId?: string;
    socialVideos?: SocialVideo[];
    integrations?: PieceIntegrations;
    isFeatured: boolean;
    category: string;
    tags: string[];
    isPublishedToWebsite: boolean;
    websiteSlug?: string;
    viewCount?: number;
    createdAt: Date;
    updatedAt: Date;
    soldAt?: Date;
    soldTo?: {
        name?: string;
        email?: string;
        note?: string;
    };
}
export type PieceStatus = 'draft' | 'available' | 'reserved' | 'sold';
export interface SocialVideo {
    platform: 'tiktok' | 'instagram' | 'youtube';
    url: string;
    embedUrl: string;
    videoId?: string;
}
export interface CreatePieceInput {
    name: string;
    description?: string;
    stones?: string[];
    metals?: string[];
    techniques?: string[];
    dimensions?: string;
    weight?: string;
    chainLength?: string;
    price?: number;
    currency?: string;
    stock?: number;
    category?: string;
    tags?: string[];
    status?: PieceStatus;
    isFeatured?: boolean;
}
export interface UpdatePieceInput extends Partial<CreatePieceInput> {
    status?: PieceStatus;
    isFeatured?: boolean;
    mediaIds?: string[];
    primaryMediaId?: string;
    socialVideoUrls?: string[];
    isPublishedToWebsite?: boolean;
    websiteSlug?: string;
    soldTo?: Piece['soldTo'];
    integrations?: PieceIntegrations;
}
export interface PieceFilters {
    status?: PieceStatus | PieceStatus[];
    category?: string | string[];
    tags?: string[];
    isFeatured?: boolean;
    isPublishedToWebsite?: boolean;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
}
export interface PieceListOptions extends PieceFilters {
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'name';
    sortOrder?: 'asc' | 'desc';
}
/**
 * PieceWithMedia - Piece with populated media objects
 * Used in web app for displaying pieces with images
 */
export interface PieceWithMedia extends Piece {
    primaryImage?: MediaItem;
    allImages: MediaItem[];
    materials?: string[];
}
