const Editor = {
  history: [],
  bookmarks: [],

  init() {
    this.history = Storage.getPref('queryHistory', []);
    this.bookmarks = Storage.getPref('bookmarks', []);
  },

  openQuery(query = '') {
    const icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>';

    const panelHTML = `
      <div class="editor-wrapper">
        <div class="editor-toolbar">
          <button class="btn btn-sm btn-primary" data-action="run">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21 5,3"/></svg>
            執行 (Ctrl+Enter)
          </button>
          <button class="btn btn-sm btn-ghost" data-action="run-selected">執行選取</button>
          <button class="btn btn-sm btn-ghost" data-action="format">格式化</button>
          <button class="btn btn-sm btn-ghost" data-action="clear">清除</button>
          <button class="btn btn-sm btn-ghost" data-action="bookmark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            書籤
          </button>
          <button class="btn btn-sm btn-ghost" data-action="history">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
            歷史
          </button>
          <button class="btn btn-sm btn-ghost" data-action="export-sql">匯出 CSV</button>
        </div>
        <div class="editor-container">
          <div class="editor-highlight" data-field="highlight"></div>
          <textarea class="sql-editor" data-field="editor" placeholder="輸入 SQL 語句...">${UI.esc(query)}</textarea>
        </div>
      </div>
      <div class="results-area">
        <div class="results-info" data-field="results-info" style="display:none"></div>
        <div class="table-wrapper" data-field="results-wrapper">
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1"><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            <p>執行查詢以查看結果</p>
          </div>
        </div>
      </div>`;

    const tabId = UI.createTab('SQL 查詢', icon, panelHTML);
    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    const editor = panel.querySelector('[data-field="editor"]');
    const highlight = panel.querySelector('[data-field="highlight"]');

    // Syntax highlighting
    const updateHighlight = () => {
      highlight.innerHTML = this.highlightSQL(editor.value);
    };
    editor.addEventListener('input', updateHighlight);
    editor.addEventListener('scroll', () => {
      highlight.scrollTop = editor.scrollTop;
      highlight.scrollLeft = editor.scrollLeft;
    });
    updateHighlight();

    panel.querySelector('[data-action="run"]').onclick = () => this.executeQuery(tabId);
    panel.querySelector('[data-action="run-selected"]').onclick = () => this.executeSelected(tabId);
    panel.querySelector('[data-action="format"]').onclick = () => this.formatSQL(tabId);
    panel.querySelector('[data-action="clear"]').onclick = () => { editor.value = ''; updateHighlight(); };
    panel.querySelector('[data-action="bookmark"]').onclick = () => this.saveBookmark(editor.value);
    panel.querySelector('[data-action="history"]').onclick = () => this.showHistory(tabId);
    panel.querySelector('[data-action="export-sql"]').onclick = () => this.exportQueryResult(tabId);

    editor.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.executeQuery(tabId);
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(editor.selectionEnd);
        editor.selectionStart = editor.selectionEnd = start + 2;
        updateHighlight();
      }
    });

    const tab = UI.tabs.find(t => t.id === tabId);
    tab.lastResult = null;
    tab.type = 'query';

    setTimeout(() => editor.focus(), 100);
    return tabId;
  },

  highlightSQL(sql) {
    if (!sql) return '';
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'BETWEEN', 'LIKE', 'EXISTS',
      'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'ALL', 'UNION', 'EXCEPT', 'INTERSECT',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW',
      'IF', 'NOT', 'EXISTS', 'REPLACE', 'TEMPORARY', 'TEMP',
      'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'ON', 'USING',
      'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'SAVEPOINT',
      'PRAGMA', 'EXPLAIN', 'ANALYZE', 'VACUUM', 'REINDEX',
      'WITH', 'RECURSIVE', 'RETURNING',
      'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT',
      'AUTOINCREMENT', 'CASCADE', 'RESTRICT', 'SET', 'NO', 'ACTION', 'DEFERRED', 'IMMEDIATE',
      'EACH', 'ROW', 'FOR', 'BEFORE', 'AFTER', 'INSTEAD', 'OF', 'TRIGGER',
      'ATTACH', 'DETACH', 'DATABASE', 'TO',
      'GRANT', 'REVOKE'
    ];

    const functions = [
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ABS', 'LENGTH', 'UPPER', 'LOWER', 'TRIM',
      'LTRIM', 'RTRIM', 'REPLACE', 'SUBSTR', 'SUBSTRING', 'INSTR', 'CAST', 'COALESCE',
      'IFNULL', 'NULLIF', 'TYPEOF', 'LAST_INSERT_ROWID', 'CHANGES', 'TOTAL_CHANGES',
      'HEX', 'QUOTE', 'RANDOMBLOB', 'ZEROBLOB', 'UNLIKELY', 'LIKELY',
      'DATE', 'TIME', 'DATETIME', 'JULIANDAY', 'STRFTIME', 'UNIXEPOCH',
      'ROUND', 'CEIL', 'CEILING', 'FLOOR', 'SQRT', 'LOG', 'LOG10', 'POWER',
      'RANDOM', 'SIGN', 'GROUP_CONCAT', 'IIF', 'TOTAL'
    ];

    const types = [
      'INTEGER', 'INT', 'TINYINT', 'SMALLINT', 'MEDIUMINT', 'BIGINT', 'UNSIGNED',
      'REAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'DECIMAL',
      'TEXT', 'CLOB', 'VARCHAR', 'CHAR', 'CHARACTER', 'VARYING',
      'BLOB', 'NONE', 'BOOLEAN', 'DATE', 'DATETIME', 'TIMESTAMP'
    ];

    let result = '';
    let i = 0;
    const len = sql.length;

    while (i < len) {
      // Comments
      if (sql[i] === '-' && sql[i + 1] === '-') {
        let end = sql.indexOf('\n', i);
        if (end === -1) end = len;
        result += `<span class="hl-comment">${esc(sql.slice(i, end))}</span>`;
        i = end;
        continue;
      }
      if (sql[i] === '/' && sql[i + 1] === '*') {
        let end = sql.indexOf('*/', i + 2);
        if (end === -1) end = len; else end += 2;
        result += `<span class="hl-comment">${esc(sql.slice(i, end))}</span>`;
        i = end;
        continue;
      }

      // Strings
      if (sql[i] === "'" || sql[i] === '"') {
        const quote = sql[i];
        let j = i + 1;
        while (j < len) {
          if (sql[j] === quote && sql[j + 1] === quote) { j += 2; continue; }
          if (sql[j] === quote) { j++; break; }
          j++;
        }
        result += `<span class="hl-string">${esc(sql.slice(i, j))}</span>`;
        i = j;
        continue;
      }

      // Backtick identifiers
      if (sql[i] === '`') {
        let j = i + 1;
        while (j < len && sql[j] !== '`') j++;
        if (j < len) j++;
        result += `<span class="hl-string">${esc(sql.slice(i, j))}</span>`;
        i = j;
        continue;
      }

      // Numbers
      if (/\d/.test(sql[i]) && (i === 0 || /[\s,()=<>+\-*/]/.test(sql[i - 1]))) {
        let j = i;
        while (j < len && /[\d.xXa-fA-F]/.test(sql[j])) j++;
        result += `<span class="hl-number">${esc(sql.slice(i, j))}</span>`;
        i = j;
        continue;
      }

      // Words
      if (/[a-zA-Z_]/.test(sql[i])) {
        let j = i;
        while (j < len && /[a-zA-Z0-9_]/.test(sql[j])) j++;
        const word = sql.slice(i, j);
        const upper = word.toUpperCase();

        if (keywords.includes(upper)) {
          result += `<span class="hl-keyword">${esc(word)}</span>`;
        } else if (functions.includes(upper)) {
          result += `<span class="hl-function">${esc(word)}</span>`;
        } else if (types.includes(upper)) {
          result += `<span class="hl-type">${esc(word)}</span>`;
        } else {
          result += esc(word);
        }
        i = j;
        continue;
      }

      // Operators
      if (/[=<>!+\-*/%|&~^]/.test(sql[i])) {
        result += `<span class="hl-operator">${esc(sql[i])}</span>`;
        i++;
        continue;
      }

      // Brackets
      if (/[()]/.test(sql[i])) {
        result += `<span class="hl-bracket">${esc(sql[i])}</span>`;
        i++;
        continue;
      }

      // Other
      result += esc(sql[i]);
      i++;
    }

    return result;
  },

  executeQuery(tabId) {
    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    const editor = panel.querySelector('[data-field="editor"]');
    const sql = editor.value.trim();
    if (!sql) return;
    this.runSQL(tabId, sql);
  },

  executeSelected(tabId) {
    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    const editor = panel.querySelector('[data-field="editor"]');
    const selected = editor.value.substring(editor.selectionStart, editor.selectionEnd).trim();
    if (!selected) {
      UI.toast('請先選取 SQL 語句', 'info');
      return;
    }
    this.runSQL(tabId, selected);
  },

  runSQL(tabId, sql) {
    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    const resultsInfo = panel.querySelector('[data-field="results-info"]');
    const wrapper = panel.querySelector('[data-field="results-wrapper"]');
    const tab = UI.tabs.find(t => t.id === tabId);

    // Split by semicolons but respect strings
    const statements = this.splitStatements(sql);
    const isMulti = statements.length > 1;

    const startTime = performance.now();
    let allResults = [];
    let totalRows = 0;
    let hasError = false;
    let errorMsg = '';

    try {
      statements.forEach((stmt, idx) => {
        const trimmed = stmt.trim();
        if (!trimmed) return;
        try {
          const results = DB.run(trimmed);
          allResults.push({ sql: trimmed, results, index: idx });
          if (results.length > 0) totalRows += results[0].values.length;
        } catch (e) {
          hasError = true;
          errorMsg = `語句 ${idx + 1}: ${e.message}`;
          allResults.push({ sql: trimmed, error: e.message, index: idx });
        }
      });
    } catch (e) {
      hasError = true;
      errorMsg = e.message;
    }

    const elapsed = (performance.now() - startTime).toFixed(1);
    UI.renderSidebar();
    UI.updateHeader();
    this.addHistory(sql.substring(0, 500), elapsed, !hasError, errorMsg);

    // Build output
    resultsInfo.style.display = 'flex';
    const successCount = allResults.filter(r => !r.error).length;
    const errorCount = allResults.filter(r => r.error).length;

    if (hasError && errorCount === allResults.length) {
      resultsInfo.innerHTML = `<span class="badge badge-error">錯誤</span><span>${errorMsg}</span>`;
      wrapper.innerHTML = `<div class="empty-state"><p style="color:var(--red)">${UI.esc(errorMsg)}</p></div>`;
      tab.lastResult = null;
      UI.toast(errorMsg, 'error');
      return;
    }

    resultsInfo.innerHTML = `
      ${hasError ? `<span class="badge badge-error">${errorCount} 錯誤</span>` : ''}
      <span class="badge badge-success">${successCount} 成功</span>
      <span>共 ${totalRows} 行</span>
      <span>執行時間: ${elapsed}ms</span>`;

    let html = '';
    allResults.forEach((item, idx) => {
      if (item.error) {
        html += `<div style="padding:12px;margin:8px 0;background:var(--red-bg);border-radius:var(--radius);border-left:3px solid var(--red)">
          <div style="font-size:12px;font-weight:600;color:var(--red);margin-bottom:4px">語句 ${idx + 1} 錯誤</div>
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${UI.esc(item.sql)}</div>
          <div style="color:var(--red);font-size:12px;margin-top:4px">${UI.esc(item.error)}</div>
        </div>`;
        return;
      }

      if (item.results.length === 0) {
        html += `<div style="padding:8px 12px;margin:4px 0;font-size:12px;color:var(--green);border-left:3px solid var(--green);background:var(--green-bg)">
          語句 ${idx + 1}: 已執行 (無返回結果)
        </div>`;
        return;
      }

      const result = item.results[0];
      if (idx === allResults.length - 1 || !isMulti) {
        tab.lastResult = result;
      }

      if (isMulti) {
        html += `<div style="padding:6px 12px;font-size:11px;color:var(--text-muted);background:var(--bg-elevated);border-bottom:1px solid var(--border)">
          語句 ${idx + 1}: ${result.values.length} 行 × ${result.columns.length} 欄
        </div>`;
      }

      html += '<table class="data-table"><thead><tr>';
      html += '<th style="width:40px">#</th>';
      result.columns.forEach(col => { html += `<th>${UI.esc(col)}</th>`; });
      html += '</tr></thead><tbody>';

      result.values.forEach((row, ri) => {
        html += `<tr><td style="color:var(--text-muted);font-size:11px">${ri + 1}</td>`;
        row.forEach(cell => {
          let cls = '', display = '';
          if (cell === null) { cls = 'null'; display = 'NULL'; }
          else if (typeof cell === 'number') { cls = 'number'; display = cell; }
          else { cls = 'string'; display = UI.esc(String(cell)); }
          html += `<td class="${cls}" title="${UI.esc(String(cell ?? 'NULL'))}">${display}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
    });

    wrapper.innerHTML = html;
    UI.toast(`${successCount} 條語句完成 (${elapsed}ms)`, hasError ? 'info' : 'success');
  },

  splitStatements(sql) {
    const result = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inBlockComment = false;

    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i];

      if (inBlockComment) {
        current += ch;
        if (ch === '*' && sql[i + 1] === '/') { current += '/'; i++; inBlockComment = false; }
        continue;
      }
      if (inComment) {
        current += ch;
        if (ch === '\n') inComment = false;
        continue;
      }
      if (inString) {
        current += ch;
        if (ch === stringChar && sql[i + 1] === stringChar) { current += sql[++i]; continue; }
        if (ch === stringChar) inString = false;
        continue;
      }

      if (ch === '-' && sql[i + 1] === '-') { inComment = true; current += ch; continue; }
      if (ch === '/' && sql[i + 1] === '*') { inBlockComment = true; current += ch; current += sql[++i]; continue; }
      if (ch === "'" || ch === '"') { inString = true; stringChar = ch; current += ch; continue; }

      if (ch === ';') {
        const trimmed = current.trim();
        if (trimmed) result.push(trimmed);
        current = '';
        continue;
      }

      current += ch;
    }

    const trimmed = current.trim();
    if (trimmed) result.push(trimmed);
    return result.length > 0 ? result : [sql];
  },

  formatSQL(tabId) {
    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    const editor = panel.querySelector('[data-field="editor"]');
    const highlight = panel.querySelector('[data-field="highlight"]');
    let sql = editor.value;

    sql = sql.replace(/\s+/g, ' ').trim();
    const breakKeywords = ['FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'ON', 'SET', 'VALUES', 'UNION', 'UNION ALL'];
    breakKeywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      sql = sql.replace(regex, '\n' + kw);
    });

    editor.value = sql.trim();
    highlight.innerHTML = this.highlightSQL(editor.value);
  },

  exportQueryResult(tabId) {
    const tab = UI.tabs.find(t => t.id === tabId);
    if (!tab?.lastResult) {
      UI.toast('無可匯出的結果', 'info');
      return;
    }
    const result = tab.lastResult;
    let csv = result.columns.join(',') + '\n';
    result.values.forEach(row => {
      csv += row.map(cell => {
        if (cell === null) return '';
        const s = String(cell);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'query_result.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('CSV 已匯出', 'success');
  },

  // ── History ──
  addHistory(sql, elapsed, success, error = '') {
    this.history.unshift({
      sql: sql.substring(0, 500),
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      elapsed,
      success,
      error
    });
    if (this.history.length > 200) this.history.length = 200;
    Storage.savePref('queryHistory', this.history);
  },

  showHistory(tabId) {
    let html = '<div class="history-list">';
    if (this.history.length === 0) {
      html += '<div class="empty-state"><p>無查詢紀錄</p></div>';
    } else {
      this.history.forEach((item, i) => {
        html += `<div class="history-item" data-idx="${i}">
          <span class="history-item-time">${item.time}</span>
          <span class="history-item-sql">${UI.esc(item.sql)}</span>
          <span class="history-item-badge ${item.success ? 'badge-success' : 'badge-error'}" style="background:${item.success ? 'var(--green-bg)' : 'var(--red-bg)'};color:${item.success ? 'var(--green)' : 'var(--red)'}">${item.success ? item.elapsed + 'ms' : '錯誤'}</span>
        </div>`;
      });
    }
    html += '</div>';

    UI.showModal('查詢歷史', html, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">關閉</button>
      <button class="btn btn-danger" id="clearHistory">清除歷史</button>
    `);

    document.querySelectorAll('.history-item').forEach(el => {
      el.onclick = () => {
        const item = this.history[+el.dataset.idx];
        const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
        const editor = panel.querySelector('[data-field="editor"]');
        const highlight = panel.querySelector('[data-field="highlight"]');
        editor.value = item.sql;
        highlight.innerHTML = this.highlightSQL(editor.value);
        UI.closeModal();
      };
    });

    document.getElementById('clearHistory').onclick = () => {
      this.history = [];
      Storage.savePref('queryHistory', []);
      UI.closeModal();
      UI.toast('歷史已清除', 'success');
    };
  },

  // ── Bookmarks ──
  saveBookmark(sql) {
    if (!sql.trim()) { UI.toast('無可儲存的查詢', 'info'); return; }
    const name = prompt('書籤名稱:', sql.substring(0, 30));
    if (!name) return;
    this.bookmarks.unshift({ name, sql: sql.substring(0, 1000), time: new Date().toLocaleString('zh-TW') });
    if (this.bookmarks.length > 50) this.bookmarks.length = 50;
    Storage.savePref('bookmarks', this.bookmarks);
    UI.toast('書籤已儲存', 'success');
  },

  showBookmarks() {
    let html = '<div class="history-list">';
    if (this.bookmarks.length === 0) {
      html += '<div class="empty-state"><p>無書籤</p></div>';
    } else {
      this.bookmarks.forEach((item, i) => {
        html += `<div class="history-item" data-idx="${i}">
          <span class="history-item-time">${item.time}</span>
          <span class="history-item-sql" style="white-space:normal;line-height:1.4">${UI.esc(item.name)}</span>
        </div>`;
      });
    }
    html += '</div>';

    UI.showModal('書籤', html, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">關閉</button>
    `);
  }
};
