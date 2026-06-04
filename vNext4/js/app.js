const App = {
  async init() {
    this.initTheme();
    UI.setStatus('正在載入 SQL.js 引擎...');
    try {
      await DB.init();
      Editor.init();
      UI.setStatus('就緒');
    } catch (e) {
      UI.setStatus('SQL.js 載入失敗');
      UI.toast('SQL.js 引擎載入失敗，請檢查網路連線', 'error');
    }

    this.bindEvents();
    this.tryRestore();
  },

  bindEvents() {
    document.getElementById('btnOpen').onclick = () => this.openDB();
    document.getElementById('btnSave').onclick = () => this.saveDB();
    document.getElementById('btnNewDB').onclick = () => this.newDB();
    document.getElementById('toggleSidebar').onclick = () => this.toggleSidebar();
    document.getElementById('btnTheme').onclick = () => this.toggleTheme();

    document.getElementById('btnOpenWelcome').onclick = () => this.openDB();
    document.getElementById('btnNewWelcome').onclick = () => this.newDB();
    document.getElementById('btnSampleWelcome').onclick = () => SampleDB.generate();

    document.getElementById('btnNewTab').onclick = () => {
      if (!DB.db) { UI.toast('請先開啟數據庫', 'info'); return; }
      Editor.openQuery();
    };

    document.getElementById('modalClose').onclick = () => UI.closeModal();
    document.getElementById('modalOverlay').onclick = (e) => {
      if (e.target === e.currentTarget) UI.closeModal();
    };

    document.getElementById('tableSearch').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.table-item').forEach(el => {
        el.style.display = el.dataset.table?.toLowerCase().includes(q) || el.dataset.action ? '' : 'none';
      });
    };

    // More menu button
    document.getElementById('btnMore').onclick = (e) => {
      const items = [
        { label: '匯入 CSV', action: 'import-csv' },
        { label: '匯入 SQL 檔案', action: 'import-sql' },
        { label: '匯出資料庫', action: 'export-db' },
        { label: '搜尋全部資料表', action: 'search-all' },
        { divider: true },
        { label: '新建 SQL 查詢', action: 'new-query' },
        { label: '新建表', action: 'create-table' },
        { label: '關聯圖 (ERD)', action: 'erd' },
        { divider: true },
        { label: '比較數據庫', action: 'compare-db' },
        { label: '產生遷移腳本', action: 'generate-migration' },
        { divider: true },
        { label: '壓縮資料庫 (VACUUM)', action: 'vacuum' },
        { label: '完整性檢查', action: 'integrity' },
        { divider: true },
        { label: '書籤', action: 'bookmarks' },
        { label: '查詢歷史', action: 'history' },
        { divider: true },
        { label: '還原備份', action: 'restore-backups' }
      ];
      UI.showContextMenu(e.clientX, e.clientY, items).then(action => {
        switch (action) {
          case 'import-csv': TableOps.importCSV(); break;
          case 'import-sql': this.importSQLFile(); break;
          case 'export-db': DB.exportAsDownload(); break;
          case 'search-all': this.searchAllTables(); break;
          case 'new-query': if (DB.db) Editor.openQuery(); break;
          case 'create-table': if (DB.db) TableOps.showCreateTableDialog(); break;
          case 'erd': if (DB.db) ERD.open(); break;
          case 'compare-db': Enhancements2.showCompareDialog(); break;
          case 'generate-migration': Enhancements2.showMigrationDialog(); break;
          case 'vacuum': this.vacuumDB(); break;
          case 'integrity': this.checkIntegrity(); break;
          case 'bookmarks': Editor.showBookmarks(); break;
          case 'history': Editor.showHistory(UI.activeTabId || 0); break;
          case 'restore-backups': Enhancements.showRestoreDialog(); break;
        }
      });
    };

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.saveDB(); }
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); this.openDB(); }
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); this.newDB(); }
      if (e.key === 'Escape') {
        UI.closeModal();
        document.getElementById('contextMenu').style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !e.target.closest('#toggleSidebar')) {
        sidebar.classList.remove('open');
      }
    });

    window.addEventListener('beforeunload', (e) => {
      if (DB.db && DB.modified) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  },

  async tryRestore() {
    UI.setStatus('正在恢復上次會話...');
    const restored = await DB.openLast();
    if (restored) {
      this.onDBReady();
      UI.toast(`已恢復: ${DB.fileName}`, 'success');
    }
    UI.setStatus('就緒');
  },

  async openDB() {
    try {
      const opened = await DB.openFile();
      if (opened) {
        // Close all existing tabs and clear DOM
        document.getElementById('tabs').innerHTML = '';
        document.getElementById('tabPanels').innerHTML = '';
        UI.tabs = [];
        UI.activeTabId = null;
        document.getElementById('tabBar').style.display = 'none';
        document.getElementById('tabPanels').style.display = 'none';

        this.onDBReady();
        UI.toast(`已開啟: ${DB.fileName}`, 'success');
      }
    } catch (e) {
      UI.toast('開啟失敗: ' + e.message, 'error');
    }
  },

  newDB() {
    // Close all existing tabs and clear DOM
    document.getElementById('tabs').innerHTML = '';
    document.getElementById('tabPanels').innerHTML = '';
    UI.tabs = [];
    UI.activeTabId = null;
    document.getElementById('tabBar').style.display = 'none';
    document.getElementById('tabPanels').style.display = 'none';

    DB.create();
    this.onDBReady();
    UI.toast('已建立新數據庫', 'success');
  },

  async saveDB() {
    if (!DB.db) return;
    try {
      const saved = await DB.save();
      if (saved) {
        UI.toast('已儲存', 'success');
        UI.updateHeader();
      }
    } catch (e) {
      UI.toast('儲存失敗: ' + e.message, 'error');
    }
  },

  onDBReady() {
    UI.updateHeader();
    UI.renderSidebar();
    document.getElementById('welcomeScreen').style.display = 'none';

    const info = DB.getDatabaseInfo();
    UI.setStatus(`已連線`, `${info.tableCount} 表 · ${info.viewCount} 視圖 · ${info.triggerCount} 觸發器 · ${info.indexCount} 索引`);

    // Hook auto-backup for destructive operations
    if (!DB._backupHooked) {
      const origExecute = DB.execute.bind(DB);
      const origRun = DB.run.bind(DB);
      DB.execute = function(sql, params) {
        const op = Enhancements.isDestructiveSQL(sql);
        if (op) Enhancements.autoBackup(`${op}: ${sql.substring(0, 60)}`);
        return origExecute(sql, params);
      };
      DB.run = function(sql, params) {
        const op = Enhancements.isDestructiveSQL(sql);
        if (op) Enhancements.autoBackup(`${op}: ${sql.substring(0, 60)}`);
        return origRun(sql, params);
      };
      DB._backupHooked = true;
    }

    if (UI.tabs.length === 0) {
      UI.openDashboard();
    }
  },

  importSQLFile() {
    if (!DB.db) { UI.toast('請先開啟數據庫', 'error'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql,.txt';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const statements = text.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
        let success = 0, failed = 0, errors = [];
        for (const stmt of statements) {
          try { DB.execute(stmt); success++; } catch (e) { failed++; errors.push(e.message); }
        }
        UI.renderSidebar();
        UI.updateHeader();
        if (failed === 0) {
          UI.toast(`SQL 已匯入: ${success} 條語句全部成功`, 'success');
        } else {
          UI.showModal('SQL 匯入結果', `
            <p>成功: ${success} 條</p>
            <p style="color:var(--red)">失敗: ${failed} 條</p>
            <div style="max-height:200px;overflow:auto;margin-top:12px">
              ${errors.slice(0, 10).map(e => `<div style="padding:4px;font-size:12px;color:var(--red);font-family:var(--font-mono)">${UI.esc(e)}</div>`).join('')}
              ${errors.length > 10 ? `<div style="padding:4px;color:var(--text-muted)">...還有 ${errors.length - 10} 條錯誤</div>` : ''}
            </div>`,
            '<button class="btn btn-primary" onclick="UI.closeModal()">確定</button>');
        }
      } catch (e) {
        UI.toast('讀取檔案失敗: ' + e.message, 'error');
      }
    };
    input.click();
  },

  searchAllTables() {
    if (!DB.db) { UI.toast('請先開啟數據庫', 'error'); return; }

    UI.showModal('搜尋全部資料表', `
      <div class="form-group">
        <label class="form-label">搜尋關鍵字</label>
        <input class="form-input" id="globalSearchInput" placeholder="輸入要搜尋的文字...">
      </div>
      <div id="globalSearchResults" style="margin-top:12px"></div>`,
      '<button class="btn btn-ghost" onclick="UI.closeModal()">關閉</button>');

    const input = document.getElementById('globalSearchInput');
    const results = document.getElementById('globalSearchResults');
    let timeout;

    input.oninput = () => {
      clearTimeout(timeout);
      const keyword = input.value.trim();
      if (!keyword) { results.innerHTML = ''; return; }

      timeout = setTimeout(() => {
        const tables = DB.getTableNames();
        let html = '';
        let totalMatches = 0;

        tables.forEach(t => {
          try {
            const info = DB.getTableInfo(t);
            const textCols = info.filter(c => c.type?.toUpperCase().includes('TEXT') || c.type === '');
            if (textCols.length === 0) return;

            const conditions = textCols.map(c => `${SqlUtils.quoteIdent(c.name)} LIKE ?`).join(' OR ');
            const params = textCols.map(() => `%${keyword}%`);
            const result = DB.query(`SELECT COUNT(*) FROM ${SqlUtils.quoteIdent(t)} WHERE ${conditions}`, params);
            const count = result[0]?.values[0]?.[0] ?? 0;

            if (count > 0) {
              totalMatches += count;
              html += `<div style="padding:8px;border-bottom:1px solid var(--border);cursor:pointer" data-table="${UI.esc(t)}">
                <strong>${UI.esc(t)}</strong>
                <span style="color:var(--text-muted);margin-left:8px">${count} 筆符合</span>
              </div>`;
            }
          } catch {}
        });

        if (totalMatches === 0) {
          results.innerHTML = '<p style="color:var(--text-muted)">無符合結果</p>';
        } else {
          results.innerHTML = `<p style="color:var(--text-secondary);margin-bottom:8px">共 ${totalMatches} 筆符合</p>${html}`;
          results.querySelectorAll('[data-table]').forEach(el => {
            el.onclick = () => {
              UI.closeModal();
              UI.openTableTab(el.dataset.table, 'table');
            };
          });
        }
      }, 300);
    };

    input.focus();
  },

  vacuumDB() {
    if (!DB.db) { UI.toast('請先開啟數據庫', 'error'); return; }
    try {
      const result = DB.vacuum();
      const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      };
      const saved = result.saved;
      if (saved > 0) {
        UI.toast(`壓縮完成！節省 ${formatSize(saved)} (${formatSize(result.before)} → ${formatSize(result.after)})`, 'success');
      } else {
        UI.toast('資料庫已經是最優狀態', 'info');
      }
      UI.updateHeader();
    } catch (e) {
      UI.toast('壓縮失敗: ' + e.message, 'error');
    }
  },

  checkIntegrity() {
    if (!DB.db) { UI.toast('請先開啟數據庫', 'error'); return; }
    try {
      const results = DB.integrityCheck();
      const isOK = results.length === 1 && results[0][0] === 'ok';
      if (isOK) {
        UI.showModal('完整性檢查', `
          <div style="text-align:center;padding:20px">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>
            <h3 style="margin-top:12px;color:var(--green)">檢查通過</h3>
            <p style="color:var(--text-secondary);margin-top:8px">資料庫完整性無問題</p>
          </div>`,
          '<button class="btn btn-primary" onclick="UI.closeModal()">確定</button>');
      } else {
        let html = '<div style="max-height:300px;overflow-y:auto">';
        html += '<p style="color:var(--red);margin-bottom:12px">發現以下問題：</p>';
        results.forEach(row => {
          html += `<div style="padding:8px;background:var(--red-bg);border-radius:4px;margin-bottom:4px;font-family:var(--font-mono);font-size:12px">${UI.esc(row[0])}</div>`;
        });
        html += '</div>';
        UI.showModal('完整性檢查', html,
          '<button class="btn btn-primary" onclick="UI.closeModal()">確定</button>');
      }
    } catch (e) {
      UI.toast('檢查失敗: ' + e.message, 'error');
    }
  },

  toggleTheme() {
    document.documentElement.classList.toggle('light');
    const isLight = document.documentElement.classList.contains('light');
    Storage.savePref('theme', isLight ? 'light' : 'dark');
    const btn = document.getElementById('btnTheme');
    btn.innerHTML = isLight
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  },

  initTheme() {
    const saved = Storage.getPref('theme', 'dark');
    if (saved === 'light') {
      document.documentElement.classList.add('light');
      document.getElementById('btnTheme').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) sidebar.classList.toggle('open');
    else sidebar.classList.toggle('collapsed');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
