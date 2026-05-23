import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db, hasFirebaseConfig } from "../lib/firebase";
import { collections, normalizeExternalId } from "../lib/firestore";
import type {
  CachedBranch,
  CachedDevice,
  MenuItem,
  PricingConfig,
  Product,
  StoreLiveStatus
} from "../lib/types";

interface MenuState {
  branch: CachedBranch | null;
  tagName: string;
  items: MenuItem[];
}

export function MenuApp() {
  const [state, setState] = useState<MenuState>({ branch: null, tagName: "", items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMenu()
      .then(setState)
      .catch((reason) => {
        console.error(reason);
        setError(reason instanceof Error ? reason.message : "菜單載入失敗");
      })
      .finally(() => setLoading(false));
  }, []);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, MenuItem[]>();
    state.items.forEach((item) => {
      const category = item.product.category || "其他";
      groups.set(category, [...(groups.get(category) ?? []), item]);
    });
    return [...groups.entries()];
  }, [state.items]);

  if (!hasFirebaseConfig) {
    return (
      <main className="menu-error">
        <h1>Firebase 尚未設定</h1>
        <p>請先完成 Firebase Web App 環境變數設定。</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="menu-loading">
        <div className="loader" />
        <p>MENU LOADING</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="menu-error">
        <h1>無法顯示菜單</h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <main className="menu-board">
      <header className="menu-header">
        <div>
          <p className="eyebrow">TEA TOP 第一味</p>
          <h1>北部飲品 Menu</h1>
        </div>
        <aside>
          <span>{state.branch?.name ?? "示範分店"}</span>
          <strong>{state.tagName || "北部菜單"}</strong>
        </aside>
      </header>

      <section className="hero-strip">
        <div>
          <p>Digital Signage Menu</p>
          <h2>遠看清楚、即時售罄、依分店屬性顯示價格</h2>
        </div>
        <span>Medium / Large</span>
      </section>

      <section className="menu-grid">
        {groupedItems.map(([category, items]) => (
          <article className="category-card" key={category}>
            <h2>{category}</h2>
            <div className="items">
              {items.map((item) => (
                <MenuRow item={item} key={item.product.id} />
              ))}
            </div>
          </article>
        ))}
      </section>

      <footer className="menu-footer">
        <span>售罄品項會自動顯示 SOLD OUT</span>
        <span>價格以門市公告為準</span>
      </footer>
    </main>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <div className={item.isSoldOut ? "menu-row sold-out" : "menu-row"}>
      <div className="product-name">
        <strong>{item.product.name}</strong>
        <span>{item.product.englishName}</span>
      </div>
      {item.product.isSignature && <span className="badge">人氣</span>}
      <div className="prices">
        <span>{formatPrice(item.pricing.priceM)}</span>
        <span>{formatPrice(item.pricing.priceL)}</span>
      </div>
      {item.isSoldOut && <div className="sold-banner">SOLD OUT</div>}
    </div>
  );
}

async function loadMenu(): Promise<MenuState> {
  if (!db) throw new Error("Firebase 未初始化");
  const params = new URLSearchParams(window.location.search);
  const branchIdParam = normalizeExternalId(params.get("branchId"));
  const deviceIdParam = normalizeExternalId(params.get("deviceId"));
  const tagIdParam = normalizeExternalId(params.get("tagId"));

  let branchId = branchIdParam;

  if (!branchId && deviceIdParam) {
    const deviceSnapshot = await getDoc(doc(db, collections.devices, deviceIdParam));
    if (!deviceSnapshot.exists()) {
      throw new Error(`找不到設備 ${deviceIdParam} 對應的分店`);
    }
    const device = { id: deviceSnapshot.id, ...deviceSnapshot.data() } as CachedDevice;
    branchId = normalizeExternalId(device.externalBranchId);
  }

  if (!branchId) {
    const settingsSnapshot = await getDoc(doc(db, collections.menuSettings, "default"));
    branchId = normalizeExternalId(settingsSnapshot.data()?.defaultBranchId ?? "1001");
  }

  const branchSnapshot = await getDoc(doc(db, collections.branches, branchId));
  if (!branchSnapshot.exists()) {
    throw new Error(`找不到分店 ${branchId}，請先在後台同步或新增分店`);
  }

  const branch = { id: branchSnapshot.id, ...branchSnapshot.data() } as CachedBranch;
  const tagIds = tagIdParam ? [tagIdParam] : branch.tagIds?.length ? branch.tagIds : ["1"];
  const pricing = await loadPricingForTags(tagIds);
  const selectedTagId = tagIds.find((tagId) => pricing.some((config) => config.tagId === tagId));
  const selectedPricing = pricing
    .filter((config) => config.tagId === selectedTagId && config.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const productSnapshots = await getDocs(collection(db, collections.products));
  const products = new Map<string, Product>();
  productSnapshots.docs.forEach((item) => {
    const product = { id: item.id, ...item.data() } as Product;
    if (product.isActive !== false) products.set(product.id, product);
  });

  const statusSnapshots = await getDocs(
    query(collection(db, collections.storeLiveStatuses), where("branchId", "==", branchId))
  );
  const soldOutProductIds = new Set(
    statusSnapshots.docs
      .map((item) => ({ id: item.id, ...item.data() }) as StoreLiveStatus)
      .filter((status) => status.isSoldOut)
      .map((status) => status.productId)
  );

  const items = selectedPricing
    .map((config) => {
      const product = products.get(config.productId);
      if (!product) return null;
      return {
        product,
        pricing: config,
        isSoldOut: soldOutProductIds.has(product.id)
      };
    })
    .filter((item): item is MenuItem => Boolean(item));

  const tagName =
    branch.tags?.find((tag) => tag.id === selectedTagId)?.name || selectedPricing[0]?.tagName || "";

  return { branch, tagName, items };
}

async function loadPricingForTags(tagIds: string[]) {
  if (!db) return [];
  const configs: PricingConfig[] = [];
  for (const tagId of tagIds.slice(0, 10)) {
    const snapshot = await getDocs(
      query(collection(db, collections.pricingConfigs), where("tagId", "==", tagId))
    );
    snapshot.docs.forEach((item) => {
      configs.push({ id: item.id, ...item.data() } as PricingConfig);
    });
  }
  return configs;
}

function formatPrice(value?: number | null) {
  return typeof value === "number" ? `$${value}` : "-";
}
