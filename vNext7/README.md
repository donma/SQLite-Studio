# SQLite Studio Web

SQLite Studio Web 是一個純前端 SQLite 檢視與整理工具，適合 AI 生成專案、本地資料包、離線小工具、小型 SQLite 檔案維護與快速 SQL 測試。

本工具可在瀏覽器中執行 SQLite，不需要後端服務。資料庫檔案會在使用者本機端處理，不會上傳到伺服器。

## Live Demo

https://donma.github.io/SQLite-Studio/

## 為什麼選擇 SQLite Studio Web？

| 特色 | 說明 |
|------|------|
| 純前端 | 無需後端伺服器，開啟 HTML 即可使用 |
| 零安裝 | 不需要安裝任何軟體或套件 |
| 離線可用 | PWA 支援，斷網也能用 |
| 隱私安全 | 資料完全留在瀏覽器，不上傳任何伺服器 |
| 輕量攜帶 | 整個資料夾不到 3MB，可放在 USB 隨身碟 |
| file:// 支援 | 直接雙擊開啟，無需啟動本地伺服器 |
| WASM 加速 | HTTPS 環境自動使用 WebAssembly 加速 |
| 深色/淺色 | 一鍵切換主題，護眼舒適 |

## 適用場景

SQLite Studio Web 適合處理小型到中型 SQLite 檔案，例如：

- AI 生成工具附帶的 SQLite 資料庫
- 本地資料包
- 離線小工具
- CLI 工具產生的資料
- 原型專案
- 小型 SQLite 檔案檢視與整理
- CSV 匯入後快速整理資料

## 不適用場景

由於本工具基於瀏覽器端 SQLite 執行環境，資料庫會載入瀏覽器記憶體中操作，因此不建議用於：

- 幾百 MB 以上的大型 SQLite 檔案
- production database 直接維護
- 多人協作資料庫
- 高頻寫入場景
- 長時間服務型資料庫

## Download

下載 release zip 後，解壓縮並使用 Chrome 或 Edge 開啟 `index.html` 即可使用。

---

## 功能狀態

SQLite Studio Web 目前分為「穩定功能」與「實驗功能」。

穩定功能適合一般小型 SQLite 檔案檢視、查詢、整理與匯入匯出。

實驗功能仍可能受到瀏覽器記憶體、SQLite schema 複雜度、資料表大小與前端執行環境影響。操作前建議先另存資料庫備份。

---

## 穩定功能

| 功能 | 說明 |
|------|------|
| 開啟 / 新建 / 儲存 | 支援 .sqlite / .db / .sqlite3 / .db3 |
| 範例資料庫 | 一鍵建立包含 7 張表的範例資料庫 |
| 資料庫總覽 | 儀表板顯示表數量、視圖、觸發器、索引、大小 |
| 匯出資料庫 | 下載 .sqlite 檔案 |
| VACUUM 壓縮 | 壓縮資料庫檔案大小（含確認） |
| 完整性檢查 | PRAGMA integrity_check |
| 表操作 | 建表 UI、重新命名、清空、刪除 |
| 資料瀏覽 | 分頁 / 排序 / 篩選 / 行內編輯 |
| CRUD | 新增 / 編輯 / 刪除資料列（含確認） |
| 結構管理 | 檢視表結構、新增欄位 |
| 索引管理 | 檢視 / 新增 / 刪除索引 |
| 外鍵檢視器 | 正向 + 反向外鍵關係 |
| 視圖管理 | 檢視 / 刪除視圖 |
| 觸發器管理 | 檢視 / 刪除觸發器 |
| SQL 編輯器 | 語法高亮、自動補全、多語句執行、格式化 |
| 查詢歷史 | 最多 200 條，持久化儲存 |
| 書籤 | 常用查詢快速存取 |
| ERD 關聯圖 | 自動繪製、dagre 排版、縮放平移、匯出 SVG |
| 匯入 CSV | 含預覽、欄位名稱清理 |
| 匯入 SQL 檔案 | 逐條執行，報告成功/失敗 |
| 匯出 SQL / CSV / JSON | 表資料匯出 |
| JSON 格式化 | 自動偵測 JSON，樹狀檢視 |
| 搜尋全部資料表 | 跨表關鍵字搜尋 |
| 深色/亮色主題 | 一鍵切換，記住偏好 |
| 鍵盤快捷鍵 | Ctrl+O/S/N、Ctrl+Enter |
| PWA 離線 | Service Worker 快取 |

---

## 實驗功能

以下功能仍屬實驗功能，操作前請先另存資料庫備份：

| 功能 | 說明 |
|------|------|
| 欄位排序 | 會重建資料表，複雜 schema 會被阻擋 |
| 欄位刪除 | ALTER TABLE DROP COLUMN |
| Schema Migration | 自動產生遷移 SQL |
| 資料庫比較 | 兩個 .sqlite 比較結構差異 |
| 資料遮罩匯出 | 選擇欄位遮罩後匯出 |
| 假資料產生器 | 自動偵測欄位類型產生假資料 |
| 自動備份 | 危險操作前自動存 IndexedDB 快照 |
| 多查詢分頁結果 | 每條語句獨立結果 Tab |
| BLOB 預覽 | 圖片縮圖、Hex 檢視 |
| Query Plan / EXPLAIN | 查詢計畫樹狀圖 |
| JSON 編輯器 | 雙擊 JSON 欄位開啟專用編輯器 |
| Markdown 預覽 | 懸停顯示 Markdown 渲染結果 |
| 查詢結果圖表 | 長條圖 / 圓餅圖 / 折線圖 |

