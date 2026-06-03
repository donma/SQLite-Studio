const App = {
  async init() {
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

    document.getElementById('btnOpenWelcome').onclick = () => this.openDB();
    document.getElementById('btnNewWelcome').onclick = () => this.newDB();

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
        { label: '匯出資料庫', action: 'export-db' },
        { divider: true },
        { label: '新建 SQL 查詢', action: 'new-query' },
        { label: '新建表', action: 'create-table' },
        { label: '關聯圖 (ERD)', action: 'erd' },
        { divider: true },
        { label: '壓縮資料庫 (VACUUM)', action: 'vacuum' },
        { label: '完整性檢查', action: 'integrity' },
        { divider: true },
        { label: '書籤', action: 'bookmarks' },
        { label: '查詢歷史', action: 'history' }
      ];
      UI.showContextMenu(e.clientX, e.clientY, items).then(action => {
        switch (action) {
          case 'import-csv': TableOps.importCSV(); break;
          case 'export-db': DB.exportAsDownload(); break;
          case 'new-query': if (DB.db) Editor.openQuery(); break;
          case 'create-table': if (DB.db) TableOps.showCreateTableDialog(); break;
          case 'erd': if (DB.db) ERD.open(); break;
          case 'vacuum': this.vacuumDB(); break;
          case 'integrity': this.checkIntegrity(); break;
          case 'bookmarks': Editor.showBookmarks(); break;
          case 'history': Editor.showHistory(UI.activeTabId || 0); break;
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
        this.onDBReady();
        UI.toast(`已開啟: ${DB.fileName}`, 'success');
      }
    } catch (e) {
      UI.toast('開啟失敗: ' + e.message, 'error');
    }
  },

  newDB() {
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

    if (UI.tabs.length === 0) {
      UI.openDashboard();
    }
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

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) sidebar.classList.toggle('open');
    else sidebar.classList.toggle('collapsed');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
