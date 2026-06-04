# SQLite Studio Web

> AI 時代，Vibe Coding 當道。
>
> 越來越多開發者用 Cursor、ChatGPT、Claude 等 AI 工具快速生成應用，而 **SQLite** 憑藉其零配置、輕量、單檔案的特性，成為這些 AI 驅動專案中最受歡迎的資料庫選擇。
>
> 但問題來了：**你怎麼檢視這些資料庫？**
>
> 傳統工具需要安裝、需要後端、需要連線設定。當你只想快速看一下表結構、改一筆資料、跑一句 SQL，這些流程都太重了。
>
> **SQLite Studio Web** 就是為這個場景而生——
>
> **純前端、零後端、打開瀏覽器就能用。**

## Live Demo

https://donma.github.io/SQLite-Studio/

## 專案定位

SQLite Studio Web 是一個**純前端 SQLite 檢視與整理工具**，適合 AI 生成專案、本地資料包、離線工具、小型資料庫維護與快速 SQL 測試。

提供接近 phpMyAdmin 操作習慣的常用 SQLite 管理功能。

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

由於本工具基於 sql.js，資料庫會載入瀏覽器記憶體中執行，因此不建議用於：

- 幾百 MB 以上的大型 SQLite 檔案
- production database 直接維護
- 多人協作資料庫
- 高頻寫入場景
- 需要長時間穩定執行的資料庫服務

## Download

下載 release zip 後，解壓縮並使用 Chrome 或 Edge 開啟 `index.html` 即可使用。

---

## 功能清單

### 穩定功能

#### 資料庫管理
| 功能 | 說明 |
|------|------|
| 開啟 / 新建 / 儲存 | 支援 .sqlite / .db / .sqlite3 / .db3 |
| 範例資料庫 | 一鍵建立包含 7 張表的範例資料庫 |
| 資料庫總覽 | 儀表板顯示表數量、視圖、觸發器、索引、大小 |
| 匯出資料庫 | 下載 .sqlite 檔案 |
| VACUUM 壓縮 | 壓縮資料庫檔案大小 |
| 完整性檢查 | PRAGMA integrity_check |

#### 表操作
| 功能 | 說明 |
|------|------|
| 建表 UI | 表單式建立，支援 INTEGER PRIMARY KEY AUTOINCREMENT |
| 重新命名 | ALTER TABLE RENAME TO |
| 新增欄位 | ALTER TABLE ADD COLUMN |
| 刪除欄位 | ALTER TABLE DROP COLUMN |
| 清空表 | DELETE FROM（含確認） |
| 刪除表 | DROP TABLE（含確認） |
| 複製資料快照 | CREATE TABLE AS SELECT（不含 schema 約束） |

#### 資料操作
| 功能 | 說明 |
|------|------|
| 資料瀏覽 | 分頁 / 排序 / 篩選 |
| 新增資料 | 表單式插入 |
| 編輯資料 | 彈窗式 + 行內編輯（雙擊） |
| 刪除資料 | 含確認對話框 |
| 資料搜尋 | 即時搜尋高亮 |

#### 結構管理
| 功能 | 說明 |
|------|------|
| 表結構檢視 | 欄位、類型、主鍵、預設值 |
| 欄位排序 | 上下移動（含 transaction/rollback） |
| 查看 CREATE SQL | 顯示原始建表語句 |
| 外鍵檢視器 | 正向 + 反向外鍵關係 |
| 索引管理 | 檢視 / 新增 / 刪除 |
| 視圖管理 | 檢視 / 刪除 |
| 觸發器管理 | 檢視 / 刪除 |

#### SQL 編輯器
| 功能 | 說明 |
|------|------|
| 語法高亮 | 關鍵字 / 函數 / 字串 / 數字 / 註解 |
| 自動補全 | 表名 / 欄位名 / SQL 關鍵字 / 函數 |
| 多語句執行 | 分號分隔，逐條顯示結果 |
| SQL 格式化 | 關鍵字大寫、換行縮排 |
| 執行選取 | 只執行選取的 SQL |
| 查詢歷史 | 最多 200 條，持久化儲存 |
| 書籤 | 常用查詢快速存取 |

#### 關聯圖 (ERD)
| 功能 | 說明 |
|------|------|
| 自動繪製 | dagre 演算法自動排版 |
| 外鍵連線 | 帶箭頭的關聯線 |
| 縮放平移 | 滑鼠滾輪 + 拖曳 |
| 觸控支援 | 手勢縮放平移 |
| 匯出 SVG | 向量圖形匯出 |