---

## 實驗功能限制

### 欄位排序

欄位排序會透過重建資料表的方式完成。若資料表包含複雜 schema，例如 foreign key、trigger、check constraint、unique constraint、generated column 或 without rowid table，工具會阻擋操作或要求先另存備份。

### Schema Migration

Schema Migration 仍屬輔助工具，不建議直接套用在重要 production database。正式套用前請先閱讀產生的 SQL，並另存資料庫備份。

### 資料庫比較

資料庫比較主要用於檢視 schema 差異，不應視為完整同步工具。

### 資料遮罩與假資料產生

資料遮罩與假資料產生主要用於測試資料處理，產出結果仍需人工確認。

### 欄位排序限制

欄位排序仍屬實驗功能。

SQLite 原生不支援直接調整欄位順序，因此本工具會透過重建資料表完成欄位排序。操作流程大致如下：

1. 建立暫存資料表。
2. 將原資料搬移到暫存資料表（使用 INSERT INTO SELECT）。
3. 刪除原資料表。
4. 將暫存資料表改名回原資料表。
5. 嘗試重建索引與相關結構。

為避免資料結構損壞，若資料表包含下列複雜 schema，工具會阻擋欄位排序：

- foreign key
- trigger
- check constraint
- unique constraint
- generated column
- without rowid table
- 其他無法安全解析的 CREATE TABLE 語法

注意：即使系統已加入阻擋機制，欄位排序仍可能無法完整保留所有特殊 SQLite schema 語意。重要資料庫請先另存備份。

---

## CSV 匯入

### CSV 欄位命名規則

CSV 匯入時，第一列可作為欄位名稱。欄位名稱處理規則如下：

- 欄位名稱會自動 trim 前後空白。
- 空白欄位名稱會自動命名為 `column_1`、`column_2`、`column_3`。
- 重複欄位名稱會自動加上流水號，例如 `name`、`name_2`、`name_3`。
- 中文欄位名稱會保留。
- 不會強制把欄位名稱轉成英文。
- 欄位名稱中的特殊字元會保留，SQL 操作時會由工具自動進行 identifier escaping。

範例：

```csv
id,name,name,
1,Alice,A1,x
```

匯入後欄位會變成：

```txt
id
name
name_2
column_4
```

### CSV 多行欄位限制

目前 CSV 匯入支援一般逗號分隔與雙引號欄位，但不支援欄位內容包含換行符號的 CSV。

例如以下 CSV 目前不支援：

```csv
id,content
1,"hello
world"
```

若資料包含多行文字欄位，建議先整理成單行內容後再匯入。

---

## 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl + O` | 開啟資料庫 |
| `Ctrl + S` | 儲存資料庫 |
| `Ctrl + N` | 新建資料庫 |
| `Ctrl + Enter` | 執行 SQL |
| `Tab` | 接受自動補全 / 縮排 |
| `Escape` | 關閉彈窗 / 取消編輯 |
| `方向鍵` | 表格內導覽 |

---

## Sample Database

首頁點擊「建立範例資料庫」即可一鍵建立，包含：

- 7 張表（users、categories、posts、tags、post_tags、comments、settings）
- 外鍵關聯（含自引用）
- 2 個視圖（v_post_stats、v_popular_posts）
- 1 個觸發器
- 6 個索引
- JSON metadata 欄位
- 30+ 筆範例資料

---

## file:// 模式限制

本工具可以在 Chromium 系瀏覽器中直接以 file:// 開啟使用，但不同瀏覽器對本機檔案與 File System Access API 的支援不同。

建議環境：
- Chrome
- Edge

可能受限環境：
- Firefox
- Safari

在不支援 File System Access API 的瀏覽器中，工具會退回手動選檔與下載儲存模式。

---

## 安全提醒

執行以下操作前，請先另存備份：

- DROP TABLE
- ALTER TABLE
- 欄位排序
- 欄位刪除
- 匯入資料覆蓋既有表格
- VACUUM
- 批次 UPDATE / DELETE

其中「欄位排序」、「Schema Migration」、「資料庫比較」仍屬實驗功能，不建議直接套用在重要資料庫上。

---

## 已知限制

- CSV 匯入不支援欄位內含換行符號的多行欄位。若資料包含多行文字欄位，建議先整理成單行內容後再匯入。
- 匯出 SQL / CSV / JSON 目前上限 100,000 筆
- 欄位排序會遺失複雜 constraint（如 GENERATED COLUMN、WITHOUT ROWID）
- 複製資料表只複製資料，不保留 schema 約束

---

## 瀏覽器支援

| 瀏覽器 | 支援 | 備註 |
|--------|------|------|
| Chrome / Edge | ✅ 完整支援 | File System Access API + WASM |
| Firefox | ✅ 基本支援 | 檔案需手動選取 |
| Safari | ✅ 基本支援 | 檔案需手動選取 |

---

## 授權

MIT License
