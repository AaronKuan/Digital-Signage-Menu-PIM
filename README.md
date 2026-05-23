# Digital Signage Menu PIM

第一版是獨立於既有電子看板系統之外的 Firebase 菜單管理系統。

它提供三個主要部分：

1. **看板菜單網頁**：電子看板播放 `/menu?branchId=xxx` 或 `/menu?deviceId=xxx`。
2. **後台管理介面**：PM/營運可在 `/admin` 管理商品、價格與售罄。
3. **Firebase 資料庫與 Functions**：Firestore 存資料，Functions 負責同步舊看板資料與每天清空售罄。

第一版商品與分類以 TEA TOP 北部菜單作為示範資料，可由後台修改。

## PM 版資料表說明

可以把 Firestore 想成幾張 Excel：

| Firestore collection | PM 理解 | 用途 |
| --- | --- | --- |
| `products` | 商品總表 | 商品名稱、英文名、分類、圖片、是否上架 |
| `pricingConfigs` | 分區價格表 | 某個商品在某個分店 tag 下的中杯/大杯價格與排序 |
| `storeLiveStatuses` | 單店售罄表 | 某間店臨時回報某商品 SOLD OUT |
| `branches` | 分店快取 | 從舊看板系統同步來的分店與 tags |
| `devices` | 設備快取 | 從舊看板系統同步來的設備與分店對應 |
| `tags` | 分店屬性 | 例如「北北基宜花 / 北部菜單」 |
| `menuSettings` | 系統設定 | 預設分店、預設菜單區域 |

## 專案初始化

```bash
npm install
npm run functions:install
```

複製環境變數：

```bash
cp .env.example .env
```

到 Firebase Console 建立 Web App，將設定填入 `.env`。

## 本機開發

```bash
npm run dev
```

常用網址：

- 後台：`http://localhost:5173/admin`
- 示範菜單：`http://localhost:5173/menu?branchId=1001`
- 以設備 ID 顯示：`http://localhost:5173/menu?deviceId=9001`

第一次進後台後，先點「一鍵匯入示範資料」。

## Firebase 後台設定

1. 建立 Firebase project。
2. 啟用 Firestore Database。
3. 啟用 Authentication 的 Email/Password 登入。
4. 建立一組後台管理者帳號。
5. 部署 Firestore rules 與 Hosting/Functions。

> 第一版規則是「菜單公開可讀、登入者可管理」。正式上線若會有多種角色，建議再加 Firebase custom claims 區分總部管理員與店長。

## 舊電子看板系統同步

Firebase Functions 需要設定以下環境變數：

```bash
SIGNAGE_API_BASE_URL="https://ultrontest.ddns.net/api/v1"
SIGNAGE_API_EMAIL="your-login-email"
SIGNAGE_API_PASSWORD="your-login-password"
SIGNAGE_SYNC_BRANCH_LIMIT="100"
SIGNAGE_SYNC_DEVICE_LIMIT="100"
```

同步會呼叫：

- `POST /api/v1/users/login`
- `GET /api/v1/branches`
- `GET /api/v1/devices`

同步結果會寫入 Firestore 的 `branches`、`devices`、`tags`。

## 每天自動清空售罄

Function `resetDailySoldOutStatuses` 會在台北時間每天 04:00 將 `storeLiveStatuses.isSoldOut` 改回 `false`。

## 部署

```bash
npm run build
firebase deploy
```

部署後可讓既有電子看板播放：

```text
https://<your-firebase-hosting-domain>/menu?deviceId=<舊看板設備ID>
```

或：

```text
https://<your-firebase-hosting-domain>/menu?branchId=<舊看板分店ID>
```
