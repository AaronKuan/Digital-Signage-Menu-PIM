export type MenuSize = "M" | "L";

export interface Product {
  id: string;
  name: string;
  englishName?: string;
  category: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  isSignature?: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PricingConfig {
  id: string;
  productId: string;
  tagId: string;
  tagName: string;
  priceM?: number | null;
  priceL?: number | null;
  sortOrder: number;
  isActive: boolean;
  updatedAt?: unknown;
}

export interface BranchTag {
  id: string;
  name: string;
}

export interface CachedBranch {
  id: string;
  externalBranchId: string;
  name: string;
  status?: boolean;
  tags: BranchTag[];
  tagIds: string[];
  syncedAt?: unknown;
  updatedAt?: unknown;
}

export interface CachedDevice {
  id: string;
  externalDeviceId: string;
  externalBranchId: string;
  name?: string;
  status?: boolean;
  syncedAt?: unknown;
  updatedAt?: unknown;
}

export interface StoreLiveStatus {
  id: string;
  branchId: string;
  productId: string;
  isSoldOut: boolean;
  updatedBy?: string;
  updatedAt?: unknown;
  resetAt?: unknown;
}

export interface MenuItem {
  product: Product;
  pricing: PricingConfig;
  isSoldOut: boolean;
}
