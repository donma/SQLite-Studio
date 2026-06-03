# SQLite Studio

純前端 SQLite 資料庫管理工具，無需後端伺服器，數據完全留在瀏覽器內。

## 功能清單

### 資料庫管理
- 開啟 / 新建 / 儲存 SQLite 資料庫
- 資料庫總覽儀表板（表數量、視圖、觸發器、索引、大小統計）
- 匯出資料庫為 .sqlite 檔案
- VACUUM 壓縮資料庫
- 完整性檢查 (PRAGMA integrity_check)

### 關聯圖 (ERD)
- 自動繪製表關聯圖
- dagre 演算法自動排版
- 外鍵連線箭頭
- 滑鼠滾輪縮放 / 拖曳平移
- 觸控手勢支援
- 匯出 SVG
- 點擊表可直接瀏覽資料

### 表操作
- 建表 UI（表單式，無需寫 SQL）
- 重新命名表
- 複製表
- 清空表 (TRUNCATE)
- 刪除表
- 右鍵選單快速操作

### 資料操作
- 資料瀏覽（分頁 / 排序 / 篩選）
- 新增資料列
- 編輯資料列（彈窗式）
- 行內編輯（雙擊儲存格直接修改）
- 刪除資料列
- 匯出 CSV / JSON

### 結構管理
- 檢視表結構（欄位、類型、主鍵、預設值）
- 新增欄位
- 欄位排序（上下移動，自動重建表）
- 查看 CREATE SQL
- 匯出 SQL

### 索引管理
- 檢視索引列表
- 新增索引（一般 / 唯一）
- 刪除索引

### 外鍵檢視器
- 檢視表的外鍵關係
- 反向檢視（哪些表引用此表）
- 顯示 ON UPDATE / ON DELETE 行為

### 視圖 / 觸發器
- 檢視視圖列表
- 查看視圖定義 SQL
- 刪除視圖
- 檢視觸發器列表
- 查看觸發器定義 SQL
- 刪除觸發器

### SQL 編輯器
- 語法高亮（關鍵字 / 函數 / 字串 / 數字 / 註解）
- 執行全部語句
- 執行選取語句
- 多語句執行（分號分隔，逐條顯示結果）
- SQL 格式化
- Tab 縮排
- Ctrl+Enter 快速執行

### 查詢輔助
- 查詢歷史紀錄（最多 200 條）
- 書籤功能
- 篩選條件產生器

### 匯入 / 匯出
- 匯入 CSV（自動建立表）
- 匯出表資料為 SQL
- 匯出表資料為 CSV
- 匯出表資料為 JSON
- 匯出 ERD 為 SVG

### 介面
- 暗色主題
- RWD 響應式設計（手機 / 平板 / 桌面）
- 側邊欄表列表搜尋
- Tab 多分頁
- Toast 通知
- Modal 彈窗
- Context Menu 右鍵選單

### 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl + O` | 開啟資料庫 |
| `Ctrl + S` | 儲存資料庫 |
| `Ctrl + N` | 新建資料庫 |
| `Ctrl + Enter` | 執行 SQL |
| `Tab` | 縮排 |
| `Escape` | 關閉彈窗 |

### 技術特性
- 純前端，零後端
- 支援 `file://` 協議
- sql.js (WebAssembly/asm.js) 執行 SQLite
- dagre 自動圖形佈局
- File System Access API 持久化
- IndexedDB 儲存檔案句柄
- 離線可用

## 使用方式

### 直接開啟
雙擊 `index.html` 即可使用（需 Chromium 瀏覽器）。

### 本地伺服器（選用）
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```
開啟 `http://localhost:8000`

### 產生範例資料庫
1. 開啟 `generate_sample.html`
2. 點擊「Generate & Download」
3. 將下載的 `sample.sqlite` 放入專案目錄
4. 在 SQLite Studio 中開啟

## 檔案結構

```
DBLAB/
├── index.html              # 主頁面
├── generate_sample.html    # 範例資料庫產生器
├── README.md
├── css/
│   └── style.css           # 樣式（暗色主題 + RWD）
├── js/
│   ├── app.js              # 主程式入口
│   ├── db.js               # SQLite 資料庫操作
│   ├── editor.js           # SQL 編輯器 + 語法高亮 + 歷史 + 書籤
│   ├── erd.js              # 關聯圖（SVG + dagre）
│   ├── storage.js          # IndexedDB 持久化
│   ├── table.js            # 表操作 CRUD + 匯入匯出
│   └── ui.js               # UI 渲染 + 行內編輯 + 儀表板
└── lib/
    ├── sql-asm.js          # sql.js asm.js 版本
    └── dagre.min.js        # 圖形自動佈局
```

## 瀏覽器支援

| 瀏覽器 | 支援 |
|--------|------|
| Chrome / Edge | ✅ 完整支援（含 File System Access API） |
| Firefox | ✅ 基本支援（檔案需手動選取） |
| Safari | ✅ 基本支援（檔案需手動選取） |

## 授權

MIT License
