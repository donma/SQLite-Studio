const UI = {
  tabs: [],
  activeTabId: null,
  tabCounter: 0,
  cellSelection: {
    active: false,
    startRow: -1,
    startCol: -1,
    endRow: -1,
    endCol: -1,
    tableEl: null
  },

  // ── Toast ──
  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // ── Status Bar ──
  setStatus(text, info = '') {
    document.getElementById('statusText').textContent = text;
    document.getElementById('statusInfo').textContent = info;
  },

  // ── Modal ──
  showModal(title, bodyHTML, footerHTML = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').style.display = 'flex';
  },

  closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  },

  // ── Context Menu ──
  showContextMenu(x, y, items) {
    const menu = document.getElementById('contextMenu');
    menu.innerHTML = items.map(item => {
      if (item.divider) return '<div class="context-divider"></div>';
      return `<div class="context-item${item.danger ? ' danger' : ''}" data-action="${item.action}">${item.icon || ''}<span>${item.label}</span></div>`;
    }).join('');

    menu.style.display = 'block';
    menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - menu.offsetHeight - 10) + 'px';

    const close = (e) => {
      if (!menu.contains(e.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);

    return new Promise(resolve => {
      menu.querySelectorAll('.context-item').forEach(el => {
        el.onclick = () => {
          menu.style.display = 'none';
          resolve(el.dataset.action);
        };
      });
    });
  },

  // ── Sidebar ──
  renderSidebar() {
    const container = document.getElementById('tableList');
    if (!DB.db) {
      container.innerHTML = `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        <p>開啟或新建數據庫</p>
      </div>`;
      return;
    }

    const tables = DB.getTableNames();
    const views = DB.getViewNames();
    const triggers = DB.getTriggerNames();
    let html = '';

    // Dashboard link
    html += `<div class="table-item" data-action="dashboard" style="color:var(--accent)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      <span class="table-item-name">資料庫總覽</span>
    </div>
    <div class="table-item" data-action="erd" style="color:var(--blue)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      <span class="table-item-name">關聯圖</span>
    </div>`;

    if (tables.length > 0) {
      html += `<div class="sidebar-section">
        <div class="sidebar-section-title">
          <span>表 (${tables.length})</span>
          <button class="icon-btn" data-action="create-table" title="新建表" style="width:20px;height:20px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>`;
      tables.forEach(t => {
        const count = DB.getTableCount(t);
        html += `<div class="table-item" data-table="${this.esc(t)}" data-type="table">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          <span class="table-item-name">${this.esc(t)}</span>
          <span class="table-item-count">${count}</span>
        </div>`;
      });
      html += '</div>';
    }

    if (views.length > 0) {
      html += `<div class="sidebar-section">
        <div class="sidebar-section-title"><span>視圖 (${views.length})</span></div>`;
      views.forEach(v => {
        html += `<div class="table-item" data-table="${this.esc(v)}" data-type="view">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <span class="table-item-name">${this.esc(v)}</span>
        </div>`;
      });
      html += '</div>';
    }

    if (triggers.length > 0) {
      html += `<div class="sidebar-section">
        <div class="sidebar-section-title"><span>觸發器 (${triggers.length})</span></div>`;
      triggers.forEach(t => {
        html += `<div class="table-item" data-table="${this.esc(t)}" data-type="trigger">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
          <span class="table-item-name">${this.esc(t)}</span>
        </div>`;
      });
      html += '</div>';
    }

    if (tables.length === 0 && views.length === 0) {
      html += `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        <p>數據庫為空</p>
      </div>`;
    }

    container.innerHTML = html;

    // Dashboard click
    container.querySelector('[data-action="dashboard"]')?.addEventListener('click', () => {
      this.openDashboard();
    });

    // ERD click
    container.querySelector('[data-action="erd"]')?.addEventListener('click', () => {
      ERD.open();
    });

    // Create table click
    container.querySelector('[data-action="create-table"]')?.addEventListener('click', () => {
      TableOps.showCreateTableDialog();
    });

    container.querySelectorAll('.table-item[data-table]').forEach(el => {
      el.onclick = () => {
        container.querySelectorAll('.table-item[data-table]').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        const type = el.dataset.type;
        if (type === 'trigger') {
          this.openTriggerTab(el.dataset.table);
        } else {
          this.openTableTab(el.dataset.table, type);
        }
      };
      el.oncontextmenu = async (e) => {
        e.preventDefault();
        const tableName = el.dataset.table;
        const type = el.dataset.type;
        const items = type === 'view' ? [
          { label: '瀏覽數據', action: 'browse' },
          { label: '查看定義', action: 'view-sql' },
          { label: '刪除視圖', action: 'drop-view', danger: true }
        ] : type === 'trigger' ? [
          { label: '查看定義', action: 'view-sql' },
          { label: '刪除觸發器', action: 'drop-trigger', danger: true }
        ] : [
          { label: '瀏覽數據', action: 'browse' },
          { label: '查看結構', action: 'structure' },
          { label: '外鍵關係', action: 'foreign-keys' },
          { label: '索引管理', action: 'indexes' },
          { divider: true },
          { label: '匯出 SQL', action: 'exportSQL' },
          { label: '匯出 CSV', action: 'exportCSV' },
          { label: '匯出 JSON', action: 'exportJSON' },
          { label: '匯出 (遮罩)', action: 'export-masked' },
          { divider: true },
          { label: '生成資料', action: 'generate-data' },
          { label: '複製表', action: 'duplicate' },
          { label: '清空表', action: 'truncate' },
          { label: '刪除表', action: 'drop', danger: true }
        ];
        const action = await UI.showContextMenu(e.clientX, e.clientY, items);
        this.handleTableContextAction(tableName, type, action);
      };
    });
  },

  handleTableContextAction(tableName, type, action) {
    switch (action) {
      case 'browse': this.openTableTab(tableName, type); break;
      case 'structure': this.openStructureTab(tableName); break;
      case 'foreign-keys': this.openForeignKeysTab(tableName); break;
      case 'indexes': this.openIndexesTab(tableName); break;
      case 'exportSQL': TableOps.exportSQL(tableName); break;
      case 'exportCSV': TableOps.exportCSV(tableName); break;
      case 'exportJSON': TableOps.exportJSON(tableName); break;
      case 'export-masked': Enhancements2.showMaskedExportDialog(tableName); break;
      case 'generate-data': Enhancements2.showGenerateDataDialog(tableName); break;
      case 'duplicate': TableOps.duplicateTable(tableName); break;
      case 'truncate': TableOps.truncateTable(tableName); break;
      case 'drop': TableOps.dropTable(tableName); break;
      case 'drop-view': TableOps.dropView(tableName); break;
      case 'drop-trigger': TableOps.dropTrigger(tableName); break;
      case 'view-sql': this.showCreateSQL(tableName); break;
    }
  },

  showCreateSQL(name) {
    try {
      const result = DB.run(`SELECT sql FROM sqlite_master WHERE name = ?`, [name]);
      const sql = result[0]?.values[0]?.[0] || 'N/A';
      this.showModal(name, `<pre style="font-family:var(--font-mono);font-size:13px;line-height:1.6;white-space:pre-wrap;color:var(--text-secondary)">${this.esc(sql)}</pre>`);
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  // ── Dashboard ──
  openDashboard() {
    const existing = this.tabs.find(t => t.type === 'dashboard');
    if (existing) { this.activateTab(existing.id); return; }

    const info = DB.getDatabaseInfo();
    const icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';

    const formatSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    let tablesHTML = '';
    info.tables.forEach(t => {
      const count = DB.getTableCount(t);
      const cols = DB.getTableInfo(t).length;
      tablesHTML += `<div class="table-list-item" data-table="${this.esc(t)}">
        <span class="table-list-item-name">${this.esc(t)}</span>
        <span class="table-list-item-meta">${cols} 欄 · ${count} 行</span>
      </div>`;
    });

    const panelHTML = `
      <div class="dashboard">
        <div class="dashboard-grid">
          <div class="stat-card">
            <div class="stat-card-icon purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            </div>
            <div class="stat-card-value">${info.tableCount}</div>
            <div class="stat-card-label">資料表</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <div class="stat-card-value">${info.viewCount}</div>
            <div class="stat-card-label">視圖</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
            </div>
            <div class="stat-card-value">${info.triggerCount}</div>
            <div class="stat-card-label">觸發器</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon yellow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </div>
            <div class="stat-card-value">${info.indexCount}</div>
            <div class="stat-card-label">索引</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon red">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14,2H6A2,2,0,0,0,4,4V20a2,2,0,0,0,2,2H18a2,2,0,0,0,2-2V8Z"/><polyline points="14,2 14,8 20,8"/></svg>
            </div>
            <div class="stat-card-value">${formatSize(info.size)}</div>
            <div class="stat-card-label">資料庫大小</div>
          </div>
        </div>

        <div class="dashboard-section">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
            資料表
          </h3>
          <div class="table-list-compact">${tablesHTML || '<p style="color:var(--text-muted)">無資料表</p>'}</div>
        </div>

        ${info.views.length > 0 ? `
        <div class="dashboard-section">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            視圖
          </h3>
          <div class="table-list-compact">
            ${info.views.map(v => `<div class="table-list-item" data-table="${this.esc(v)}"><span class="table-list-item-name">${this.esc(v)}</span></div>`).join('')}
          </div>
        </div>` : ''}

        ${info.triggers.length > 0 ? `
        <div class="dashboard-section">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
            觸發器
          </h3>
          <div class="table-list-compact">
            ${info.triggers.map(t => `<div class="table-list-item" data-table="${this.esc(t)}"><span class="table-list-item-name">${this.esc(t)}</span></div>`).join('')}
          </div>
        </div>` : ''}
      </div>`;

    const tabId = this.createTab('資料庫總覽', icon, panelHTML);
    const tab = this.tabs.find(t => t.id === tabId);
    tab.type = 'dashboard';

    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    panel.querySelectorAll('.table-list-item[data-table]').forEach(el => {
      el.onclick = () => {
        this.openTableTab(el.dataset.table, 'table');
      };
    });
  },

  // ── Tabs ──
  createTab(title, icon, panelHTML, onActivate) {
    const id = ++this.tabCounter;
    const tab = { id, title, icon, panelHTML, onActivate };
    this.tabs.push(tab);

    const tabBar = document.getElementById('tabBar');
    const tabPanels = document.getElementById('tabPanels');
    tabBar.style.display = 'flex';
    tabPanels.style.display = 'flex';

    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.id = id;
    tabEl.innerHTML = `${icon}<span>${this.esc(title)}</span><button class="tab-close" title="關閉"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
    document.getElementById('tabs').appendChild(tabEl);

    const panel = document.createElement('div');
    panel.className = 'tab-panel';
    panel.dataset.id = id;
    panel.innerHTML = panelHTML;
    tabPanels.appendChild(panel);

    tabEl.onclick = (e) => {
      if (e.target.closest('.tab-close')) return;
      this.activateTab(id);
    };
    tabEl.querySelector('.tab-close').onclick = (e) => {
      e.stopPropagation();
      this.closeTab(id);
    };

    this.activateTab(id);
    return id;
  },

  activateTab(id) {
    this.activeTabId = id;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', +t.dataset.id === id));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', +p.dataset.id === id));
    const tab = this.tabs.find(t => t.id === id);
    if (tab && tab.onActivate) tab.onActivate();
  },

  closeTab(id) {
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    this.tabs.splice(idx, 1);

    document.querySelector(`.tab[data-id="${id}"]`)?.remove();
    document.querySelector(`.tab-panel[data-id="${id}"]`)?.remove();

    if (this.tabs.length === 0) {
      document.getElementById('tabBar').style.display = 'none';
      document.getElementById('tabPanels').style.display = 'none';
      this.activeTabId = null;
    } else if (this.activeTabId === id) {
      this.activateTab(this.tabs[Math.min(idx, this.tabs.length - 1)].id);
    }
  },

  findTabByTable(tableName) {
    return this.tabs.find(t => t.tableName === tableName);
  },

  // ── Open Table Tab ──
  openTableTab(tableName, type = 'table') {
    const existing = this.findTabByTable(tableName + '-data');
    if (existing) { this.activateTab(existing.id); return; }

    const info = DB.getTableInfo(tableName);
    const icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>';

    const panelHTML = `
      <div class="data-panel-toolbar">
        <button class="btn btn-sm btn-primary" data-action="insert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新增
        </button>
        <button class="btn btn-sm btn-secondary" data-action="refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          重新整理
        </button>
        <button class="btn btn-sm btn-ghost" data-action="filter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>
          篩選
        </button>
        <button class="btn btn-sm btn-ghost" data-action="export-csv">匯出 CSV</button>
        <input type="text" class="data-search-input" data-field="data-search" placeholder="搜尋...">
        <div class="pagination">
          <button class="icon-btn" data-action="prev-page" title="上一頁"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg></button>
          <span class="pagination-info" data-field="page-info">1 - 100 / 0</span>
          <button class="icon-btn" data-action="next-page" title="下一頁"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg></button>
        </div>
      </div>
      <div class="results-area">
        <div class="table-wrapper" data-field="table-wrapper"></div>
      </div>`;

    const tabId = this.createTab(tableName, icon, panelHTML);
    const tab = this.tabs.find(t => t.id === tabId);
    tab.tableName = tableName + '-data';
    tab.type = 'data';
    tab.offset = 0;
    tab.limit = 100;
    tab.orderBy = null;
    tab.orderDir = 'ASC';
    tab.where = '';

    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);

    panel.querySelector('[data-action="insert"]').onclick = () => TableOps.showInsertDialog(tableName, info);
    panel.querySelector('[data-action="refresh"]').onclick = () => this.loadDataPage(tabId);
    panel.querySelector('[data-action="filter"]').onclick = () => this.showFilterDialog(tabId, tableName);
    panel.querySelector('[data-action="export-csv"]').onclick = () => TableOps.exportCSV(tableName);
    panel.querySelector('[data-action="prev-page"]').onclick = () => {
      if (tab.offset > 0) { tab.offset = Math.max(0, tab.offset - tab.limit); this.loadDataPage(tabId); }
    };
    panel.querySelector('[data-action="next-page"]').onclick = () => {
      const data = DB.getTableData(tableName, { offset: tab.offset, limit: tab.limit, where: tab.where });
      if (tab.offset + tab.limit < data.total) { tab.offset += tab.limit; this.loadDataPage(tabId); }
    };

    const searchInput = panel.querySelector('[data-field="data-search"]');
    this.initDataSearch(searchInput, tabId);

    this.loadDataPage(tabId);
  },

  loadDataPage(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;
    const tableName = tab.tableName.replace('-data', '');
    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    const wrapper = panel.querySelector('[data-field="table-wrapper"]');

    try {
      const data = DB.getTableData(tableName, {
        offset: tab.offset, limit: tab.limit,
        orderBy: tab.orderBy, orderDir: tab.orderDir, where: tab.where
      });

      const info = DB.getTableInfo(tableName);
      const pkCol = info.find(c => c.pk)?.name;

      let html = '<table class="data-table"><thead><tr>';
      html += '<th style="width:40px">#</th>';
      data.columns.forEach((col, i) => {
        const sortIcon = tab.orderBy === col ? (tab.orderDir === 'ASC' ? ' ↑' : ' ↓') : '';
        html += `<th data-col="${this.esc(col)}" data-idx="${i}">${this.esc(col)}${sortIcon}</th>`;
      });
      html += '<th style="width:80px">操作</th></tr></thead><tbody>';

      data.rows.forEach((row, ri) => {
        html += `<tr data-row="${ri}">`;
        html += `<td style="color:var(--text-muted);font-size:11px">${tab.offset + ri + 1}</td>`;
        row.forEach((cell, ci) => {
          const col = data.columns[ci];
          let cls = '';
          let display = '';
          if (cell === null) { cls = 'null'; display = 'NULL'; }
          else {
            const enhanced = Enhancements.renderCell(cell);
            if (enhanced.enhanced) {
              cls = 'enhanced';
              display = enhanced.html;
            } else if (typeof cell === 'number') { cls = 'number'; display = cell; }
            else { cls = 'string'; display = this.esc(String(cell)); }
          }
          html += `<td class="${cls}" data-col="${this.esc(col)}" data-idx="${ci}" data-type="${typeof cell}" title="${this.esc(String(cell ?? 'NULL'))}">${display}</td>`;
        });
        html += `<td><div class="cell-actions">
          <button class="cell-action" data-action="edit-row" title="編輯"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="cell-action" data-action="delete-row" title="刪除"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div></td>`;
        html += '</tr>';
      });

      html += '</tbody></table>';
      wrapper.innerHTML = html;

      // Pagination info
      const pageInfo = panel.querySelector('[data-field="page-info"]');
      const start = data.total > 0 ? tab.offset + 1 : 0;
      const end = Math.min(tab.offset + tab.limit, data.total);
      pageInfo.textContent = `${start} - ${end} / ${data.total}`;

      // Sort click
      wrapper.querySelectorAll('th[data-col]').forEach(th => {
        th.onclick = () => {
          const col = th.dataset.col;
          if (tab.orderBy === col) { tab.orderDir = tab.orderDir === 'ASC' ? 'DESC' : 'ASC'; }
          else { tab.orderBy = col; tab.orderDir = 'ASC'; }
          this.loadDataPage(tabId);
        };
      });

      // Inline edit (double click)
      wrapper.querySelectorAll('td[data-col]').forEach(td => {
        td.ondblclick = () => {
          const ri = +td.closest('tr').dataset.row;
          const ci = +td.dataset.idx;
          const row = data.rows[ri];
          const col = data.columns[ci];
          const currentVal = row[ci];
          this.startInlineEdit(td, tableName, col, currentVal, row, data.columns, info, pkCol, tabId);
        };
      });

      // Row actions
      wrapper.querySelectorAll('[data-action="edit-row"]').forEach(btn => {
        btn.onclick = (e) => {
          const tr = e.target.closest('tr');
          const ri = +tr.dataset.row;
          TableOps.showEditDialog(tableName, data.columns, data.rows[ri], info, pkCol);
        };
      });
      wrapper.querySelectorAll('[data-action="delete-row"]').forEach(btn => {
        btn.onclick = (e) => {
          const tr = e.target.closest('tr');
          const ri = +tr.dataset.row;
          TableOps.deleteRow(tableName, data.columns, data.rows[ri], info, pkCol, () => this.loadDataPage(tabId));
        };
      });

      // Initialize cell selection and keyboard navigation
      const table = wrapper.querySelector('.data-table');
      if (table) {
        this.initCellSelection(table, tabId);
        this.initKeyboardNavigation(table, tabId);
        
        // Make data cells focusable
        table.querySelectorAll('td[data-col]').forEach(td => {
          td.setAttribute('tabindex', '-1');
        });
      }

    } catch (e) {
      wrapper.innerHTML = `<div class="empty-state"><p style="color:var(--red)">${this.esc(e.message)}</p></div>`;
    }
  },

  // ── Inline Edit ──
  startInlineEdit(td, tableName, col, currentVal, row, columns, info, pkCol, tabId) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit-input';
    input.value = currentVal === null ? '' : String(currentVal);

    const originalHTML = td.innerHTML;
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    input.select();

    const finish = (save) => {
      if (save) {
        const newVal = input.value;
        if (newVal !== (currentVal === null ? '' : String(currentVal))) {
          try {
            const whereParts = [];
            const whereValues = [];
            if (pkCol) {
              const pkIdx = columns.indexOf(pkCol);
              whereParts.push(`${SqlUtils.quoteIdent(pkCol)} = ?`);
              whereValues.push(row[pkIdx]);
            } else {
              columns.forEach((c, i) => {
                if (row[i] === null) whereParts.push(`${SqlUtils.quoteIdent(c)} IS NULL`);
                else { whereParts.push(`${SqlUtils.quoteIdent(c)} = ?`); whereValues.push(row[i]); }
              });
            }
            DB.run(`UPDATE ${SqlUtils.quoteIdent(tableName)} SET ${SqlUtils.quoteIdent(col)} = ? WHERE ${whereParts.join(' AND ')}`, [newVal || null, ...whereValues]);
            this.loadDataPage(tabId);
            this.toast('已更新', 'success');
            this.updateHeader();
            this.renderSidebar();
          } catch (e) {
            this.toast(e.message, 'error');
            td.innerHTML = originalHTML;
          }
          return;
        }
      }
      td.innerHTML = originalHTML;
    };

    input.onkeydown = (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    };
    input.onblur = () => finish(true);
  },

  showFilterDialog(tabId, tableName) {
    const tab = this.tabs.find(t => t.id === tabId);
    const info = DB.getTableInfo(tableName);
    const cols = info.map(c => c.name);

    const body = `
      <div class="form-group">
        <label class="form-label">WHERE 條件</label>
        <textarea class="sql-editor" id="filterWhere" rows="3" placeholder="例如: id > 10 AND name LIKE '%test%'">${this.esc(tab.where)}</textarea>
      </div>
      <div style="font-size:12px;color:var(--text-muted)">可用欄位: ${cols.map(c => `<code>${this.esc(c)}</code>`).join(', ')}</div>`;

    const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      <button class="btn btn-ghost" id="filterClear">清除篩選</button>
      <button class="btn btn-primary" id="filterApply">套用</button>`;

    this.showModal('篩選條件', body, footer);

    document.getElementById('filterApply').onclick = () => {
      tab.where = document.getElementById('filterWhere').value.trim();
      tab.offset = 0;
      this.loadDataPage(tabId);
      this.closeModal();
      this.toast('篩選已套用', 'success');
    };
    document.getElementById('filterClear').onclick = () => {
      tab.where = '';
      tab.offset = 0;
      this.loadDataPage(tabId);
      this.closeModal();
    };
  },

  // ── Structure Tab ──
  openStructureTab(tableName) {
    const existing = this.findTabByTable(tableName + '-struct');
    if (existing) { this.activateTab(existing.id); return; }

    const icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14,2H6A2,2,0,0,0,4,4V20a2,2,0,0,0,2,2H18a2,2,0,0,0,2-2V8Z"/><polyline points="14,2 14,8 20,8"/></svg>';
    const info = DB.getTableInfo(tableName);
    const createSQL = DB.getCreateSQL(tableName);

    let structHTML = '<table class="structure-table"><thead><tr>';
    structHTML += '<th style="width:60px">排序</th><th>欄位</th><th>類型</th><th>允許空值</th><th>預設值</th><th>主鍵</th></tr></thead><tbody>';
    info.forEach((col, idx) => {
      const typeClass = col.type?.toLowerCase().includes('int') ? 'integer'
        : col.type?.toLowerCase().includes('text') || col.type?.toLowerCase().includes('char') ? 'text'
        : col.type?.toLowerCase().includes('real') || col.type?.toLowerCase().includes('float') ? 'real'
        : col.type?.toLowerCase().includes('blob') ? 'blob' : 'text';
      structHTML += `<tr>
        <td>
          <div style="display:flex;gap:2px">
            <button class="icon-btn" data-action="move-up" data-col="${this.esc(col.name)}" ${idx === 0 ? 'disabled' : ''} style="width:24px;height:24px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18,15 12,9 6,15"/></svg>
            </button>
            <button class="icon-btn" data-action="move-down" data-col="${this.esc(col.name)}" ${idx === info.length - 1 ? 'disabled' : ''} style="width:24px;height:24px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>
            </button>
          </div>
        </td>
        <td><strong>${this.esc(col.name)}</strong></td>
        <td><span class="type-badge type-${typeClass}">${this.esc(col.type || 'ANY')}</span></td>
        <td>${col.notnull ? '<span style="color:var(--red)">NOT NULL</span>' : '<span style="color:var(--green)">可空</span>'}</td>
        <td style="font-family:var(--font-mono);font-size:12px">${col.default_value !== null ? this.esc(String(col.default_value)) : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${col.pk ? '<span class="pk-badge">PK</span>' : ''}</td>
      </tr>`;
    });
    structHTML += '</tbody></table>';

    const panelHTML = `
      <div class="data-panel-toolbar">
        <button class="btn btn-sm btn-primary" data-action="add-column">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新增欄位
        </button>
        <button class="btn btn-sm btn-ghost" data-action="show-create-sql">查看 CREATE SQL</button>
        <button class="btn btn-sm btn-ghost" data-action="rename-table">重新命名</button>
      </div>
      <div class="results-area">
        <div class="table-wrapper">${structHTML}</div>
      </div>`;

    const tabId = this.createTab(tableName + ' 結構', icon, panelHTML);
    const tab = this.tabs.find(t => t.id === tabId);
    tab.tableName = tableName + '-struct';
    tab.type = 'structure';

    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    panel.querySelector('[data-action="add-column"]').onclick = () => TableOps.showAddColumnDialog(tableName);
    panel.querySelector('[data-action="show-create-sql"]').onclick = () => {
      this.showModal('CREATE SQL', `<pre style="font-family:var(--font-mono);font-size:13px;line-height:1.6;white-space:pre-wrap;color:var(--text-secondary)">${this.esc(createSQL)}</pre>`);
    };
    panel.querySelector('[data-action="rename-table"]').onclick = () => TableOps.renameTable(tableName);

    // Move column buttons
    panel.querySelectorAll('[data-action="move-up"]').forEach(btn => {
      btn.onclick = () => TableOps.moveColumn(tableName, btn.dataset.col, 'up');
    });
    panel.querySelectorAll('[data-action="move-down"]').forEach(btn => {
      btn.onclick = () => TableOps.moveColumn(tableName, btn.dataset.col, 'down');
    });
  },

  // ── Foreign Keys Tab ──
  openForeignKeysTab(tableName) {
    const existing = this.findTabByTable(tableName + '-fk');
    if (existing) { this.activateTab(existing.id); return; }

    const icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

    try {
      const result = DB.run(`PRAGMA foreign_key_list('${tableName.replace(/'/g, "''")}')`);
      const fks = result.length > 0 ? result[0].values : [];

      let fkHTML = '';
      if (fks.length === 0) {
        fkHTML = '<div class="empty-state"><p>此表無外鍵</p></div>';
      } else {
        fks.forEach(fk => {
          const [, , refTable, fromCol, toCol, onUpdate, onDelete] = fk;
          fkHTML += `<div class="fk-card">
            <div class="fk-header">
              <span>${this.esc(tableName)}.${this.esc(fromCol)}</span>
              <span class="fk-arrow">→</span>
              <span>${this.esc(refTable)}.${this.esc(toCol)}</span>
            </div>
            <div class="fk-detail">
              <span>ON UPDATE: <code>${this.esc(onUpdate || 'NO ACTION')}</code></span>
              <span>ON DELETE: <code>${this.esc(onDelete || 'NO ACTION')}</code></span>
            </div>
          </div>`;
        });
      }

      // Also show incoming foreign keys
      let incomingHTML = '';
      try {
        const allTables = DB.getTableNames();
        const incoming = [];
        allTables.forEach(t => {
          if (t === tableName) return;
          const res = DB.run(`PRAGMA foreign_key_list('${t.replace(/'/g, "''")}')`);
          if (res.length > 0) {
            res[0].values.forEach(fk => {
              if (fk[2] === tableName) incoming.push({ fromTable: t, fromCol: fk[3], toCol: fk[4] });
            });
          }
        });
        if (incoming.length > 0) {
          incomingHTML = '<h3 style="margin:20px 0 12px;font-size:15px">被引用 (反向外鍵)</h3>';
          incoming.forEach(inc => {
            incomingHTML += `<div class="fk-card">
              <div class="fk-header">
                <span>${this.esc(inc.fromTable)}.${this.esc(inc.fromCol)}</span>
                <span class="fk-arrow">→</span>
                <span>${this.esc(tableName)}.${this.esc(inc.toCol)}</span>
              </div>
            </div>`;
          });
        }
      } catch {}

      const panelHTML = `<div style="padding:16px;overflow-y:auto;height:100%">${fkHTML}${incomingHTML}</div>`;
      const tabId = this.createTab(tableName + ' 外鍵', icon, panelHTML);
      const tab = this.tabs.find(t => t.id === tabId);
      tab.tableName = tableName + '-fk';
      tab.type = 'fk';

    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  // ── Indexes Tab ──
  openIndexesTab(tableName) {
    const existing = this.findTabByTable(tableName + '-idx');
    if (existing) { this.activateTab(existing.id); return; }

    const icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>';

    try {
      const result = DB.run(`PRAGMA index_list('${tableName.replace(/'/g, "''")}')`);
      const indexes = result.length > 0 ? result[0].values : [];

      let idxHTML = '';
      if (indexes.length === 0) {
        idxHTML = '<div class="empty-state"><p>此表無索引</p></div>';
      } else {
        idxHTML = '<table class="manager-list"><thead><tr><th>名稱</th><th>唯一</th><th>欄位</th><th>SQL</th><th>操作</th></tr></thead><tbody>';
        indexes.forEach(idx => {
          const [seq, name, unique, origin, partial] = idx;
          let cols = [];
          try {
            const colResult = DB.run(`PRAGMA index_info('${name.replace(/'/g, "''")}')`);
            if (colResult.length > 0) cols = colResult[0].values.map(r => r[2]);
          } catch {}
          let sql = '';
          try {
            const sqlResult = DB.run(`SELECT sql FROM sqlite_master WHERE name = ?`, [name]);
            sql = sqlResult[0]?.values[0]?.[0] || '';
          } catch {}

          idxHTML += `<tr>
            <td><strong>${this.esc(name)}</strong></td>
            <td>${unique ? '<span style="color:var(--green)">是</span>' : '否'}</td>
            <td><code>${cols.map(c => this.esc(c)).join(', ')}</code></td>
            <td class="sql-preview" title="${this.esc(sql)}">${this.esc(sql)}</td>
            <td><button class="btn btn-sm btn-danger" data-idx="${this.esc(name)}">刪除</button></td>
          </tr>`;
        });
        idxHTML += '</tbody></table>';
      }

      const panelHTML = `
        <div class="data-panel-toolbar">
          <button class="btn btn-sm btn-primary" data-action="add-index">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新增索引
          </button>
        </div>
        <div class="results-area"><div class="table-wrapper" style="padding:12px">${idxHTML}</div></div>`;

      const tabId = this.createTab(tableName + ' 索引', icon, panelHTML);
      const tab = this.tabs.find(t => t.id === tabId);
      tab.tableName = tableName + '-idx';
      tab.type = 'index';

      const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
      panel.querySelector('[data-action="add-index"]').onclick = () => TableOps.showAddIndexDialog(tableName);
      panel.querySelectorAll('[data-idx]').forEach(btn => {
        btn.onclick = () => TableOps.dropIndex(btn.dataset.idx, tableName);
      });

    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  // ── Triggers Tab ──
  openTriggerTab(triggerName) {
    const existing = this.findTabByTable(triggerName + '-trigger');
    if (existing) { this.activateTab(existing.id); return; }

    const icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>';

    try {
      const result = DB.run(`SELECT * FROM sqlite_master WHERE type='trigger' AND name = ?`, [triggerName]);
      const trigger = result[0]?.values[0];
      if (!trigger) { this.toast('觸發器不存在', 'error'); return; }

      const [, name, tbl, sql] = trigger;

      const panelHTML = `
        <div class="data-panel-toolbar">
          <button class="btn btn-sm btn-danger" data-action="drop-trigger">刪除觸發器</button>
          <button class="btn btn-sm btn-ghost" data-action="copy-sql">複製 SQL</button>
        </div>
        <div style="padding:20px;overflow-y:auto;height:100%">
          <div class="form-group">
            <label class="form-label">觸發器名稱</label>
            <div style="font-size:15px;font-weight:600">${this.esc(name)}</div>
          </div>
          <div class="form-group">
            <label class="form-label">關聯表</label>
            <div style="font-family:var(--font-mono);color:var(--blue)">${this.esc(tbl)}</div>
          </div>
          <div class="form-group">
            <label class="form-label">SQL 定義</label>
            <pre style="font-family:var(--font-mono);font-size:13px;line-height:1.6;white-space:pre-wrap;color:var(--text-secondary);background:var(--bg);padding:16px;border-radius:var(--radius);border:1px solid var(--border)">${this.esc(sql)}</pre>
          </div>
        </div>`;

      const tabId = this.createTab(triggerName, icon, panelHTML);
      const tab = this.tabs.find(t => t.id === tabId);
      tab.tableName = triggerName + '-trigger';
      tab.type = 'trigger';

      const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
      panel.querySelector('[data-action="drop-trigger"]').onclick = () => TableOps.dropTrigger(triggerName);
      panel.querySelector('[data-action="copy-sql"]').onclick = () => {
        navigator.clipboard.writeText(sql);
        this.toast('SQL 已複製', 'success');
      };

    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  // ── Update Header ──
  updateHeader() {
    const dbName = document.getElementById('dbName');
    const btnSave = document.getElementById('btnSave');
    if (DB.db) {
      dbName.textContent = DB.fileName + (DB.modified ? ' *' : '');
      btnSave.disabled = false;
    } else {
      dbName.textContent = '未開啟數據庫';
      btnSave.disabled = true;
    }
  },

  // ── Cell Selection ──
  initCellSelection(tableEl, tabId) {
    const sel = this.cellSelection;
    let isSelecting = false;

    tableEl.addEventListener('mousedown', (e) => {
      const td = e.target.closest('td[data-col]');
      if (!td || e.button !== 0) return;
      
      const tr = td.closest('tr');
      const row = +tr.dataset.row;
      const col = +td.dataset.idx;
      
      if (!e.shiftKey) {
        this.clearCellSelection();
        sel.startRow = row;
        sel.startCol = col;
        sel.endRow = row;
        sel.endCol = col;
      } else {
        sel.endRow = row;
        sel.endCol = col;
      }
      sel.active = true;
      sel.tableEl = tableEl;
      isSelecting = true;
      this.updateCellSelection();
    });

    tableEl.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;
      const td = e.target.closest('td[data-col]');
      if (!td) return;
      
      const tr = td.closest('tr');
      const row = +tr.dataset.row;
      const col = +td.dataset.idx;
      
      sel.endRow = row;
      sel.endCol = col;
      this.updateCellSelection();
    });

    document.addEventListener('mouseup', () => {
      isSelecting = false;
    });

    tableEl.addEventListener('contextmenu', (e) => {
      if (!sel.active) return;
      e.preventDefault();
      this.showCellContextMenu(e.clientX, e.clientY, tabId);
    });
  },

  clearCellSelection() {
    const sel = this.cellSelection;
    if (sel.tableEl) {
      sel.tableEl.querySelectorAll('.cell-selected, .cell-selecting').forEach(td => {
        td.classList.remove('cell-selected', 'cell-selecting');
      });
    }
    sel.active = false;
    sel.startRow = -1;
    sel.startCol = -1;
    sel.endRow = -1;
    sel.endCol = -1;
  },

  updateCellSelection() {
    const sel = this.cellSelection;
    if (!sel.tableEl) return;

    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);

    sel.tableEl.querySelectorAll('td').forEach(td => {
      td.classList.remove('cell-selected', 'cell-selecting');
    });

    sel.tableEl.querySelectorAll('tr[data-row]').forEach(tr => {
      const row = +tr.dataset.row;
      if (row < minRow || row > maxRow) return;
      tr.querySelectorAll('td[data-col]').forEach(td => {
        const col = +td.dataset.idx;
        if (col >= minCol && col <= maxCol) {
          td.classList.add('cell-selected');
        }
      });
    });
  },

  getSelectedCellData() {
    const sel = this.cellSelection;
    if (!sel.tableEl || !sel.active) return null;

    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);

    const rows = [];
    sel.tableEl.querySelectorAll('tr[data-row]').forEach(tr => {
      const row = +tr.dataset.row;
      if (row < minRow || row > maxRow) return;
      const rowData = [];
      tr.querySelectorAll('td[data-col]').forEach(td => {
        const col = +td.dataset.idx;
        if (col >= minCol && col <= maxCol) {
          rowData.push(td.textContent);
        }
      });
      rows.push(rowData);
    });

    return { rows, minRow, maxRow, minCol, maxCol };
  },

  async showCellContextMenu(x, y, tabId) {
    const items = [
      { label: '複製', action: 'copy', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' },
      { label: '匯出選取為 CSV', action: 'export-csv', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' }
    ];

    const action = await this.showContextMenu(x, y, items);
    
    if (action === 'copy') {
      this.copySelectedCells();
    } else if (action === 'export-csv') {
      this.exportSelectedCellsAsCSV();
    }
  },

  copySelectedCells() {
    const data = this.getSelectedCellData();
    if (!data) return;

    const text = data.rows.map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.toast('已複製到剪貼簿', 'success');
    }).catch(() => {
      this.toast('複製失敗', 'error');
    });
  },

  exportSelectedCellsAsCSV() {
    const data = this.getSelectedCellData();
    if (!data) return;

    const csv = data.rows.map(row => 
      row.map(cell => {
        if (cell === 'NULL') return '';
        const s = String(cell);
        return s.includes(',') || s.includes('"') || s.includes('\n') 
          ? `"${s.replace(/"/g, '""')}"` 
          : s;
      }).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `selection_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.toast('選取範圍已匯出為 CSV', 'success');
  },

  // ── Data Search ──
  initDataSearch(inputEl, tabId) {
    let searchTimeout = null;
    inputEl.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.applyDataSearch(inputEl.value, tabId);
      }, 200);
    });
  },

  applyDataSearch(searchText, tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    const wrapper = panel.querySelector('[data-field="table-wrapper"]');
    const table = wrapper.querySelector('.data-table');
    if (!table) return;

    const search = searchText.toLowerCase().trim();
    
    table.querySelectorAll('tr[data-row]').forEach(tr => {
      let rowMatch = false;
      tr.querySelectorAll('td[data-col]').forEach(td => {
        const text = td.textContent.toLowerCase();
        const originalText = td.getAttribute('title') || td.textContent;
        
        if (search && text.includes(search)) {
          rowMatch = true;
          const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          const display = originalText.replace(regex, '<span class="search-highlight">$1</span>');
          if (td.querySelector('.inline-edit-input')) return;
          td.innerHTML = display;
        } else {
          if (td.querySelector('.inline-edit-input')) return;
          td.textContent = originalText;
        }
      });
      
      if (search) {
        tr.style.display = rowMatch ? '' : 'none';
      } else {
        tr.style.display = '';
      }
    });
  },

  // ── Keyboard Navigation ──
  initKeyboardNavigation(tableEl, tabId) {
    tableEl.setAttribute('tabindex', '0');
    
    tableEl.addEventListener('keydown', (e) => {
      const focused = tableEl.querySelector('td:focus');
      if (!focused) return;

      const tr = focused.closest('tr');
      const row = +tr.dataset.row;
      const col = +focused.dataset.idx;
      
      const allRows = Array.from(tableEl.querySelectorAll('tr[data-row]'));
      const currentRowIdx = allRows.indexOf(tr);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextTd = tr.querySelector(`td[data-idx="${col + 1}"]`);
        if (nextTd) nextTd.focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevTd = tr.querySelector(`td[data-idx="${col - 1}"]`);
        if (prevTd) prevTd.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextRow = allRows[currentRowIdx + 1];
        if (nextRow) {
          const nextTd = nextRow.querySelector(`td[data-idx="${col}"]`);
          if (nextTd) nextTd.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevRow = allRows[currentRowIdx - 1];
        if (prevRow) {
          const prevTd = prevRow.querySelector(`td[data-idx="${col}"]`);
          if (prevTd) prevTd.focus();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          const prevTd = tr.querySelector(`td[data-idx="${col - 1}"]`);
          if (prevTd) { prevTd.focus(); return; }
          const prevRow = allRows[currentRowIdx - 1];
          if (prevRow) {
            const lastTd = prevRow.querySelector('td[data-col]:last-of-type');
            if (lastTd) lastTd.focus();
          }
        } else {
          const nextTd = tr.querySelector(`td[data-idx="${col + 1}"]`);
          if (nextTd) { nextTd.focus(); return; }
          const nextRow = allRows[currentRowIdx + 1];
          if (nextRow) {
            const firstTd = nextRow.querySelector('td[data-col]');
            if (firstTd) firstTd.focus();
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        focused.dispatchEvent(new MouseEvent('dblclick'));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.clearCellSelection();
        tableEl.focus();
      }
    });
  },

  // ── Helper ──
  esc(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
};