#### 匯入 / 匯出
| 功能 | 說明 |
|------|------|
| 匯入 CSV | 含預覽、欄位名稱清理、重複欄位處理 |
| 匯入 SQL 檔案 | 逐條執行，報告成功/失敗 |
| 匯出 SQL | 表結構 + 資料 |
| 匯出 CSV | UTF-8 BOM |
| 匯出 JSON | 格式化 JSON |
| 匯出 ERD SVG | 向量圖形 |

#### BLOB / JSON
| 功能 | 說明 |
|------|------|
| BLOB 圖片預覽 | PNG/JPEG/GIF/BMP/WEBP 自動偵測，縮圖點擊放大 |
| BLOB Hex 檢視器 | 非圖片 BLOB 顯示 hex 內容 |
| JSON 格式化 | 自動偵測 JSON，樹狀檢視、語法高亮、可摺疊 |
| JSON 編輯器 | 雙擊 JSON 欄位開啟專用編輯器 |

#### 其他功能
| 功能 | 說明 |
|------|------|
| 查詢結果圖表 | 長條圖 / 圓餅圖 / 折線圖 |
| Markdown 預覽 | 懸停顯示 Markdown 渲染結果 |
| 搜尋全部資料表 | 跨表關鍵字搜尋 |
| 深色/亮色主題 | 一鍵切換，記住偏好 |
| 自動備份 | 危險操作前自動存 IndexedDB 快照 |
| 鍵盤快捷鍵 | Ctrl+O/S/N、Ctrl+Enter |
| 鍵盤導覽 | 方向鍵移動、Enter 編輯 |
| PWA 離線 | Service Worker 快取 |
| beforeunload | 離開前提醒儲存 |

### 實驗功能

> 以下功能已實作但仍在驗證階段，可能不適用於所有情境。

| 功能 | 說明 | 限制 |
|------|------|------|
| 資料庫比較 | 兩個 .sqlite 比較結構差異 | 僅比較結構，不比較資料 |
| Schema Migration | 自動產生遷移 SQL | 複雜 schema 可能不完整 |
| 資料遮罩匯出 | 選擇欄位遮罩後匯出 | 基本遮罩模式 |
| 資料產生器 | 自動偵測欄位類型產生假資料 | 隨機資料，非真實資料 |
| EXPLAIN 視覺化 | 查詢計畫樹狀圖 | 基本顯示 |

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
- 2 個觸發器
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

執行以下操作前，建議先另存備份：

- DROP TABLE
- ALTER TABLE
- 欄位排序
- 欄位刪除
- 匯入資料覆蓋既有表格
- VACUUM
- 批次 UPDATE / DELETE

本工具在瀏覽器本機端執行，不會將資料庫上傳到伺服器。但使用者仍應自行確認瀏覽器環境與檔案備份狀態。

---

## 已知限制

- CSV 匯入不支援含換行符號的多行欄位
- 匯出 SQL / CSV / JSON 目前上限 100,000 筆
- 欄位排序會遺失複雜 constraint（如 GENERATED COLUMN、WITHOUT ROWID）
- 複製資料表只複製資料，不保留 schema 約束

---

## 技術架構

```
┌─────────────────────────────────────────────────┐
│                  SQLite Studio Web               │
├─────────────────────────────────────────────────┤
│  index.html          主頁面                      │
│  css/style.css       暗色/亮色主題 + RWD         │
├─────────────────────────────────────────────────┤
│  js/sql-utils.js     SQL identifier 轉義         │
│  js/db.js            SQLite 操作層               │
│  js/ui.js            UI 渲染 + 行內編輯          │
│  js/editor.js        SQL 編輯器 + 語法高亮       │
│  js/table.js         表操作 CRUD + 匯入匯出      │
│  js/erd.js           關聯圖 (SVG + dagre)        │
│  js/autocomplete.js  SQL 自動補全                │
│  js/enhancements.js  BLOB/JSON/圖表/自動備份     │
│  js/enhancements2.js EXPLAIN/比較/遷移/遮罩/產生 │
│  js/sample-db.js     範例資料庫產生器            │
│  js/storage.js       IndexedDB 持久化            │
│  js/app.js           主程式入口                  │
├─────────────────────────────────────────────────┤
│  lib/sql-asm.js      sql.js asm.js (file://)    │
│  lib/sql-wasm.js     sql.js WASM (HTTPS)        │
│  lib/sql-wasm.wasm   SQLite WASM 二進位         │
│  lib/dagre.min.js    圖形自動佈局                │
├─────────────────────────────────────────────────┤
│  manifest.json       PWA 設定                   │
│  sw.js               Service Worker             │
│  tests.html          單元測試                    │
└─────────────────────────────────────────────────┘
```

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
