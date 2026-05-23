export const collections = {
  products: "products",
  pricingConfigs: "pricingConfigs",
  storeLiveStatuses: "storeLiveStatuses",
  branches: "branches",
  devices: "devices",
  tags: "tags",
  menuSettings: "menuSettings"
} as const;

export function pricingConfigId(productId: string, tagId: string) {
  return `${productId}_${tagId}`;
}

export function liveStatusId(branchId: string, productId: string) {
  return `${branchId}_${productId}`;
}

export function normalizeExternalId(value: unknown) {
  return String(value ?? "").trim();
}
