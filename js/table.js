const TableOps = {
  // ── Create Table Dialog ──
  showCreateTableDialog() {
    const body = `
      <div class="form-group">
        <label class="form-label">表名稱</label>
        <input class="form-input" id="newTableName" placeholder="table_name">
      </div>
      <div class="form-group">
        <label class="form-label">欄位定義</label>
        <div class="col-header">
          <span>名稱</span><span>類型</span><span>PK</span><span>NN</span><span>預設值</span>
        </div>
        <div class="create-table-columns" id="createTableCols">
          <div class="col-row">
            <input class="col-name" placeholder="id" value="id">
            <select class="col-type"><option>INTEGER</option><option>TEXT</option><option>REAL</option><option>BLOB</option><option>NUMERIC</option></select>
            <input type="checkbox" class="col-pk" checked>
            <input type="checkbox" class="col-nn">
            <input class="col-default" placeholder="">
            <button class="col-remove" onclick="this.closest('.col-row').remove()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <button class="btn btn-sm btn-ghost" id="addColRow" style="margin-top:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新增欄位
        </button>
      </div>`;

    const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      <button class="btn btn-primary" id="createTableConfirm">建立表</button>`;

    UI.showModal('新建表', body, footer);

    document.getElementById('addColRow').onclick = () => {
      const row = document.createElement('div');
      row.className = 'col-row';
      row.innerHTML = `
        <input class="col-name" placeholder="column_name">
        <select class="col-type"><option>TEXT</option><option>INTEGER</option><option>REAL</option><option>BLOB</option><option>NUMERIC</option></select>
        <input type="checkbox" class="col-pk">
        <input type="checkbox" class="col-nn">
        <input class="col-default" placeholder="">
        <button class="col-remove" onclick="this.closest('.col-row').remove()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>`;
      document.getElementById('createTableCols').appendChild(row);
    };

    document.getElementById('createTableConfirm').onclick = () => {
      const tableName = document.getElementById('newTableName').value.trim();
      if (!tableName) { UI.toast('請輸入表名稱', 'error'); return; }

      const rows = document.querySelectorAll('#createTableCols .col-row');
      if (rows.length === 0) { UI.toast('至少需要一個欄位', 'error'); return; }

      const cols = [];
      const pkCols = [];
      rows.forEach(row => {
        const name = row.querySelector('.col-name').value.trim();
        const type = row.querySelector('.col-type').value;
        const pk = row.querySelector('.col-pk').checked;
        const nn = row.querySelector('.col-nn').checked;
        const def = row.querySelector('.col-default').value.trim();
        if (!name) return;
        let col = `"${name}" ${type}`;
        if (pk) pkCols.push(name);
        if (nn) col += ' NOT NULL';
        if (def) col += ` DEFAULT ${def}`;
        cols.push(col);
      });

      if (cols.length === 0) { UI.toast('至少需要一個有效欄位', 'error'); return; }

      let sql = `CREATE TABLE "${tableName}" (${cols.join(', ')}`;
      if (pkCols.length > 0 && !rows[0].querySelector('.col-pk').checked) {
        sql += `, PRIMARY KEY (${pkCols.map(c => `"${c}"`).join(', ')})`;
      }
      sql += ')';

      // If single PK with AUTOINCREMENT
      if (pkCols.length === 1) {
        const pkRow = Array.from(rows).find(r => r.querySelector('.col-pk').checked);
        if (pkRow && pkRow.querySelector('.col-type').value === 'INTEGER') {
          sql = `CREATE TABLE "${tableName}" (${cols.join(', ')}, PRIMARY KEY("${pkCols[0]}" AUTOINCREMENT))`;
        }
      }

      try {
        DB.run(sql);
        UI.closeModal();
        UI.toast(`表 ${tableName} 已建立`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
      } catch (e) {
        UI.toast(e.message, 'error');
      }
    };
  },

  // ── Insert Dialog ──
  showInsertDialog(tableName, info) {
    let fieldsHTML = '';
    info.forEach(col => {
      const defaultVal = col.default_value !== null ? String(col.default_value) : '';
      fieldsHTML += `
        <div class="form-group">
          <label class="form-label">${UI.esc(col.name)} <span style="color:var(--text-muted);font-weight:400">${UI.esc(col.type || '')}</span></label>
          <input class="form-input" data-col="${UI.esc(col.name)}" placeholder="${col.pk ? '自動' : ''}" value="${UI.esc(defaultVal)}">
        </div>`;
    });

    const body = `<div class="insert-form">${fieldsHTML}</div>`;
    const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      <button class="btn btn-primary" id="insertConfirm">插入</button>`;

    UI.showModal(`插入資料到 ${tableName}`, body, footer);

    document.getElementById('insertConfirm').onclick = () => {
      const values = {};
      document.querySelectorAll('.insert-form .form-input').forEach(input => {
        const col = input.dataset.col;
        const val = input.value.trim();
        if (val !== '') values[col] = val;
      });

      try {
        const cols = Object.keys(values);
        const vals = Object.values(values);
        const placeholders = vals.map(() => '?').join(', ');
        const sql = `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
        DB.run(sql, vals);
        UI.closeModal();
        UI.toast('資料已插入', 'success');
        UI.renderSidebar();
        UI.updateHeader();
        const dataTab = UI.tabs.find(t => t.tableName === tableName + '-data');
        if (dataTab) UI.loadDataPage(dataTab.id);
      } catch (e) {
        UI.toast(e.message, 'error');
      }
    };
  },

  // ── Edit Dialog ──
  showEditDialog(tableName, columns, row, info, pkCol) {
    let fieldsHTML = '';
    columns.forEach((col, i) => {
      const colInfo = info.find(c => c.name === col);
      const val = row[i];
      const displayVal = val === null ? '' : String(val);
      const isPK = colInfo?.pk;
      fieldsHTML += `
        <div class="form-group">
          <label class="form-label">${UI.esc(col)}${isPK ? ' <span class="pk-badge" style="font-size:10px">PK</span>' : ''} <span style="color:var(--text-muted);font-weight:400">${UI.esc(colInfo?.type || '')}</span></label>
          <input class="form-input" data-col="${UI.esc(col)}" data-idx="${i}" value="${UI.esc(displayVal)}" ${isPK ? 'readonly style="opacity:0.6"' : ''}>
        </div>`;
    });

    const body = `<div class="edit-form">${fieldsHTML}</div>`;
    const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      <button class="btn btn-ghost" id="editNull">設為 NULL</button>
      <button class="btn btn-primary" id="editConfirm">更新</button>`;

    UI.showModal(`編輯資料`, body, footer);

    document.getElementById('editNull').onclick = () => {
      const focused = document.activeElement;
      if (focused?.classList.contains('form-input') && !focused.readOnly) focused.value = '';
    };

    document.getElementById('editConfirm').onclick = () => {
      const setClauses = [];
      const setValues = [];
      const whereClauses = [];
      const whereValues = [];

      document.querySelectorAll('.edit-form .form-input').forEach(input => {
        const col = input.dataset.col;
        const idx = +input.dataset.idx;
        const colInfo = info.find(c => c.name === col);
        if (colInfo?.pk) {
          whereClauses.push(`"${col}" = ?`);
          whereValues.push(row[idx]);
        } else {
          const val = input.value;
          setClauses.push(`"${col}" = ?`);
          setValues.push(val === '' ? null : val);
        }
      });

      if (setClauses.length === 0) { UI.toast('無可更新的欄位', 'info'); return; }

      try {
        DB.run(`UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`, [...setValues, ...whereValues]);
        UI.closeModal();
        UI.toast('資料已更新', 'success');
        UI.updateHeader();
        const dataTab = UI.tabs.find(t => t.tableName === tableName + '-data');
        if (dataTab) UI.loadDataPage(dataTab.id);
      } catch (e) {
        UI.toast(e.message, 'error');
      }
    };
  },

  // ── Delete Row ──
  deleteRow(tableName, columns, row, info, pkCol, onRefresh) {
    const whereParts = [];
    const whereValues = [];
    if (pkCol) {
      const pkIdx = columns.indexOf(pkCol);
      whereParts.push(`"${pkCol}" = ?`);
      whereValues.push(row[pkIdx]);
    } else {
      columns.forEach((col, i) => {
        if (row[i] === null) whereParts.push(`"${col}" IS NULL`);
        else { whereParts.push(`"${col}" = ?`); whereValues.push(row[i]); }
      });
    }

    const whereSQL = whereParts.join(' AND ');
    UI.showModal('確認刪除', `<p>確定要刪除這筆資料嗎？</p><pre style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);margin-top:12px;padding:12px;background:var(--bg);border-radius:var(--radius)">DELETE FROM "${tableName}" WHERE ${whereSQL}</pre>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-danger" id="deleteConfirm">刪除</button>`);

    document.getElementById('deleteConfirm').onclick = () => {
      try {
        DB.run(`DELETE FROM "${tableName}" WHERE ${whereSQL}`, whereValues);
        UI.closeModal();
        UI.toast('資料已刪除', 'success');
        UI.renderSidebar();
        UI.updateHeader();
        if (onRefresh) onRefresh();
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // ── Drop Table ──
  dropTable(tableName) {
    UI.showModal('刪除表', `<p style="color:var(--red)">確定要刪除表 <strong>${UI.esc(tableName)}</strong> 嗎？此操作無法復原！</p>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-danger" id="dropConfirm">刪除表</button>`);

    document.getElementById('dropConfirm').onclick = () => {
      try {
        DB.run(`DROP TABLE "${tableName}"`);
        UI.closeModal();
        UI.toast(`表 ${tableName} 已刪除`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
        UI.tabs.filter(t => t.tableName?.startsWith(tableName)).forEach(t => UI.closeTab(t.id));
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // ── Truncate Table ──
  truncateTable(tableName) {
    UI.showModal('清空表', `<p>確定要清空表 <strong>${UI.esc(tableName)}</strong> 的所有資料嗎？</p>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-danger" id="truncateConfirm">清空</button>`);

    document.getElementById('truncateConfirm').onclick = () => {
      try {
        DB.run(`DELETE FROM "${tableName}"`);
        UI.closeModal();
        UI.toast(`表 ${tableName} 已清空`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
        const dataTab = UI.tabs.find(t => t.tableName === tableName + '-data');
        if (dataTab) UI.loadDataPage(dataTab.id);
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // ── Drop View ──
  dropView(viewName) {
    UI.showModal('刪除視圖', `<p style="color:var(--red)">確定要刪除視圖 <strong>${UI.esc(viewName)}</strong> 嗎？</p>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-danger" id="dropViewConfirm">刪除</button>`);

    document.getElementById('dropViewConfirm').onclick = () => {
      try {
        DB.run(`DROP VIEW "${viewName}"`);
        UI.closeModal();
        UI.toast(`視圖 ${viewName} 已刪除`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // ── Drop Trigger ──
  dropTrigger(triggerName) {
    UI.showModal('刪除觸發器', `<p style="color:var(--red)">確定要刪除觸發器 <strong>${UI.esc(triggerName)}</strong> 嗎？</p>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-danger" id="dropTriggerConfirm">刪除</button>`);

    document.getElementById('dropTriggerConfirm').onclick = () => {
      try {
        DB.run(`DROP TRIGGER "${triggerName}"`);
        UI.closeModal();
        UI.toast(`觸發器 ${triggerName} 已刪除`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
        UI.tabs.filter(t => t.tableName === triggerName + '-trigger').forEach(t => UI.closeTab(t.id));
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // ── Duplicate Table ──
  duplicateTable(tableName) {
    UI.showModal('複製表', `
      <div class="form-group">
        <label class="form-label">新表名稱</label>
        <input class="form-input" id="dupTableName" value="${UI.esc(tableName)}_copy">
      </div>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="dupConfirm">複製</button>`);

    document.getElementById('dupConfirm').onclick = () => {
      const newName = document.getElementById('dupTableName').value.trim();
      if (!newName) { UI.toast('請輸入表名', 'error'); return; }
      try {
        DB.run(`CREATE TABLE "${newName}" AS SELECT * FROM "${tableName}"`);
        UI.closeModal();
        UI.toast(`表已複製為 ${newName}`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // ── Rename Table ──
  renameTable(tableName) {
    UI.showModal('重新命名', `
      <div class="form-group">
        <label class="form-label">新名稱</label>
        <input class="form-input" id="renameInput" value="${UI.esc(tableName)}">
      </div>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="renameConfirm">重新命名</button>`);

    document.getElementById('renameConfirm').onclick = () => {
      const newName = document.getElementById('renameInput').value.trim();
      if (!newName) { UI.toast('請輸入表名', 'error'); return; }
      try {
        DB.run(`ALTER TABLE "${tableName}" RENAME TO "${newName}"`);
        UI.closeModal();
        UI.toast(`表已重新命名為 ${newName}`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
        UI.tabs.filter(t => t.tableName?.startsWith(tableName)).forEach(t => UI.closeTab(t.id));
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // ── Add Column ──
  showAddColumnDialog(tableName) {
    UI.showModal('新增欄位', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">欄位名稱</label>
          <input class="form-input" id="colName" placeholder="column_name">
        </div>
        <div class="form-group">
          <label class="form-label">類型</label>
          <select class="form-select" id="colType">
            <option value="TEXT">TEXT</option><option value="INTEGER">INTEGER</option><option value="REAL">REAL</option><option value="BLOB">BLOB</option><option value="NUMERIC">NUMERIC</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="colNotNull"> NOT NULL</label></div>
      <div class="form-group"><label class="form-label">預設值 (選填)</label><input class="form-input" id="colDefault"></div>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="addColConfirm">新增欄位</button>`);

    document.getElementById('addColConfirm').onclick = () => {
      const name = document.getElementById('colName').value.trim();
      const type = document.getElementById('colType').value;
      const notnull = document.getElementById('colNotNull').checked;
      const defaultVal = document.getElementById('colDefault').value.trim();
      if (!name) { UI.toast('請輸入欄位名稱', 'error'); return; }
      try {
        let sql = `ALTER TABLE "${tableName}" ADD COLUMN "${name}" ${type}`;
        if (notnull) sql += ' NOT NULL';
        if (defaultVal) sql += ` DEFAULT ${defaultVal}`;
        DB.run(sql);
        UI.closeModal();
        UI.toast(`欄位 ${name} 已新增`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
        const structTab = UI.tabs.find(t => t.tableName === tableName + '-struct');
        if (structTab) UI.closeTab(structTab.id);
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // ── Add Index ──
  showAddIndexDialog(tableName) {
    const info = DB.getTableInfo(tableName);
    const cols = info.map(c => c.name);

    UI.showModal('新增索引', `
      <div class="form-group">
        <label class="form-label">索引名稱</label>
        <input class="form-input" id="idxName" value="idx_${tableName}_">
      </div>
      <div class="form-group">
        <label class="form-label">欄位</label>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${cols.map(c => `<label class="form-checkbox"><input type="checkbox" value="${UI.esc(c)}" class="idx-col"> ${UI.esc(c)}</label>`).join('')}
        </div>
      </div>
      <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="idxUnique"> 唯一索引</label></div>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="addIdxConfirm">建立索引</button>`);

    document.getElementById('addIdxConfirm').onclick = () => {
      const name = document.getElementById('idxName').value.trim();
      const unique = document.getElementById('idxUnique').checked;
      const selectedCols = Array.from(document.querySelectorAll('.idx-col:checked')).map(el => el.value);
      if (!name) { UI.toast('請輸入索引名稱', 'error'); return; }
      if (selectedCols.length === 0) { UI.toast('請選擇至少一個欄位', 'error'); return; }
      try {
        DB.run(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX "${name}" ON "${tableName}" (${selectedCols.map(c => `"${c}"`).join(', ')})`);
        UI.closeModal();
        UI.toast(`索引 ${name} 已建立`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
        const idxTab = UI.tabs.find(t => t.tableName === tableName + '-idx');
        if (idxTab) UI.closeTab(idxTab.id);
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // ── Drop Index ──
  dropIndex(indexName, tableName) {
    UI.showModal('刪除索引', `<p style="color:var(--red)">確定要刪除索引 <strong>${UI.esc(indexName)}</strong> 嗎？</p>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-danger" id="dropIdxConfirm">刪除</button>`);

    document.getElementById('dropIdxConfirm').onclick = () => {
      try {
        DB.run(`DROP INDEX "${indexName}"`);
        UI.closeModal();
        UI.toast(`索引 ${indexName} 已刪除`, 'success');
        UI.renderSidebar();
        UI.updateHeader();
        const idxTab = UI.tabs.find(t => t.tableName === tableName + '-idx');
        if (idxTab) UI.closeTab(idxTab.id);
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // ── Move Column ──
  moveColumn(tableName, colName, direction) {
    const info = DB.getTableInfo(tableName);
    const colIdx = info.findIndex(c => c.name === colName);
    if (colIdx === -1) return;

    const newIdx = direction === 'up' ? colIdx - 1 : colIdx + 1;
    if (newIdx < 0 || newIdx >= info.length) {
      UI.toast('無法再移動', 'info');
      return;
    }

    // Swap columns
    const newInfo = [...info];
    [newInfo[colIdx], newInfo[newIdx]] = [newInfo[newIdx], newInfo[colIdx]];

    UI.showModal('確認欄位排序', `
      <p>確定要將 <strong>${UI.esc(colName)}</strong> 移動到 ${direction === 'up' ? '上方' : '下方'} 嗎？</p>
      <p style="color:var(--yellow);font-size:12px;margin-top:8px">此操作會重建表結構，建議先備份資料庫</p>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="moveColConfirm">確認移動</button>`);

    document.getElementById('moveColConfirm').onclick = () => {
      try {
        // Get existing data
        const data = DB.getTableData(tableName, { limit: 1000000 });
        const oldCols = data.columns;

        // Build new table
        const colDefs = newInfo.map(c => {
          let def = `"${c.name}" ${c.type || 'TEXT'}`;
          if (c.pk) def += ' PRIMARY KEY';
          if (c.notnull) def += ' NOT NULL';
          if (c.default_value !== null) def += ` DEFAULT ${c.default_value}`;
          return def;
        });

        const tmpName = `_tmp_${tableName}_${Date.now()}`;
        DB.run(`CREATE TABLE "${tmpName}" (${colDefs.join(', ')})`);

        // Copy data
        const newColNames = newInfo.map(c => c.name);
        const insertCols = newColNames.filter(c => oldCols.includes(c));
        const placeholders = insertCols.map(() => '?').join(', ');
        const insertSQL = `INSERT INTO "${tmpName}" (${insertCols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

        data.rows.forEach(row => {
          const values = insertCols.map(c => {
            const idx = oldCols.indexOf(c);
            return row[idx];
          });
          DB.run(insertSQL, values);
        });

        // Get indexes, triggers, views SQL
        const masterSQL = DB.run(`SELECT type, name, sql FROM sqlite_master WHERE tbl_name = ? AND type IN ('index', 'trigger', 'view') AND sql IS NOT NULL`, [tableName]);
        const relatedSQL = masterSQL.length > 0 ? masterSQL[0].values : [];

        // Drop original and rename
        DB.run(`DROP TABLE "${tableName}"`);
        DB.run(`ALTER TABLE "${tmpName}" RENAME TO "${tableName}"`);

        // Recreate indexes, triggers, views
        relatedSQL.forEach(row => {
          try { DB.run(row[2]); } catch {}
        });

        UI.closeModal();
        UI.toast(`欄位 ${colName} 已移動`, 'success');
        UI.renderSidebar();
        UI.updateHeader();

        // Refresh structure tab
        const structTab = UI.tabs.find(t => t.tableName === tableName + '-struct');
        if (structTab) UI.closeTab(structTab.id);
        UI.openStructureTab(tableName);

      } catch (e) {
        UI.toast('移動失敗: ' + e.message, 'error');
      }
    };
  },

  // ── Export SQL ──
  exportSQL(tableName) {
    try {
      const createSQL = DB.getCreateSQL(tableName);
      const data = DB.getTableData(tableName, { limit: 100000 });
      let sql = createSQL + ';\n\n';
      data.rows.forEach(row => {
        const vals = row.map(v => v === null ? 'NULL' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v);
        sql += `INSERT INTO "${tableName}" (${data.columns.map(c => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});\n`;
      });
      const blob = new Blob([sql], { type: 'text/sql;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${tableName}.sql`;
      a.click();
      URL.revokeObjectURL(a.href);
      UI.toast(`${tableName}.sql 已匯出`, 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
  },

  // ── Export CSV ──
  exportCSV(tableName) {
    try {
      const data = DB.getTableData(tableName, { limit: 100000 });
      let csv = data.columns.join(',') + '\n';
      data.rows.forEach(row => {
        csv += row.map(cell => {
          if (cell === null) return '';
          const s = String(cell);
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',') + '\n';
      });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${tableName}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      UI.toast(`${tableName}.csv 已匯出`, 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
  },

  // ── Export JSON ──
  exportJSON(tableName) {
    try {
      const data = DB.getTableData(tableName, { limit: 100000 });
      const rows = data.rows.map(row => {
        const obj = {};
        data.columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
      const json = JSON.stringify(rows, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${tableName}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      UI.toast(`${tableName}.json 已匯出`, 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
  },

  // ── Import CSV ──
  importCSV() {
    if (!DB.db) { UI.toast('請先開啟數據庫', 'error'); return; }

    UI.showModal('匯入 CSV', `
      <div class="form-group"><label class="form-label">目標表名</label><input class="form-input" id="importTableName" placeholder="table_name"></div>
      <div class="form-group"><label class="form-label">CSV 檔案</label><input type="file" class="form-input" id="importCSVFile" accept=".csv,.tsv,.txt"></div>
      <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="importHasHeader" checked> 首行為欄位名稱</label></div>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="importCSVConfirm">匯入</button>`);

    document.getElementById('importCSVConfirm').onclick = () => {
      const tableName = document.getElementById('importTableName').value.trim();
      const fileInput = document.getElementById('importCSVFile');
      const hasHeader = document.getElementById('importHasHeader').checked;
      if (!tableName) { UI.toast('請輸入表名', 'error'); return; }
      if (!fileInput.files.length) { UI.toast('請選擇檔案', 'error'); return; }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const lines = e.target.result.split('\n').filter(l => l.trim());
          if (lines.length === 0) { UI.toast('CSV 檔案為空', 'error'); return; }

          const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const ch = line[i];
              if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else inQuotes = !inQuotes;
              } else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
              else current += ch;
            }
            result.push(current);
            return result;
          };

          let columns, startRow;
          if (hasHeader) { columns = parseCSVLine(lines[0]); startRow = 1; }
          else { const colCount = parseCSVLine(lines[0]).length; columns = Array.from({ length: colCount }, (_, i) => `col_${i + 1}`); startRow = 0; }

          DB.run(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columns.map(c => `"${c}" TEXT`).join(', ')})`);
          for (let i = startRow; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            DB.run(`INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.map(() => '?').join(', ')})`, values);
          }
          UI.closeModal();
          UI.toast(`已匯入 ${lines.length - startRow} 行到 ${tableName}`, 'success');
          UI.renderSidebar();
          UI.updateHeader();
        } catch (err) { UI.toast('匯入失敗: ' + err.message, 'error'); }
      };
      reader.readAsText(fileInput.files[0]);
    };
  }
};
