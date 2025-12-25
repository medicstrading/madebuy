/**
 * Promotion - Discount codes and promotional campaigns
 */
export interface Promotion {
    id: string;
    tenantId: string;
    name: string;
    code?: string;
    type: PromotionType;
    value: number;
    minPurchaseAmount?: number;
    maxUses?: number;
    maxUsesPerCustomer?: number;
    applicableCategories?: string[];
    applicablePieceIds?: string[];
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
    timesUsed: number;
    createdAt: Date;
    updatedAt: Date;
}
export type PromotionType = 'percentage' | 'fixed_amount' | 'free_shipping';
export interface CreatePromotionInput {
    name: string;
    code?: string;
    type: PromotionType;
    value: number;
    minPurchaseAmount?: number;
    maxUses?: number;
    maxUsesPerCustomer?: number;
    applicableCategories?: string[];
    applicablePieceIds?: string[];
    startDate: Date;
    endDate?: Date;
    isActive?: boolean;
}
export interface UpdatePromotionInput {
    name?: string;
    code?: string;
    type?: PromotionType;
    value?: number;
    minPurchaseAmount?: number;
    maxUses?: number;
    maxUsesPerCustomer?: number;
    applicableCategories?: string[];
    applicablePieceIds?: string[];
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
}
export interface PromotionFilters {
    isActive?: boolean;
    code?: string;
    search?: string;
}
