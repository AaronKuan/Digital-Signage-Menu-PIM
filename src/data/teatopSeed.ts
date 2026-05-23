import type { CachedBranch, CachedDevice, PricingConfig, Product } from "../lib/types";
import { pricingConfigId } from "../lib/firestore";

export const teatopNorthTag = {
  id: "1",
  name: "北北基宜花 / 北部菜單"
};

export const teatopDemoBranch: CachedBranch = {
  id: "1001",
  externalBranchId: "1001",
  name: "TEA TOP 北部示範店",
  status: true,
  tags: [teatopNorthTag],
  tagIds: [teatopNorthTag.id]
};

export const teatopDemoDevice: CachedDevice = {
  id: "9001",
  externalDeviceId: "9001",
  externalBranchId: teatopDemoBranch.externalBranchId,
  name: "示範看板設備",
  status: true
};

export const teatopProducts: Product[] = [
  {
    id: "contemporary-double-q",
    name: "當代雙Q",
    englishName: "Double Q Milk Tea",
    category: "招牌推薦",
    description: "珍珠與Q彈配料搭配奶茶，是看板主打品項。",
    isActive: true,
    isSignature: true,
    sortOrder: 10
  },
  {
    id: "alpine-green-tea-3q",
    name: "青茶3Q",
    englishName: "Alpine Green Tea 3Q",
    category: "招牌推薦",
    description: "青茶搭配三種口感配料，適合放在主視覺區。",
    isActive: true,
    isSignature: true,
    sortOrder: 20
  },
  {
    id: "brown-sugar-pearl-fresh-milk",
    name: "黑糖珍珠鮮奶",
    englishName: "Brown Sugar Pearl Fresh Milk",
    category: "招牌推薦",
    isActive: true,
    isSignature: true,
    sortOrder: 30
  },
  {
    id: "double-q-fresh-milk-tea",
    name: "雙Q鮮奶茶",
    englishName: "Double Q Fresh Milk Tea",
    category: "招牌推薦",
    isActive: true,
    isSignature: true,
    sortOrder: 40
  },
  {
    id: "darjeeling-black-tea",
    name: "大吉嶺紅茶",
    englishName: "Darjeeling Black Tea",
    category: "品味好茶",
    isActive: true,
    sortOrder: 110
  },
  {
    id: "alpine-green-tea",
    name: "高山青茶",
    englishName: "Alpine Green Tea",
    category: "品味好茶",
    isActive: true,
    sortOrder: 120
  },
  {
    id: "sun-moon-lake-black-tea",
    name: "日月潭紅茶",
    englishName: "Sun Moon Lake Black Tea",
    category: "品味好茶",
    isActive: true,
    sortOrder: 130
  },
  {
    id: "four-seasons-green-tea",
    name: "四季春青茶",
    englishName: "Four Seasons Green Tea",
    category: "品味好茶",
    isActive: true,
    sortOrder: 140
  },
  {
    id: "pearl-milk-tea",
    name: "珍珠奶茶",
    englishName: "Pearl Milk Tea",
    category: "香醇奶茶",
    isActive: true,
    sortOrder: 210
  },
  {
    id: "grass-jelly-milk-tea",
    name: "仙草凍奶茶",
    englishName: "Grass Jelly Milk Tea",
    category: "香醇奶茶",
    isActive: true,
    sortOrder: 220
  },
  {
    id: "taro-milk-tea",
    name: "芋香奶茶",
    englishName: "Taro Milk Tea",
    category: "香醇奶茶",
    isActive: true,
    sortOrder: 230
  },
  {
    id: "jasmine-milk-green-tea",
    name: "茉香奶綠",
    englishName: "Jasmine Milk Green Tea",
    category: "香醇奶茶",
    isActive: true,
    sortOrder: 240
  },
  {
    id: "pearl-fresh-milk-tea",
    name: "珍珠鮮奶茶",
    englishName: "Pearl Fresh Milk Tea",
    category: "鮮奶拿鐵",
    isActive: true,
    sortOrder: 310
  },
  {
    id: "four-seasons-fresh-milk-tea",
    name: "四季春鮮奶茶",
    englishName: "Four Seasons Fresh Milk Tea",
    category: "鮮奶拿鐵",
    isActive: true,
    sortOrder: 320
  },
  {
    id: "black-tea-latte",
    name: "紅茶拿鐵",
    englishName: "Black Tea Latte",
    category: "鮮奶拿鐵",
    isActive: true,
    sortOrder: 330
  },
  {
    id: "winter-melon-lemon",
    name: "冬瓜檸檬",
    englishName: "Winter Melon Lemon",
    category: "特調飲品",
    isActive: true,
    sortOrder: 410
  },
  {
    id: "passion-fruit-double-q",
    name: "百香雙Q",
    englishName: "Passion Fruit Double Q",
    category: "特調飲品",
    isActive: true,
    sortOrder: 420
  },
  {
    id: "honey-lemon",
    name: "蜂蜜檸檬",
    englishName: "Honey Lemon",
    category: "特調飲品",
    isActive: true,
    sortOrder: 430
  }
];

const demoPrices: Record<string, [number | null, number | null]> = {
  "contemporary-double-q": [55, 65],
  "alpine-green-tea-3q": [null, 70],
  "brown-sugar-pearl-fresh-milk": [95, 115],
  "double-q-fresh-milk-tea": [75, 85],
  "darjeeling-black-tea": [35, 40],
  "alpine-green-tea": [35, 40],
  "sun-moon-lake-black-tea": [35, 40],
  "four-seasons-green-tea": [35, 40],
  "pearl-milk-tea": [50, 60],
  "grass-jelly-milk-tea": [50, 60],
  "taro-milk-tea": [50, 60],
  "jasmine-milk-green-tea": [45, 55],
  "pearl-fresh-milk-tea": [75, 85],
  "four-seasons-fresh-milk-tea": [70, 80],
  "black-tea-latte": [65, 75],
  "winter-melon-lemon": [45, 55],
  "passion-fruit-double-q": [55, 65],
  "honey-lemon": [50, 60]
};

export const teatopPricingConfigs: PricingConfig[] = teatopProducts.map((product) => {
  const [priceM, priceL] = demoPrices[product.id] ?? [null, null];

  return {
    id: pricingConfigId(product.id, teatopNorthTag.id),
    productId: product.id,
    tagId: teatopNorthTag.id,
    tagName: teatopNorthTag.name,
    priceM,
    priceL,
    sortOrder: product.sortOrder,
    isActive: true
  };
});
