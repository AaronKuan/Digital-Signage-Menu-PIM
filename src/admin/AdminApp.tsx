import { useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions, hasFirebaseConfig } from "../lib/firebase";
import { collections, liveStatusId, pricingConfigId } from "../lib/firestore";
import type {
  BranchTag,
  CachedBranch,
  CachedDevice,
  PricingConfig,
  Product,
  StoreLiveStatus
} from "../lib/types";
import {
  teatopDemoBranch,
  teatopDemoDevice,
  teatopNorthTag,
  teatopPricingConfigs,
  teatopProducts
} from "../data/teatopSeed";

type Tab = "products" | "pricing" | "status" | "branches" | "seed";

const emptyProduct: Product = {
  id: "",
  name: "",
  englishName: "",
  category: "招牌推薦",
  description: "",
  imageUrl: "",
  isActive: true,
  isSignature: false,
  sortOrder: 999
};

export function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("seed");
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);
  const [branches, setBranches] = useState<CachedBranch[]>([]);
  const [devices, setDevices] = useState<CachedDevice[]>([]);
  const [statuses, setStatuses] = useState<StoreLiveStatus[]>([]);
  const [productDraft, setProductDraft] = useState<Product>(emptyProduct);
  const [selectedTagId, setSelectedTagId] = useState(teatopNorthTag.id);
  const [selectedBranchId, setSelectedBranchId] = useState(teatopDemoBranch.externalBranchId);
  const [notice, setNotice] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!db || !user) return undefined;
    const unsubscribers = [
      onSnapshot(query(collection(db, collections.products), orderBy("sortOrder")), (snapshot) => {
        setProducts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Product));
      }),
      onSnapshot(collection(db, collections.pricingConfigs), (snapshot) => {
        setPricingConfigs(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as PricingConfig)
        );
      }),
      onSnapshot(collection(db, collections.branches), (snapshot) => {
        setBranches(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as CachedBranch));
      }),
      onSnapshot(collection(db, collections.devices), (snapshot) => {
        setDevices(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as CachedDevice));
      }),
      onSnapshot(collection(db, collections.storeLiveStatuses), (snapshot) => {
        setStatuses(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StoreLiveStatus)
        );
      })
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [user]);

  const tags = useMemo(() => {
    const byId = new Map<string, BranchTag>();
    byId.set(teatopNorthTag.id, teatopNorthTag);
    branches.forEach((branch) => branch.tags?.forEach((tag) => byId.set(String(tag.id), tag)));
    return [...byId.values()];
  }, [branches]);

  const pricingByProduct = useMemo(() => {
    const map = new Map<string, PricingConfig>();
    pricingConfigs
      .filter((config) => config.tagId === selectedTagId)
      .forEach((config) => map.set(config.productId, config));
    return map;
  }, [pricingConfigs, selectedTagId]);

  const selectedBranch = branches.find(
    (branch) => branch.externalBranchId === selectedBranchId || branch.id === selectedBranchId
  );

  if (!hasFirebaseConfig) {
    return <SetupRequired />;
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">TEA TOP</div>
          <h1>Menu PIM 後台</h1>
          <p>請使用 Firebase Authentication 建立的管理者帳號登入。</p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!auth) return;
              setLoginError("");
              try {
                await signInWithEmailAndPassword(auth, email, password);
              } catch (error) {
                const provider = EmailAuthProvider.PROVIDER_ID;
                setLoginError(`登入失敗，請確認 Firebase 已啟用 ${provider}。`);
                console.error(error);
              }
            }}
          >
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {loginError && <p className="error">{loginError}</p>}
            <button type="submit">登入後台</button>
          </form>
        </section>
      </main>
    );
  }

  async function seedDemoData() {
    const firestore = db;
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const now = serverTimestamp();

    teatopProducts.forEach((product) => {
      batch.set(
        doc(firestore, collections.products, product.id),
        { ...product, updatedAt: now, createdAt: now },
        { merge: true }
      );
    });
    teatopPricingConfigs.forEach((config) => {
      batch.set(
        doc(firestore, collections.pricingConfigs, config.id),
        { ...config, updatedAt: now },
        { merge: true }
      );
    });
    batch.set(doc(firestore, collections.branches, teatopDemoBranch.externalBranchId), {
      ...teatopDemoBranch,
      updatedAt: now,
      syncedAt: now
    });
    batch.set(doc(firestore, collections.devices, teatopDemoDevice.externalDeviceId), {
      ...teatopDemoDevice,
      updatedAt: now,
      syncedAt: now
    });
    batch.set(doc(firestore, collections.tags, teatopNorthTag.id), {
      ...teatopNorthTag,
      updatedAt: now
    });
    batch.set(doc(firestore, collections.menuSettings, "default"), {
      defaultBranchId: teatopDemoBranch.externalBranchId,
      defaultTagId: teatopNorthTag.id,
      brandName: "TEA TOP 第一味",
      updatedAt: now
    });

    await batch.commit();
    setNotice("已匯入 TEA TOP 北部示範商品、價格、分店與設備。");
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    if (!db || !productDraft.name.trim()) return;
    const id =
      productDraft.id.trim() ||
      productDraft.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\u4e00-\u9fa5-]/g, "");
    await setDoc(
      doc(db, collections.products, id),
      {
        ...productDraft,
        id,
        sortOrder: Number(productDraft.sortOrder) || 999,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      },
      { merge: true }
    );
    setProductDraft(emptyProduct);
    setNotice("商品已儲存。");
  }

  async function savePricingMatrix(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firestore = db;
    if (!firestore) return;
    const form = new FormData(event.currentTarget);
    const selectedTag = tags.find((tag) => tag.id === selectedTagId) ?? teatopNorthTag;
    const batch = writeBatch(firestore);

    products.forEach((product) => {
      const priceM = readOptionalNumber(form.get(`${product.id}:priceM`));
      const priceL = readOptionalNumber(form.get(`${product.id}:priceL`));
      const sortOrder = Number(form.get(`${product.id}:sortOrder`) ?? product.sortOrder);
      const isActive = form.get(`${product.id}:isActive`) === "on";
      const configId = pricingConfigId(product.id, selectedTag.id);

      batch.set(
        doc(firestore, collections.pricingConfigs, configId),
        {
          id: configId,
          productId: product.id,
          tagId: selectedTag.id,
          tagName: selectedTag.name,
          priceM,
          priceL,
          sortOrder,
          isActive,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    await batch.commit();
    setNotice("此分店屬性的價格矩陣已儲存。");
  }

  async function toggleSoldOut(productId: string, isSoldOut: boolean) {
    if (!db || !selectedBranchId) return;
    await setDoc(
      doc(db, collections.storeLiveStatuses, liveStatusId(selectedBranchId, productId)),
      {
        id: liveStatusId(selectedBranchId, productId),
        branchId: selectedBranchId,
        productId,
        isSoldOut,
        updatedBy: user?.email,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  async function addManualBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    const form = new FormData(event.currentTarget);
    const branchId = String(form.get("branchId") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    const tagId = String(form.get("tagId") ?? "").trim();
    const tagName = String(form.get("tagName") ?? "").trim();
    if (!branchId || !name || !tagId || !tagName) return;

    await setDoc(
      doc(db, collections.branches, branchId),
      {
        id: branchId,
        externalBranchId: branchId,
        name,
        status: true,
        tags: [{ id: tagId, name: tagName }],
        tagIds: [tagId],
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    await setDoc(doc(db, collections.tags, tagId), { id: tagId, name: tagName }, { merge: true });
    event.currentTarget.reset();
    setNotice("分店已新增。");
  }

  async function addManualDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    const form = new FormData(event.currentTarget);
    const deviceId = String(form.get("deviceId") ?? "").trim();
    const branchId = String(form.get("branchId") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    if (!deviceId || !branchId) return;

    await setDoc(
      doc(db, collections.devices, deviceId),
      {
        id: deviceId,
        externalDeviceId: deviceId,
        externalBranchId: branchId,
        name,
        status: true,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    event.currentTarget.reset();
    setNotice("設備已新增。");
  }

  async function triggerSignageSync() {
    if (!functions) return;
    setSyncing(true);
    setNotice("");
    try {
      const syncCatalog = httpsCallable(functions, "syncSignageCatalog");
      const result = await syncCatalog({});
      setNotice(`同步完成：${JSON.stringify(result.data)}`);
    } catch (error) {
      console.error(error);
      setNotice("同步失敗，請確認 Functions 環境變數與舊看板帳密。");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Firebase Menu PIM</p>
          <h1>TEA TOP 第一版菜單管理</h1>
        </div>
        <div className="header-actions">
          <a href="/menu?branchId=1001" target="_blank" rel="noreferrer">
            看示範菜單
          </a>
          <button type="button" onClick={() => auth && signOut(auth)}>
            登出
          </button>
        </div>
      </header>

      <nav className="tabs">
        {[
          ["seed", "匯入範例"],
          ["products", "商品"],
          ["pricing", "屬性價格"],
          ["status", "單店售罄"],
          ["branches", "分店/設備"]
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key as Tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {notice && <aside className="notice">{notice}</aside>}

      {tab === "seed" && (
        <section className="panel hero-panel">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2>先匯入 TEA TOP 北部示範資料</h2>
            <p>
              這會建立第一批商品、北部價格、示範分店與示範設備。價格與商品名稱之後都能在後台修改。
            </p>
          </div>
          <button type="button" className="primary" onClick={seedDemoData}>
            一鍵匯入示範資料
          </button>
        </section>
      )}

      {tab === "products" && (
        <section className="grid-two">
          <form className="panel form-stack" onSubmit={saveProduct}>
            <h2>{productDraft.id ? "編輯商品" : "新增商品"}</h2>
            <label>
              商品名稱
              <input
                value={productDraft.name}
                onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })}
              />
            </label>
            <label>
              英文名
              <input
                value={productDraft.englishName ?? ""}
                onChange={(event) =>
                  setProductDraft({ ...productDraft, englishName: event.target.value })
                }
              />
            </label>
            <label>
              分類
              <input
                value={productDraft.category}
                onChange={(event) =>
                  setProductDraft({ ...productDraft, category: event.target.value })
                }
              />
            </label>
            <label>
              圖片 URL
              <input
                value={productDraft.imageUrl ?? ""}
                onChange={(event) =>
                  setProductDraft({ ...productDraft, imageUrl: event.target.value })
                }
              />
            </label>
            <label>
              排序
              <input
                type="number"
                value={productDraft.sortOrder}
                onChange={(event) =>
                  setProductDraft({ ...productDraft, sortOrder: Number(event.target.value) })
                }
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={productDraft.isSignature}
                onChange={(event) =>
                  setProductDraft({ ...productDraft, isSignature: event.target.checked })
                }
              />
              招牌品項
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={productDraft.isActive}
                onChange={(event) =>
                  setProductDraft({ ...productDraft, isActive: event.target.checked })
                }
              />
              上架
            </label>
            <button type="submit" className="primary">
              儲存商品
            </button>
          </form>

          <section className="panel">
            <h2>商品列表</h2>
            <div className="list">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="list-row"
                  onClick={() => setProductDraft(product)}
                >
                  <strong>{product.name}</strong>
                  <span>{product.category}</span>
                  <span>{product.isActive ? "上架" : "下架"}</span>
                </button>
              ))}
            </div>
          </section>
        </section>
      )}

      {tab === "pricing" && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>分店屬性價格矩陣</h2>
              <p>價格會依照舊看板系統同步來的分店 tags 決定。</p>
            </div>
            <select value={selectedTagId} onChange={(event) => setSelectedTagId(event.target.value)}>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name} #{tag.id}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={savePricingMatrix}>
            <div className="pricing-table">
              <div className="pricing-row heading">
                <span>商品</span>
                <span>中杯</span>
                <span>大杯</span>
                <span>排序</span>
                <span>顯示</span>
              </div>
              {products.map((product) => {
                const config = pricingByProduct.get(product.id);
                return (
                  <div className="pricing-row" key={product.id}>
                    <strong>{product.name}</strong>
                    <input
                      name={`${product.id}:priceM`}
                      type="number"
                      defaultValue={config?.priceM ?? ""}
                      placeholder="-"
                    />
                    <input
                      name={`${product.id}:priceL`}
                      type="number"
                      defaultValue={config?.priceL ?? ""}
                      placeholder="-"
                    />
                    <input
                      name={`${product.id}:sortOrder`}
                      type="number"
                      defaultValue={config?.sortOrder ?? product.sortOrder}
                    />
                    <input
                      name={`${product.id}:isActive`}
                      type="checkbox"
                      defaultChecked={config?.isActive ?? true}
                    />
                  </div>
                );
              })}
            </div>
            <button type="submit" className="primary">
              儲存此區價格
            </button>
          </form>
        </section>
      )}

      {tab === "status" && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>單店現場售罄</h2>
              <p>售罄狀態會在 Firebase Functions 每天自動清空。</p>
            </div>
            <select
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
            >
              {[teatopDemoBranch, ...branches].map((branch) => (
                <option key={branch.externalBranchId} value={branch.externalBranchId}>
                  {branch.name} #{branch.externalBranchId}
                </option>
              ))}
            </select>
          </div>

          {!selectedBranch && <p className="muted">尚未同步或建立分店時，可先使用示範分店。</p>}
          <div className="status-grid">
            {products.map((product) => {
              const status = statuses.find(
                (item) => item.branchId === selectedBranchId && item.productId === product.id
              );
              return (
                <button
                  type="button"
                  key={product.id}
                  className={status?.isSoldOut ? "sold status-card" : "status-card"}
                  onClick={() => toggleSoldOut(product.id, !status?.isSoldOut)}
                >
                  <strong>{product.name}</strong>
                  <span>{status?.isSoldOut ? "SOLD OUT" : "供應中"}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {tab === "branches" && (
        <section className="grid-two">
          <div className="panel form-stack">
            <h2>同步舊看板系統</h2>
            <p>部署 Functions 並設定舊看板帳密後，可以從這裡同步分店、tags 與設備。</p>
            <button type="button" className="primary" onClick={triggerSignageSync} disabled={syncing}>
              {syncing ? "同步中..." : "立即同步"}
            </button>
            <form onSubmit={addManualBranch} className="nested-form">
              <h3>手動新增分店</h3>
              <input name="branchId" placeholder="分店 ID，例如 1001" />
              <input name="name" placeholder="分店名稱" />
              <input name="tagId" placeholder="tag ID，例如 1" />
              <input name="tagName" placeholder="tag 名稱，例如 北北基宜花" />
              <button type="submit">新增分店</button>
            </form>
            <form onSubmit={addManualDevice} className="nested-form">
              <h3>手動新增設備</h3>
              <input name="deviceId" placeholder="設備 ID，例如 9001" />
              <input name="branchId" placeholder="對應分店 ID，例如 1001" />
              <input name="name" placeholder="設備名稱" />
              <button type="submit">新增設備</button>
            </form>
          </div>

          <div className="panel">
            <h2>目前資料</h2>
            <h3>分店</h3>
            <div className="compact-list">
              {branches.map((branch) => (
                <p key={branch.externalBranchId}>
                  <strong>{branch.name}</strong>
                  <span>#{branch.externalBranchId}</span>
                  <small>{branch.tags?.map((tag) => tag.name).join(", ")}</small>
                </p>
              ))}
            </div>
            <h3>設備</h3>
            <div className="compact-list">
              {devices.map((device) => (
                <p key={device.externalDeviceId}>
                  <strong>{device.name || "未命名設備"}</strong>
                  <span>設備 #{device.externalDeviceId}</span>
                  <small>分店 #{device.externalBranchId}</small>
                </p>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function SetupRequired() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>尚未設定 Firebase</h1>
        <p>
          請複製 <code>.env.example</code> 成 <code>.env</code>，填入 Firebase Web App
          設定後再啟動專案。
        </p>
      </section>
    </main>
  );
}

function readOptionalNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && String(value ?? "").trim() !== "" ? parsed : null;
}
