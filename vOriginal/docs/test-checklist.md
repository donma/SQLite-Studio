# SQLite Studio Web 測試清單

## 瀏覽器測試

- [ ] Chrome 最新版
- [ ] Edge 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版

## 開啟方式

- [ ] file:// 雙擊 index.html
- [ ] localhost HTTP server
- [ ] GitHub Pages

## 基本功能

- [ ] 新建資料庫
- [ ] 開啟 .sqlite
- [ ] 開啟 .db
- [ ] 儲存資料庫
- [ ] 另存新檔
- [ ] 執行 SELECT
- [ ] 執行 INSERT
- [ ] 執行 UPDATE
- [ ] 執行 DELETE
- [ ] 執行 CREATE TABLE
- [ ] 執行 DROP TABLE

## 修改標記驗證

- [ ] SELECT 不會標記 modified
- [ ] PRAGMA 不會標記 modified
- [ ] INSERT 會標記 modified
- [ ] UPDATE 會標記 modified
- [ ] DELETE 會標記 modified
- [ ] CREATE TABLE 會標記 modified
- [ ] DROP TABLE 會標記 modified
- [ ] modified 狀態下關閉頁面會提示

## 表格功能

- [ ] 瀏覽資料表
- [ ] 分頁（預設 100 筆）
- [ ] 分頁切換
- [ ] 新增資料
- [ ] 編輯資料
- [ ] 行內編輯（雙擊）
- [ ] 刪除資料
- [ ] 新增欄位
- [ ] 欄位排序（上移/下移）
- [ ] 排序失敗會 rollback

## Schema 功能

- [ ] 查看 table schema
- [ ] 查看 index
- [ ] 新增 index
- [ ] 刪除 index
- [ ] 查看 trigger
- [ ] 查看 view
- [ ] ERD 顯示 foreign key
- [ ] ERD 縮放/平移

## 匯入匯出

- [ ] 匯入 CSV（預覽）
- [ ] 匯入 CSV（追加模式）
- [ ] 匯出 CSV
- [ ] 匯出 JSON
- [ ] 匯出 SQL
- [ ] 匯出 SQLite database
- [ ] 匯出 ERD SVG

## 安全操作

- [ ] DROP TABLE 前有確認訊息（含表名）
- [ ] DELETE 資料前有確認訊息
- [ ] TRUNCATE 前有確認訊息
- [ ] DROP VIEW 前有確認訊息
- [ ] DROP TRIGGER 前有確認訊息
- [ ] DROP INDEX 前有確認訊息
- [ ] 欄位重建失敗會 rollback
- [ ] 欄位重建失敗會顯示失敗物件清單

## SQL 編輯器

- [ ] 語法高亮
- [ ] 執行全部
- [ ] 執行選取
- [ ] 多語句執行
- [ ] 格式化
- [ ] 查詢歷史
- [ ] 書籤
- [ ] Ctrl+Enter 執行
- [ ] Tab 縮排

## 其他

- [ ] VACUUM 壓縮
- [ ] 完整性檢查
- [ ] 側邊欄搜尋
- [ ] Toast 通知
- [ ] 右鍵選單
- [ ] RWD 手機版
- [ ] RWD 平板版
