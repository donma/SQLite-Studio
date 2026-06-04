const Enhancements2 = {

  // ══════════════════════════════════════════════════════════
  // Feature 4: EXPLAIN Visualization
  // ══════════════════════════════════════════════════════════

  isExplainQuery(sql) {
    return /^\s*EXPLAIN\b/i.test(sql);
  },

  parseExplainResult(result) {
    if (!result || result.length === 0) return [];
    const rows = result[0].values;
    return rows.map(r => ({
      id: r[0],
      parent: r[1],
      notused: r[2],
      detail: r[3] || ''
    }));
  },

  buildExplainTree(nodes) {
    const map = {};
    nodes.forEach(n => { map[n.id] = { ...n, children: [] }; });
    const roots = [];
    nodes.forEach(n => {
      if (n.parent && map[n.parent]) {
        map[n.parent].children.push(map[n.id]);
      } else if (!n.parent || n.parent === 0) {
        roots.push(map[n.id]);
      }
    });
    return roots;
  },

  renderExplainTreeHTML(nodes, depth = 0) {
    let html = '';
    nodes.forEach(node => {
      const indent = depth * 24;
      const hasChildren = node.children.length > 0;
      const icon = this._getExplainIcon(node.detail);
      html += `<div class="explain-node" style="padding-left:${indent}px" data-id="${node.id}">
        ${hasChildren ? `<span class="explain-toggle" data-target="exp_${node.id}" style="cursor:pointer;user-select:none;color:var(--text-muted);font-size:10px;width:14px;display:inline-block">▼</span>` : '<span style="display:inline-block;width:14px"></span>'}
        <span class="explain-icon">${icon}</span>
        <span class="explain-detail">${UI.esc(node.detail)}</span>
      </div>`;
      if (hasChildren) {
        html += `<div class="explain-children" data-id="exp_${node.id}">${this.renderExplainTreeHTML(node.children, depth + 1)}</div>`;
      }
    });
    return html;
  },

  _getExplainIcon(detail) {
    const d = (detail || '').toUpperCase();
    if (d.includes('SCAN')) return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    if (d.includes('SEARCH')) return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>';
    if (d.includes('USING INDEX')) return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>';
    if (d.includes('TEMP')) return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>';
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  },

  renderExplainResult(result) {
    const nodes = this.parseExplainResult(result);
    if (nodes.length === 0) return '<div class="empty-state"><p>無 EXPLAIN 結果</p></div>';
    const tree = this.buildExplainTree(nodes);
    const html = this.renderExplainTreeHTML(tree);
    return `<div class="explain-tree-container" style="padding:12px;font-family:var(--font-mono);font-size:12px;line-height:2">${html}</div>`;
  },

  initExplainToggles() {
    document.querySelectorAll('.explain-toggle').forEach(el => {
      el.addEventListener('click', () => {
        const target = el.dataset.target;
        const children = document.querySelector(`.explain-children[data-id="${target}"]`);
        if (!children) return;
        const isHidden = children.style.display === 'none';
        children.style.display = isHidden ? '' : 'none';
        el.textContent = isHidden ? '▼' : '▶';
      });
    });
  },

  // Hook into Editor.runSQL to detect EXPLAIN
  hookExplainDetection() {
    const origRunSQL = Editor.runSQL.bind(Editor);
    Editor.runSQL = (tabId, sql) => {
      if (this.isExplainQuery(sql)) {
        this.runExplainQuery(tabId, sql);
      } else {
        origRunSQL(tabId, sql);
      }
    };
  },

  runExplainQuery(tabId, sql) {
    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    const resultsInfo = panel.querySelector('[data-field="results-info"]');
    const wrapper = panel.querySelector('[data-field="results-wrapper"]');
    const tab = UI.tabs.find(t => t.id === tabId);

    try {
      const result = DB.run(sql);
      resultsInfo.style.display = 'flex';
      resultsInfo.innerHTML = '<span class="badge badge-success">EXPLAIN</span>';

      const treeHTML = this.renderExplainResult(result);
      wrapper.innerHTML = treeHTML;
      this.initExplainToggles();
      tab.lastResult = result.length > 0 ? result[0] : null;
    } catch (e) {
      resultsInfo.style.display = 'flex';
      resultsInfo.innerHTML = `<span class="badge badge-error">錯誤</span><span>${UI.esc(e.message)}</span>`;
      wrapper.innerHTML = `<div class="empty-state"><p style="color:var(--red)">${UI.esc(e.message)}</p></div>`;
    }
  },

  // Add "Explain" button to editor toolbar
  addExplainButton(tabId) {
    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    if (!panel) return;
    const toolbar = panel.querySelector('.editor-toolbar');
    if (!toolbar || toolbar.querySelector('[data-action="explain"]')) return;

    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-ghost';
    btn.dataset.action = 'explain';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Explain';
    btn.title = 'EXPLAIN QUERY PLAN';
    btn.onclick = () => {
      const editor = panel.querySelector('[data-field="editor"]');
      const sql = editor.value.trim();
      if (!sql) { UI.toast('請輸入 SQL', 'info'); return; }
      let explainSQL = sql;
      if (!/^\s*EXPLAIN\b/i.test(sql)) {
        explainSQL = 'EXPLAIN QUERY PLAN ' + sql;
      }
      this.runExplainQuery(tabId, explainSQL);
    };
    toolbar.appendChild(btn);
  },

  // ══════════════════════════════════════════════════════════
  // Feature 5: Database Comparison
  // ══════════════════════════════════════════════════════════

  showCompareDialog() {
    if (!DB.db) { UI.toast('請先開啟數據庫', 'error'); return; }

    const body = `
      <div class="form-group">
        <label class="form-label">第一個數據庫 (當前已開啟)</label>
        <div style="padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font-mono);font-size:13px">${UI.esc(DB.fileName)}</div>
      </div>
      <div class="form-group">
        <label class="form-label">第二個數據庫 (.sqlite / .db)</label>
        <input type="file" class="form-input" id="compareFile2" accept=".sqlite,.db,.sqlite3,.db3">
      </div>
      <div id="comparePreview" style="margin-top:12px"></div>`;

    const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      <button class="btn btn-primary" id="compareConfirm">比較</button>`;

    UI.showModal('比較數據庫', body, footer);

    document.getElementById('compareConfirm').onclick = async () => {
      const fileInput = document.getElementById('compareFile2');
      if (!fileInput.files.length) { UI.toast('請選擇第二個數據庫', 'error'); return; }

      try {
        const file = fileInput.files[0];
        const buf = await file.arrayBuffer();
        const db2 = new DB.SQL.Database(new Uint8Array(buf));

        const diff = this.compareDatabases(DB.db, db2, DB.fileName, file.name);
        db2.close();
        UI.closeModal();
        this.showCompareResult(diff);
      } catch (e) {
        UI.toast('比較失敗: ' + e.message, 'error');
      }
    };
  },

  compareDatabases(db1, db2, name1, name2) {
    const getTables = (db) => {
      const r = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
      return r.length > 0 ? r[0].values.map(v => v[0]) : [];
    };
    const getTableInfo = (db, table) => {
      const t = SqlUtils.quoteIdent(table);
      const r = db.exec(`PRAGMA table_info(${t})`);
      if (r.length === 0) return [];
      return r[0].values.map(row => ({ cid: row[0], name: row[1], type: row[2], notnull: row[3], default_value: row[4], pk: row[5] }));
    };

    const tables1 = getTables(db1);
    const tables2 = getTables(db2);
    const set1 = new Set(tables1);
    const set2 = new Set(tables2);

    const added = tables2.filter(t => !set1.has(t));
    const removed = tables1.filter(t => !set2.has(t));
    const common = tables1.filter(t => set2.has(t));

    const modified = [];
    common.forEach(table => {
      const cols1 = getTableInfo(db1, table);
      const cols2 = getTableInfo(db2, table);
      const diff = this.compareTableColumns(table, cols1, cols2);
      if (diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0) {
        modified.push({ table, diff });
      }
    });

    return { name1, name2, added, removed, modified };
  },

  compareTableColumns(table, cols1, cols2) {
    const map1 = {};
    const map2 = {};
    cols1.forEach(c => { map1[c.name] = c; });
    cols2.forEach(c => { map2[c.name] = c; });

    const added = cols2.filter(c => !map1[c.name]);
    const removed = cols1.filter(c => !map2[c.name]);
    const modified = [];

    cols1.forEach(c1 => {
      const c2 = map2[c1.name];
      if (c2) {
        const changes = [];
        if ((c1.type || '') !== (c2.type || '')) changes.push(`類型: ${c1.type || 'ANY'} → ${c2.type || 'ANY'}`);
        if (c1.notnull !== c2.notnull) changes.push(`NOT NULL: ${c1.notnull ? '是' : '否'} → ${c2.notnull ? '是' : '否'}`);
        if (String(c1.default_value ?? '') !== String(c2.default_value ?? '')) changes.push(`預設值: ${c1.default_value ?? '—'} → ${c2.default_value ?? '—'}`);
        if (c1.pk !== c2.pk) changes.push(`PK: ${c1.pk ? '是' : '否'} → ${c2.pk ? '是' : '否'}`);
        if (changes.length > 0) modified.push({ name: c1.name, changes });
      }
    });

    return { added, removed, modified };
  },

  showCompareResult(diff) {
    let html = `<div style="margin-bottom:16px;font-size:13px;color:var(--text-secondary)">
      <strong>${UI.esc(diff.name1)}</strong> vs <strong>${UI.esc(diff.name2)}</strong>
    </div>`;

    if (diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0) {
      html += '<div style="text-align:center;padding:20px;color:var(--green)">兩個數據庫結構完全相同</div>';
    } else {
      if (diff.removed.length > 0) {
        html += '<h4 style="color:var(--red);margin-bottom:8px">刪除的表</h4>';
        diff.removed.forEach(t => {
          html += `<div style="padding:6px 10px;background:var(--red-bg);border-radius:4px;margin-bottom:4px;font-family:var(--font-mono);font-size:12px">- ${UI.esc(t)}</div>`;
        });
      }
      if (diff.added.length > 0) {
        html += '<h4 style="color:var(--green);margin:12px 0 8px">新增的表</h4>';
        diff.added.forEach(t => {
          html += `<div style="padding:6px 10px;background:var(--green-bg);border-radius:4px;margin-bottom:4px;font-family:var(--font-mono);font-size:12px">+ ${UI.esc(t)}</div>`;
        });
      }
      if (diff.modified.length > 0) {
        html += '<h4 style="color:var(--yellow);margin:12px 0 8px">修改的表</h4>';
        diff.modified.forEach(m => {
          html += `<div style="padding:8px 10px;background:var(--yellow-bg);border-radius:4px;margin-bottom:8px">
            <div style="font-weight:600;font-size:13px;margin-bottom:6px">${UI.esc(m.table)}</div>`;
          m.diff.added.forEach(c => {
            html += `<div style="color:var(--green);font-size:12px;font-family:var(--font-mono)">  + 欄位 ${UI.esc(c.name)} (${UI.esc(c.type || 'ANY')})</div>`;
          });
          m.diff.removed.forEach(c => {
            html += `<div style="color:var(--red);font-size:12px;font-family:var(--font-mono)">  - 欄位 ${UI.esc(c.name)}</div>`;
          });
          m.diff.modified.forEach(c => {
            html += `<div style="color:var(--yellow);font-size:12px;font-family:var(--font-mono)">  ~ ${UI.esc(c.name)}: ${c.changes.join(', ')}</div>`;
          });
          html += '</div>';
        });
      }

      // Generate ALTER statements
      html += '<h4 style="margin:16px 0 8px">同步 SQL</h4>';
      html += '<pre style="font-family:var(--font-mono);font-size:11px;line-height:1.6;background:var(--bg);padding:12px;border-radius:var(--radius);border:1px solid var(--border);max-height:200px;overflow:auto">';
      diff.removed.forEach(t => {
        html += `DROP TABLE IF EXISTS ${SqlUtils.quoteIdent(t)};\n`;
      });
      diff.added.forEach(t => {
        html += `-- 需從 ${UI.esc(diff.name2)} 複製表 ${t} 的 CREATE SQL\n`;
      });
      diff.modified.forEach(m => {
        m.diff.added.forEach(c => {
          let sql = `ALTER TABLE ${SqlUtils.quoteIdent(m.table)} ADD COLUMN ${SqlUtils.quoteIdent(c.name)} ${c.type || 'TEXT'}`;
          if (c.notnull) sql += ' NOT NULL';
          if (c.default_value !== null) sql += ` DEFAULT ${c.default_value}`;
          html += sql + ';\n';
        });
      });
      html += '</pre>';
    }

    UI.showModal('比較結果', html, '<button class="btn btn-primary" onclick="UI.closeModal()">關閉</button>');
  },

  // ══════════════════════════════════════════════════════════
  // Feature 6: Schema Migration
  // ══════════════════════════════════════════════════════════

  async showMigrationDialog() {
    if (!DB.db) { UI.toast('請先開啟數據庫', 'error'); return; }

    const backups = await Enhancements.listBackups();
    let html = '';

    if (backups.length === 0) {
      html = '<div class="empty-state"><p>無可用備份。備份會在執行危險操作時自動建立。</p></div>';
    } else {
      html += `<div class="form-group">
        <label class="form-label">選擇備份作為目標狀態</label>
        <select class="form-select" id="migrationBackupSelect">
          ${backups.map(b => `<option value="${b.id}">${new Date(b.timestamp).toLocaleString('zh-TW')} - ${UI.esc(b.operation)} (${UI.esc(b.fileName)})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">遷移方向</label>
        <select class="form-select" id="migrationDirection">
          <option value="forward">當前 → 備份 (將當前結構同步到備份)</option>
          <option value="backward">備份 → 當前 (將備份結構同步到當前)</option>
        </select>
      </div>
      <div id="migrationPreview" style="margin-top:12px"></div>`;
    }

    const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      ${backups.length > 0 ? '<button class="btn btn-primary" id="migrationGenerate">產生遷移腳本</button>' : ''}`;

    UI.showModal('Schema Migration', html, footer);

    if (backups.length === 0) return;

    document.getElementById('migrationGenerate').onclick = async () => {
      const selectEl = document.getElementById('migrationBackupSelect');
      const direction = document.getElementById('migrationDirection').value;
      const backupId = +selectEl.value;

      try {
        const backupData = await this._getBackupData(backupId);
        if (!backupData) { UI.toast('備份資料不存在', 'error'); return; }

        const db2 = new DB.SQL.Database(backupData);
        let dbSrc, dbDst, srcName, dstName;
        if (direction === 'forward') {
          dbSrc = DB.db; dbDst = db2; srcName = '當前'; dstName = '備份';
        } else {
          dbSrc = db2; dbDst = DB.db; srcName = '備份'; dstName = '當前';
        }

        const diff = this.compareDatabases(dbSrc, dbDst, srcName, dstName);
        db2.close();

        const migrationSQL = this.generateMigrationSQL(diff);
        this.showMigrationPreview(migrationSQL, diff);
      } catch (e) {
        UI.toast('遷移分析失敗: ' + e.message, 'error');
      }
    };
  },

  async _getBackupData(backupId) {
    try {
      const db = await Enhancements._openBackupDB();
      const tx = db.transaction(Enhancements._backupStoreName, 'readonly');
      const store = tx.objectStore(Enhancements._backupStoreName);
      return new Promise((resolve, reject) => {
        const req = store.get(backupId);
        req.onsuccess = () => resolve(req.result?.data || null);
        req.onerror = () => reject(req.error);
      });
    } catch { return null; }
  },

  generateMigrationSQL(diff) {
    let sql = `-- Schema Migration\n`;
    sql += `-- From: ${UI.esc(diff.name1)}\n`;
    sql += `-- To: ${UI.esc(diff.name2)}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;
    sql += `BEGIN TRANSACTION;\n\n`;

    diff.removed.forEach(t => {
      sql += `DROP TABLE IF EXISTS ${SqlUtils.quoteIdent(t)};\n`;
    });
    if (diff.removed.length > 0) sql += '\n';

    diff.modified.forEach(m => {
      m.diff.added.forEach(c => {
        let line = `ALTER TABLE ${SqlUtils.quoteIdent(m.table)} ADD COLUMN ${SqlUtils.quoteIdent(c.name)} ${c.type || 'TEXT'}`;
        if (c.notnull) line += ' NOT NULL';
        if (c.default_value !== null) line += ` DEFAULT ${c.default_value}`;
        sql += line + ';\n';
      });
    });
    if (diff.modified.some(m => m.diff.added.length > 0)) sql += '\n';

    diff.added.forEach(t => {
      sql += `-- TODO: CREATE TABLE ${t} (需手動從 ${UI.esc(diff.name2)} 取得完整定義)\n`;
    });

    sql += `\nCOMMIT;\n`;
    return sql;
  },

  showMigrationPreview(sql, diff) {
    const body = `
      <div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary)">
        變更摘要: ${diff.removed.length} 刪除, ${diff.added.length} 新增, ${diff.modified.length} 修改
      </div>
      <pre style="font-family:var(--font-mono);font-size:12px;line-height:1.6;background:var(--bg);padding:16px;border-radius:var(--radius);border:1px solid var(--border);max-height:400px;overflow:auto;white-space:pre-wrap">${UI.esc(sql)}</pre>`;

    const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      <button class="btn btn-secondary" id="migrationCopy">複製 SQL</button>
      <button class="btn btn-primary" id="migrationApply">套用遷移</button>`;

    UI.showModal('遷移腳本預覽', body, footer);

    document.getElementById('migrationCopy').onclick = () => {
      navigator.clipboard.writeText(sql).then(() => UI.toast('SQL 已複製', 'success'));
    };
    document.getElementById('migrationApply').onclick = () => {
      try {
        DB.execute(sql);
        UI.closeModal();
        UI.toast('遷移已套用', 'success');
        UI.renderSidebar();
        UI.updateHeader();
      } catch (e) {
        UI.toast('套用失敗: ' + e.message, 'error');
      }
    };
  },

  // ══════════════════════════════════════════════════════════
  // Feature 7: Data Masking Export
  // ══════════════════════════════════════════════════════════

  showMaskedExportDialog(tableName) {
    const info = DB.getTableInfo(tableName);
    const data = DB.getTableData(tableName, { limit: 100000 });

    let colsHTML = '';
    info.forEach(col => {
      const isText = /text|char|varchar|clob/i.test(col.type || '');
      colsHTML += `<div class="mask-col-row" data-col="${UI.esc(col.name)}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--border)">
        <label style="flex:1;font-family:var(--font-mono);font-size:12px;display:flex;align-items:center;gap:6px">
          <input type="checkbox" class="mask-col-check" ${isText ? '' : 'disabled'}>
          ${UI.esc(col.name)}
          <span style="color:var(--text-muted);font-size:11px">${UI.esc(col.type || 'ANY')}</span>
        </label>
        <select class="mask-type form-select" style="width:130px;font-size:12px" ${isText ? '' : 'disabled'}>
          <option value="none">不遮罩</option>
          <option value="full">全遮罩 (***)</option>
          <option value="partial">部分遮罩 (J***)</option>
          <option value="hash">雜湊 (a1b2...)</option>
          <option value="random">隨機字串</option>
        </select>
      </div>`;
    });

    const body = `
      <div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary)">選擇要遮罩的欄位與遮罩方式</div>
      <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius)">
        ${colsHTML}
      </div>
      <div class="form-group" style="margin-top:16px">
        <label class="form-label">匯出格式</label>
        <select class="form-select" id="maskExportFormat">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </div>`;

    const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      <button class="btn btn-primary" id="maskExportConfirm">匯出</button>`;

    UI.showModal(`遮罩匯出: ${tableName}`, body, footer);

    document.getElementById('maskExportConfirm').onclick = () => {
      const maskConfig = {};
      document.querySelectorAll('.mask-col-row').forEach(row => {
        const col = row.dataset.col;
        const checked = row.querySelector('.mask-col-check').checked;
        const type = row.querySelector('.mask-type').value;
        if (checked && type !== 'none') {
          maskConfig[col] = type;
        }
      });

      if (Object.keys(maskConfig).length === 0) {
        UI.toast('請選擇至少一個欄位進行遮罩', 'info');
        return;
      }

      const format = document.getElementById('maskExportFormat').value;
      this.exportMaskedData(tableName, data, maskConfig, format);
      UI.closeModal();
    };
  },

  maskValue(value, type) {
    if (value === null || value === undefined) return value;
    const str = String(value);
    switch (type) {
      case 'full': return '*'.repeat(Math.max(str.length, 3));
      case 'partial':
        if (str.length <= 1) return '*';
        return str[0] + '*'.repeat(str.length - 1);
      case 'hash': {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
        }
        return 'h_' + Math.abs(hash).toString(16).substring(0, 8);
      }
      case 'random': {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < Math.max(str.length, 6); i++) {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
      }
      default: return value;
    }
  },

  exportMaskedData(tableName, data, maskConfig, format) {
    const maskedRows = data.rows.map(row => {
      return row.map((cell, i) => {
        const col = data.columns[i];
        if (maskConfig[col]) return this.maskValue(cell, maskConfig[col]);
        return cell;
      });
    });

    let content, mime, ext;
    if (format === 'json') {
      const objs = maskedRows.map(row => {
        const obj = {};
        data.columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
      content = JSON.stringify(objs, null, 2);
      mime = 'application/json;charset=utf-8';
      ext = 'json';
    } else {
      let csv = data.columns.join(',') + '\n';
      maskedRows.forEach(row => {
        csv += row.map(cell => {
          if (cell === null) return '';
          const s = String(cell);
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',') + '\n';
      });
      content = '\uFEFF' + csv;
      mime = 'text/csv;charset=utf-8';
      ext = 'csv';
    }

    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${tableName}_masked.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast(`已匯出遮罩資料 (${format.toUpperCase()})`, 'success');
  },

  // ══════════════════════════════════════════════════════════
  // Feature 8: Multi-Query Results (Tabbed)
  // ══════════════════════════════════════════════════════════

  hookMultiQueryTabs() {
    const origRunSQL = Editor.runSQL.bind(Editor);
    Editor.runSQL = (tabId, sql) => {
      if (this.isExplainQuery(sql)) {
        this.runExplainQuery(tabId, sql);
        return;
      }
      const statements = Editor.splitStatements(sql);
      if (statements.length <= 1) {
        origRunSQL(tabId, sql);
        return;
      }
      this.runMultiQueryTabbed(tabId, sql, statements);
    };
  },

  runMultiQueryTabbed(tabId, sql, statements) {
    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    const resultsInfo = panel.querySelector('[data-field="results-info"]');
    const wrapper = panel.querySelector('[data-field="results-wrapper"]');
    const tab = UI.tabs.find(t => t.id === tabId);

    const startTime = performance.now();
    const allResults = [];
    let hasError = false;

    statements.forEach((stmt, idx) => {
      const trimmed = stmt.trim();
      if (!trimmed) return;
      try {
        const results = DB.run(trimmed);
        allResults.push({ sql: trimmed, results, index: idx });
      } catch (e) {
        hasError = true;
        allResults.push({ sql: trimmed, error: e.message, index: idx });
      }
    });

    const elapsed = (performance.now() - startTime).toFixed(1);
    UI.renderSidebar();
    UI.updateHeader();

    const successCount = allResults.filter(r => !r.error).length;
    const errorCount = allResults.filter(r => r.error).length;
    let totalRows = 0;
    allResults.forEach(r => { if (r.results?.length > 0) totalRows += r.results[0].values.length; });

    resultsInfo.style.display = 'flex';
    resultsInfo.innerHTML = `
      ${hasError ? `<span class="badge badge-error">${errorCount} 錯誤</span>` : ''}
      <span class="badge badge-success">${successCount} 成功</span>
      <span>共 ${totalRows} 行</span>
      <span>執行時間: ${elapsed}ms</span>`;

    // Build tabbed results
    let tabsHTML = '<div class="multi-result-tabs" style="display:flex;gap:2px;padding:4px 8px;background:var(--bg-elevated);border-bottom:1px solid var(--border);overflow-x:auto;flex-shrink:0">';
    allResults.forEach((item, idx) => {
      const status = item.error ? 'error' : 'success';
      const rowCount = item.results?.length > 0 ? item.results[0].values.length : 0;
      const label = item.error ? `#${idx + 1} 錯誤` : `#${idx + 1} (${rowCount})`;
      tabsHTML += `<button class="btn btn-sm ${idx === 0 ? 'btn-primary' : 'btn-ghost'} multi-tab-btn" data-mtab="${idx}">${label}</button>`;
    });
    tabsHTML += '</div>';

    let panelsHTML = '<div class="multi-result-panels" style="flex:1;overflow:auto;min-height:0">';
    allResults.forEach((item, idx) => {
      panelsHTML += `<div class="multi-tab-panel" data-mtab="${idx}" style="display:${idx === 0 ? 'block' : 'none'}">`;
      if (item.error) {
        panelsHTML += `<div style="padding:16px;background:var(--red-bg);border-left:3px solid var(--red);margin:8px;border-radius:var(--radius)">
          <div style="font-size:12px;font-weight:600;color:var(--red);margin-bottom:4px">語句 ${idx + 1} 錯誤</div>
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${UI.esc(item.sql)}</div>
          <div style="color:var(--red);font-size:12px;margin-top:4px">${UI.esc(item.error)}</div>
        </div>`;
      } else if (!item.results || item.results.length === 0) {
        panelsHTML += `<div style="padding:16px;color:var(--green);font-size:13px">語句 ${idx + 1}: 已執行 (無返回結果)</div>`;
      } else {
        const result = item.results[0];
        panelsHTML += `<table class="data-table"><thead><tr><th style="width:40px">#</th>`;
        result.columns.forEach(col => {
          panelsHTML += `<th>${UI.esc(col)}</th>`;
        });
        panelsHTML += '</tr></thead><tbody>';
        result.values.forEach((row, ri) => {
          panelsHTML += `<tr><td style="color:var(--text-muted);font-size:11px">${ri + 1}</td>`;
          row.forEach(cell => {
            let cls = '', display = '';
            if (cell === null) { cls = 'null'; display = 'NULL'; }
            else {
              const enhanced = Enhancements.renderCell(cell);
              if (enhanced.enhanced) { cls = 'enhanced'; display = enhanced.html; }
              else if (typeof cell === 'number') { cls = 'number'; display = cell; }
              else { cls = 'string'; display = UI.esc(String(cell)); }
            }
            panelsHTML += `<td class="${cls}">${display}</td>`;
          });
          panelsHTML += '</tr>';
        });
        panelsHTML += '</tbody></table>';
      }
      panelsHTML += '</div>';
    });
    panelsHTML += '</div>';

    wrapper.innerHTML = tabsHTML + panelsHTML;

    // Tab switching
    wrapper.querySelectorAll('.multi-tab-btn').forEach(btn => {
      btn.onclick = () => {
        wrapper.querySelectorAll('.multi-tab-btn').forEach(b => { b.className = 'btn btn-sm btn-ghost multi-tab-btn'; });
        btn.className = 'btn btn-sm btn-primary multi-tab-btn';
        wrapper.querySelectorAll('.multi-tab-panel').forEach(p => { p.style.display = 'none'; });
        wrapper.querySelector(`.multi-tab-panel[data-mtab="${btn.dataset.mtab}"]`).style.display = 'block';
      };
    });

    // Store last result
    const lastSuccess = [...allResults].reverse().find(r => !r.error && r.results?.length > 0);
    tab.lastResult = lastSuccess ? lastSuccess.results[0] : null;

    Editor.addHistory(sql.substring(0, 500), elapsed, !hasError, hasError ? '部分語句失敗' : '');
    UI.toast(`${successCount} 條語句完成 (${elapsed}ms)`, hasError ? 'info' : 'success');
  },

  // ══════════════════════════════════════════════════════════
  // Feature 9: Cell JSON Editor
  // ══════════════════════════════════════════════════════════

  showCellJSONEditor(cellValue, onSave) {
    let parsed = null;
    let rawText = cellValue === null ? '' : String(cellValue);
    try { parsed = JSON.parse(rawText); } catch {}

    let viewMode = 'code'; // 'code' or 'tree'

    const renderEditor = () => {
      const isValid = this._tryParseJSON(rawText);
      const errorHTML = isValid === null ? '' : `<div style="color:var(--red);font-size:12px;margin-top:8px;font-family:var(--font-mono)">${UI.esc(isValid)}</div>`;

      const body = `
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <button class="btn btn-sm ${viewMode === 'code' ? 'btn-primary' : 'btn-ghost'}" id="jsonViewCode">程式碼</button>
          <button class="btn btn-sm ${viewMode === 'tree' ? 'btn-primary' : 'btn-ghost'}" id="jsonViewTree">樹狀圖</button>
        </div>
        <div id="jsonEditorContent">
          ${viewMode === 'code' ? `<textarea class="sql-editor" id="jsonEditText" style="min-height:200px;font-family:var(--font-mono);font-size:12px;resize:vertical">${UI.esc(rawText)}</textarea>` : `<div class="json-tree" style="font-family:var(--font-mono);font-size:12px;line-height:1.8;max-height:300px;overflow:auto;padding:4px">${parsed !== null ? Enhancements.buildJSONTreeHTML(parsed, 0) : '<span style="color:var(--red)">無效的 JSON</span>'}</div>`}
        </div>
        ${errorHTML}`;

      const footer = `
        <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
        <button class="btn btn-secondary" id="jsonFormatBtn">格式化</button>
        <button class="btn btn-primary" id="jsonSaveBtn" ${isValid === null ? '' : 'disabled'}>儲存</button>`;

      UI.showModal('JSON 編輯器', body, footer);

      if (viewMode === 'code') {
        document.getElementById('jsonEditText').addEventListener('input', (e) => {
          rawText = e.target.value;
          try { parsed = JSON.parse(rawText); } catch { parsed = null; }
          const saveBtn = document.getElementById('jsonSaveBtn');
          const err = this._tryParseJSON(rawText);
          if (saveBtn) saveBtn.disabled = err !== null;
        });
      }

      const codeBtn = document.getElementById('jsonViewCode');
      const treeBtn = document.getElementById('jsonViewTree');
      if (codeBtn) codeBtn.onclick = () => { viewMode = 'code'; renderEditor(); };
      if (treeBtn) treeBtn.onclick = () => { viewMode = 'tree'; renderEditor(); };

      const formatBtn = document.getElementById('jsonFormatBtn');
      if (formatBtn) formatBtn.onclick = () => {
        try {
          rawText = JSON.stringify(JSON.parse(rawText), null, 2);
          viewMode = 'code';
          renderEditor();
        } catch {}
      };

      const saveBtn = document.getElementById('jsonSaveBtn');
      if (saveBtn) saveBtn.onclick = () => {
        const err = this._tryParseJSON(rawText);
        if (err) { UI.toast('JSON 格式錯誤: ' + err, 'error'); return; }
        onSave(rawText);
        UI.closeModal();
      };

      Enhancements.initTreeToggles();
    };

    renderEditor();
  },

  _tryParseJSON(str) {
    if (!str || !str.trim()) return null;
    try { JSON.parse(str); return null; } catch (e) { return e.message; }
  },

  // Hook double-click on JSON cells
  hookCellJSONEditor() {
    document.addEventListener('dblclick', (e) => {
      const td = e.target.closest('td[data-col].enhanced, td[data-col].string');
      if (!td) return;
      const text = td.getAttribute('title') || td.textContent;
      if (!text || text === 'NULL') return;
      const parsed = Enhancements.isJSON(text);
      if (!parsed) return;

      e.preventDefault();
      e.stopPropagation();

      const tableName = td.closest('.tab-panel')?.querySelector('[data-field="table-wrapper"]')?.dataset?.tableName;
      const colName = td.dataset.col;
      const tr = td.closest('tr');
      const ri = +tr?.dataset?.row;

      this.showCellJSONEditor(text, (newValue) => {
        // Try to update the cell
        try {
          const panel = td.closest('.tab-panel');
          const tabId = +panel?.dataset?.id;
          const tab = UI.tabs.find(t => t.id === tabId);
          if (tab && tab.tableName?.endsWith('-data')) {
            const tblName = tab.tableName.replace('-data', '');
            const info = DB.getTableInfo(tblName);
            const pkCol = info.find(c => c.pk)?.name;
            const wrapper = panel.querySelector('[data-field="table-wrapper"]');
            const dataTable = wrapper?.querySelector('.data-table');
            if (dataTable) {
              const dataRow = dataTable.querySelectorAll('tr[data-row]')[ri];
              if (dataRow) {
                const cells = dataRow.querySelectorAll('td[data-col]');
                const columns = Array.from(cells).map(c => c.dataset.col);
                const idx = columns.indexOf(colName);

                if (pkCol) {
                  const pkIdx = columns.indexOf(pkCol);
                  const pkCell = cells[pkIdx];
                  const pkVal = pkCell?.textContent;
                  DB.run(`UPDATE ${SqlUtils.quoteIdent(tblName)} SET ${SqlUtils.quoteIdent(colName)} = ? WHERE ${SqlUtils.quoteIdent(pkCol)} = ?`, [newValue, pkVal]);
                }
                UI.loadDataPage(tabId);
                UI.toast('JSON 已更新', 'success');
              }
            }
          }
        } catch (err) {
          UI.toast('更新失敗: ' + err.message, 'error');
        }
      });
    }, true);
  },

  // ══════════════════════════════════════════════════════════
  // Feature 10: Cell Markdown Preview
  // ══════════════════════════════════════════════════════════

  isMarkdownLike(str) {
    if (typeof str !== 'string' || str.length < 5) return false;
    const patterns = [
      /^#{1,6}\s/m,        // headers
      /\*\*[^*]+\*\*/,     // bold
      /\*[^*]+\*/,         // italic
      /\[.+\]\(.+\)/,     // links
      /!\[.*\]\(.+\)/,    // images
      /^[-*+]\s/m,         // lists
      /^>\s/m,             // blockquotes
      /`[^`]+`/,           // inline code
      /^```/m,             // code blocks
      /\|.*\|.*\|/         // tables
    ];
    return patterns.some(p => p.test(str));
  },

  renderMarkdown(text) {
    let html = UI.esc(text);

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:var(--bg);padding:8px;border-radius:4px;font-family:var(--font-mono);font-size:12px;overflow:auto"><code>$2</code></pre>');

    // Headers
    html = html.replace(/^######\s+(.+)$/gm, '<h6 style="font-size:12px;margin:4px 0">$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5 style="font-size:13px;margin:4px 0">$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4 style="font-size:14px;margin:6px 0">$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3 style="font-size:15px;margin:6px 0">$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2 style="font-size:16px;margin:8px 0">$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1 style="font-size:18px;margin:8px 0">$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:var(--bg);padding:1px 4px;border-radius:3px;font-family:var(--font-mono);font-size:11px">$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--blue)" target="_blank">$1</a>');

    // Blockquotes
    html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote style="border-left:3px solid var(--accent);padding-left:8px;margin:4px 0;color:var(--text-secondary)">$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:8px 0">');

    // Lists
    html = html.replace(/^[-*+]\s+(.+)$/gm, '<div style="padding-left:12px">• $1</div>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  },

  hookMarkdownPreview() {
    let tooltipEl = null;

    document.addEventListener('mouseover', (e) => {
      const target = e.target;
      if (!target || !target.closest) return;
      const td = target.closest('td[data-col].string, td[data-col].enhanced');
      if (!td) return;
      const text = td.getAttribute('title') || td.textContent;
      if (!text || text === 'NULL' || text.length < 10) return;
      if (!this.isMarkdownLike(text)) return;

      if (tooltipEl) tooltipEl.remove();
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'md-tooltip';
      tooltipEl.style.cssText = 'position:fixed;max-width:400px;max-height:300px;overflow:auto;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-lg);padding:12px;z-index:5000;font-size:13px;line-height:1.6;pointer-events:none';
      tooltipEl.innerHTML = this.renderMarkdown(text);

      const rect = td.getBoundingClientRect();
      let left = rect.right + 8;
      let top = rect.top;
      if (left + 400 > window.innerWidth) left = rect.left - 408;
      if (top + 300 > window.innerHeight) top = window.innerHeight - 310;
      if (top < 0) top = 8;

      tooltipEl.style.left = left + 'px';
      tooltipEl.style.top = top + 'px';
      document.body.appendChild(tooltipEl);
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target;
      if (!target || !target.closest) return;
      const td = target.closest('td[data-col]');
      if (!td) return;
      // Only hide if actually leaving the td
      if (e.relatedTarget && td.contains(e.relatedTarget)) return;
      if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = null;
      }
    });
  },

  // ══════════════════════════════════════════════════════════
  // Feature 11: Data Generator
  // ══════════════════════════════════════════════════════════

  showGenerateDataDialog(tableName) {
    const info = DB.getTableInfo(tableName);

    let colsHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>';
    colsHTML += '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--border)">欄位</th>';
    colsHTML += '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--border)">類型</th>';
    colsHTML += '<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--border)">生成方式</th>';
    colsHTML += '</tr></thead><tbody>';

    info.forEach(col => {
      const typeLower = (col.type || 'text').toLowerCase();
      let defaultGen = 'random-string';
      if (typeLower.includes('int')) defaultGen = 'sequential';
      else if (typeLower.includes('real') || typeLower.includes('float') || typeLower.includes('double') || typeLower.includes('numeric')) defaultGen = 'random-float';
      else if (typeLower.includes('date') || typeLower.includes('time')) defaultGen = 'random-date';
      else if (col.name.toLowerCase().includes('email')) defaultGen = 'random-email';
      else if (col.name.toLowerCase().includes('name')) defaultGen = 'random-name';
      else if (col.name.toLowerCase().includes('url') || col.name.toLowerCase().includes('link')) defaultGen = 'random-url';

      const options = `
        <option value="skip" ${col.pk ? 'selected' : ''}>跳過</option>
        <option value="sequential" ${defaultGen === 'sequential' && !col.pk ? 'selected' : ''}>序號 (1,2,3...)</option>
        <option value="random-string" ${defaultGen === 'random-string' ? 'selected' : ''}>隨機字串</option>
        <option value="random-name" ${defaultGen === 'random-name' ? 'selected' : ''}>隨機姓名</option>
        <option value="random-email" ${defaultGen === 'random-email' ? 'selected' : ''}>隨機 Email</option>
        <option value="random-int" ${!col.pk && typeLower.includes('int') ? 'selected' : ''}>隨機整數</option>
        <option value="random-float" ${defaultGen === 'random-float' ? 'selected' : ''}>隨機浮點數</option>
        <option value="random-date" ${defaultGen === 'random-date' ? 'selected' : ''}>隨機日期</option>
        <option value="random-url" ${defaultGen === 'random-url' ? 'selected' : ''}>隨機 URL</option>
        <option value="random-bool">隨機布林</option>
        <option value="null">NULL</option>
        <option value="fixed">固定值</option>`;

      colsHTML += `<tr data-col="${UI.esc(col.name)}" data-type="${UI.esc(col.type || 'TEXT')}">
        <td style="padding:6px 8px;border-bottom:1px solid var(--border);font-family:var(--font-mono)">${UI.esc(col.name)}${col.pk ? ' <span class="pk-badge" style="font-size:10px">PK</span>' : ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid var(--border)"><span class="type-badge type-${this._getTypeClass(col.type)}">${UI.esc(col.type || 'ANY')}</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid var(--border)">
          <select class="form-select gen-type" style="font-size:12px;width:100%">${options}</select>
          <input class="form-input gen-fixed" placeholder="固定值" style="font-size:12px;display:none;margin-top:4px">
        </td>
      </tr>`;
    });
    colsHTML += '</tbody></table>';

    const body = `
      <div class="form-group">
        <label class="form-label">生成行數</label>
        <input class="form-input" id="genRowCount" type="number" value="100" min="1" max="100000">
      </div>
      <div class="form-group">
        <label class="form-label">欄位設定</label>
        <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius)">${colsHTML}</div>
      </div>
      <div id="genPreview" style="margin-top:12px"></div>`;

    const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      <button class="btn btn-secondary" id="genPreviewBtn">預覽</button>
      <button class="btn btn-primary" id="genConfirm">生成並插入</button>`;

    UI.showModal(`生成資料: ${tableName}`, body, footer);

    // Toggle fixed value input
    document.querySelectorAll('.gen-type').forEach(sel => {
      sel.onchange = () => {
        const fixedInput = sel.closest('tr').querySelector('.gen-fixed');
        fixedInput.style.display = sel.value === 'fixed' ? 'block' : 'none';
      };
    });

    document.getElementById('genPreviewBtn').onclick = () => {
      const config = this._getGenConfig();
      const preview = this._generateRows(config, 5);
      let html = '<table class="data-table" style="font-size:11px"><thead><tr>';
      config.forEach(c => { html += `<th>${UI.esc(c.name)}</th>`; });
      html += '</tr></thead><tbody>';
      preview.forEach(row => {
        html += '<tr>';
        row.forEach(cell => { html += `<td>${UI.esc(String(cell ?? 'NULL'))}</td>`; });
        html += '</tr>';
      });
      html += '</tbody></table>';
      document.getElementById('genPreview').innerHTML = html;
    };

    document.getElementById('genConfirm').onclick = () => {
      const rowCount = parseInt(document.getElementById('genRowCount').value) || 100;
      if (rowCount < 1 || rowCount > 100000) { UI.toast('行數需在 1-100000 之間', 'error'); return; }

      const config = this._getGenConfig();
      const activeCols = config.filter(c => c.gen !== 'skip');
      if (activeCols.length === 0) { UI.toast('請至少選擇一個欄位生成資料', 'error'); return; }

      try {
        const rows = this._generateRows(config, rowCount);
        const colNames = activeCols.map(c => SqlUtils.quoteIdent(c.name)).join(', ');
        const placeholders = activeCols.map(() => '?').join(', ');
        const sql = `INSERT INTO ${SqlUtils.quoteIdent(tableName)} (${colNames}) VALUES (${placeholders})`;

        let inserted = 0;
        rows.forEach(row => {
          const values = activeCols.map(c => {
            const idx = config.findIndex(cfg => cfg.name === c.name);
            return row[idx];
          });
          DB.execute(sql, values);
          inserted++;
        });

        UI.closeModal();
        UI.toast(`已生成 ${inserted} 筆資料`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
        const dataTab = UI.tabs.find(t => t.tableName === tableName + '-data');
        if (dataTab) UI.loadDataPage(dataTab.id);
      } catch (e) {
        UI.toast('生成失敗: ' + e.message, 'error');
      }
    };
  },

  _getTypeClass(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('int')) return 'integer';
    if (t.includes('text') || t.includes('char')) return 'text';
    if (t.includes('real') || t.includes('float')) return 'real';
    if (t.includes('blob')) return 'blob';
    return 'text';
  },

  _getGenConfig() {
    const config = [];
    document.querySelectorAll('.gen-type').forEach(sel => {
      const tr = sel.closest('tr');
      const name = tr.dataset.col;
      const type = tr.dataset.type;
      const gen = sel.value;
      const fixedVal = tr.querySelector('.gen-fixed')?.value || '';
      config.push({ name, type, gen, fixedVal });
    });
    return config;
  },

  _generateRows(config, count) {
    const rows = [];
    let seqCounter = 0;

    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', '小明', '小華', '美玲', '志明', '怡君', '建宏', '淑芬', '宗翰', '雅婷', '俊傑'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com', 'test.com'];

    for (let i = 0; i < count; i++) {
      seqCounter++;
      const row = config.map(col => {
        switch (col.gen) {
          case 'skip': return null;
          case 'sequential': return seqCounter;
          case 'random-string': return this._randomStr(8 + Math.floor(Math.random() * 8));
          case 'random-name': return firstNames[Math.floor(Math.random() * firstNames.length)];
          case 'random-email': return this._randomStr(6).toLowerCase() + '@' + domains[Math.floor(Math.random() * domains.length)];
          case 'random-int': return Math.floor(Math.random() * 10000) - 5000;
          case 'random-float': return +(Math.random() * 1000 - 500).toFixed(2);
          case 'random-date': {
            const d = new Date(2020, 0, 1);
            d.setDate(d.getDate() + Math.floor(Math.random() * 1825));
            return d.toISOString().split('T')[0];
          }
          case 'random-url': return 'https://' + this._randomStr(6).toLowerCase() + '.com/' + this._randomStr(4);
          case 'random-bool': return Math.random() > 0.5 ? 1 : 0;
          case 'null': return null;
          case 'fixed': return col.fixedVal || null;
          default: return null;
        }
      });
      rows.push(row);
    }
    return rows;
  },

  _randomStr(len) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  },

  // ══════════════════════════════════════════════════════════
  // Initialization
  // ══════════════════════════════════════════════════════════

  init() {
    // Hook multi-query tabs (handles EXPLAIN and multi-statement)
    this.hookMultiQueryTabs();
    this.hookCellJSONEditor();
    this.hookMarkdownPreview();

    // Hook into Editor.openQuery to add Explain button
    const origOpenQuery = Editor.openQuery.bind(Editor);
    Editor.openQuery = (query) => {
      const tabId = origOpenQuery(query);
      setTimeout(() => this.addExplainButton(tabId), 50);
      return tabId;
    };
  }
};

document.addEventListener('DOMContentLoaded', () => Enhancements2.init());
