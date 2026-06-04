const Autocomplete = {
  dropdown: null,
  activeEditor: null,
  suggestions: [],
  selectedIndex: -1,
  isOpen: false,
  debounceTimer: null,

  SQL_KEYWORDS: [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'TRIGGER',
    'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'ON', 'USING',
    'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'BETWEEN', 'LIKE', 'EXISTS',
    'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CASCADE', 'RESTRICT',
    'UNIQUE', 'CHECK', 'DEFAULT', 'AUTOINCREMENT', 'CONSTRAINT',
    'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'SAVEPOINT',
    'PRAGMA', 'EXPLAIN', 'ANALYZE', 'VACUUM', 'REINDEX',
    'WITH', 'RECURSIVE', 'RETURNING',
    'UNION', 'EXCEPT', 'INTERSECT', 'ALL',
    'IF', 'REPLACE', 'TEMPORARY', 'TEMP', 'TO',
    'ATTACH', 'DETACH', 'DATABASE',
    'GRANT', 'REVOKE', 'EACH', 'ROW', 'FOR', 'BEFORE', 'AFTER',
    'INSTEAD', 'OF', 'NO', 'ACTION', 'DEFERRED', 'IMMEDIATE',
    'SET', 'DO', 'WHILE', 'FOR', 'EACH', 'ROW'
  ],

  SQL_FUNCTIONS: [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ABS', 'LENGTH', 'UPPER', 'LOWER',
    'TRIM', 'LTRIM', 'RTRIM', 'REPLACE', 'SUBSTR', 'SUBSTRING', 'INSTR',
    'CAST', 'COALESCE', 'IFNULL', 'NULLIF', 'TYPEOF',
    'LAST_INSERT_ROWID', 'CHANGES', 'TOTAL_CHANGES',
    'HEX', 'QUOTE', 'RANDOMBLOB', 'ZEROBLOB',
    'DATE', 'TIME', 'DATETIME', 'JULIANDAY', 'STRFTIME', 'UNIXEPOCH',
    'ROUND', 'CEIL', 'CEILING', 'FLOOR', 'SQRT', 'LOG', 'LOG10', 'POWER',
    'RANDOM', 'SIGN', 'GROUP_CONCAT', 'IIF', 'TOTAL',
    'UNLIKELY', 'LIKELY'
  ],

  SQL_TYPES: [
    'INTEGER', 'INT', 'TINYINT', 'SMALLINT', 'MEDIUMINT', 'BIGINT', 'UNSIGNED',
    'REAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'DECIMAL',
    'TEXT', 'CLOB', 'VARCHAR', 'CHAR', 'CHARACTER', 'VARYING',
    'BLOB', 'NONE', 'BOOLEAN', 'DATE', 'DATETIME', 'TIMESTAMP'
  ],

  init() {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'autocomplete-dropdown';
    document.body.appendChild(this.dropdown);
  },

  attach(editor) {
    editor.addEventListener('input', () => this.onInput(editor));
    editor.addEventListener('keydown', (e) => this.onKeyDown(e, editor));
    editor.addEventListener('blur', () => {
      setTimeout(() => this.close(), 150);
    });
    editor.addEventListener('scroll', () => {
      if (this.isOpen && this.activeEditor === editor) this.positionDropdown(editor);
    });
  },

  onInput(editor) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const { word, prefix } = this.getCurrentWord(editor);
      if (prefix.length < 1) {
        this.close();
        return;
      }
      this.showSuggestions(editor, prefix);
    }, 80);
  },

  getCurrentWord(editor) {
    const text = editor.value;
    const cursor = editor.selectionStart;
    let start = cursor;

    while (start > 0 && /[\w.]/.test(text[start - 1])) {
      start--;
    }

    const word = text.substring(start, cursor);
    const dotIndex = word.lastIndexOf('.');
    const prefix = dotIndex >= 0 ? word.substring(dotIndex + 1) : word;

    return { word, prefix, start, end: cursor, hasDot: dotIndex >= 0, beforeDot: dotIndex >= 0 ? word.substring(0, dotIndex) : '' };
  },

  getContext(editor) {
    const text = editor.value;
    const cursor = editor.selectionStart;
    const before = text.substring(0, cursor).toUpperCase();

    const tableMatch = before.match(/FROM\s+([`"']?\w+[`"']?)\s*$/i) ||
                       before.match(/JOIN\s+([`"']?\w+[`"']?)\s*$/i) ||
                       before.match(/INTO\s+([`"']?\w+[`"']?)\s*$/i) ||
                       before.match(/UPDATE\s+([`"']?\w+[`"']?)\s*$/i);

    return {
      tableFromContext: tableMatch ? tableMatch[1].replace(/[`"']/g, '') : null
    };
  },

  getAllSuggestions(prefix, editor) {
    const items = [];
    const upper = prefix.toUpperCase();
    const ctx = this.getContext(editor);

    const seen = new Set();

    this.SQL_KEYWORDS.forEach(kw => {
      if (kw.toUpperCase().startsWith(upper) && !seen.has(kw)) {
        items.push({ text: kw, type: 'keyword', icon: 'K' });
        seen.add(kw);
      }
    });

    this.SQL_FUNCTIONS.forEach(fn => {
      if (fn.toUpperCase().startsWith(upper) && !seen.has(fn)) {
        items.push({ text: fn + '()', type: 'function', icon: 'F' });
        seen.add(fn);
      }
    });

    this.SQL_TYPES.forEach(t => {
      if (t.toUpperCase().startsWith(upper) && !seen.has(t)) {
        items.push({ text: t, type: 'type', icon: 'T' });
        seen.add(t);
      }
    });

    if (DB.db) {
      try {
        const tables = DB.getTableNames();
        tables.forEach(t => {
          if (t.toUpperCase().startsWith(upper) && !seen.has(t)) {
            items.push({ text: t, type: 'table', icon: '⊞' });
            seen.add(t);
          }
        });

        const views = DB.getViewNames();
        views.forEach(v => {
          if (v.toUpperCase().startsWith(upper) && !seen.has(v)) {
            items.push({ text: v, type: 'view', icon: '⊟' });
            seen.add(v);
          }
        });

        let columnsSource = tables;
        if (ctx.tableFromContext && tables.includes(ctx.tableFromContext)) {
          columnsSource = [ctx.tableFromContext];
        }

        columnsSource.forEach(t => {
          try {
            const info = DB.getTableInfo(t);
            info.forEach(col => {
              const colName = col.name;
              if (colName.toUpperCase().startsWith(upper) && !seen.has(colName)) {
                items.push({ text: colName, type: 'column', icon: 'C', detail: `${t}.${col.name}` });
                seen.add(colName);
              }
            });
          } catch {}
        });
      } catch {}
    }

    return items;
  },

  showSuggestions(editor, prefix) {
    const suggestions = this.getAllSuggestions(prefix, editor);
    if (suggestions.length === 0) {
      this.close();
      return;
    }

    this.suggestions = suggestions;
    this.activeEditor = editor;
    this.selectedIndex = 0;

    this.render();
    this.positionDropdown(editor);
    this.dropdown.style.display = 'block';
    this.isOpen = true;
  },

  render() {
    let html = '';
    this.suggestions.forEach((item, i) => {
      const cls = i === this.selectedIndex ? 'autocomplete-item selected' : 'autocomplete-item';
      html += `<div class="${cls}" data-index="${i}">
        <span class="autocomplete-icon autocomplete-icon-${item.type}">${item.icon}</span>
        <span class="autocomplete-text">${this.escapeHTML(item.text)}</span>
        ${item.detail ? `<span class="autocomplete-detail">${this.escapeHTML(item.detail)}</span>` : ''}
        <span class="autocomplete-type">${item.type}</span>
      </div>`;
    });
    this.dropdown.innerHTML = html;

    this.dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.selectedIndex = +el.dataset.index;
        this.accept();
      });
      el.addEventListener('mouseenter', () => {
        this.selectedIndex = +el.dataset.index;
        this.highlightSelected();
      });
    });
  },

  highlightSelected() {
    this.dropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedIndex);
    });

    const selected = this.dropdown.querySelector('.autocomplete-item.selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  },

  positionDropdown(editor) {
    const rect = editor.getBoundingClientRect();
    const text = editor.value.substring(0, editor.selectionStart);
    const lines = text.split('\n');
    const currentLine = lines.length - 1;
    const currentCol = lines[lines.length - 1].length;

    const style = window.getComputedStyle(editor);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.6;
    const charWidth = this.getCharWidth(editor);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingLeft = parseFloat(style.paddingLeft);

    const scrollTop = editor.scrollTop;
    const scrollLeft = editor.scrollLeft;

    let x = rect.left + paddingLeft + (currentCol * charWidth) - scrollLeft;
    let y = rect.top + paddingTop + ((currentLine + 1) * lineHeight) - scrollTop;

    x = Math.max(4, Math.min(x, window.innerWidth - 304));
    y = Math.max(4, Math.min(y, window.innerHeight - 250));

    this.dropdown.style.left = x + 'px';
    this.dropdown.style.top = y + 'px';
  },

  getCharWidth(editor) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const style = window.getComputedStyle(editor);
    ctx.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    return ctx.measureText('M').width;
  },

  onKeyDown(e, editor) {
    if (!this.isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.suggestions.length;
      this.highlightSelected();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.suggestions.length) % this.suggestions.length;
      this.highlightSelected();
      return;
    }

    if (e.key === 'Tab' || e.key === 'Enter') {
      if (this.isOpen) {
        e.preventDefault();
        this.accept();
        return;
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
  },

  accept() {
    if (!this.activeEditor || this.selectedIndex < 0) return;

    const item = this.suggestions[this.selectedIndex];
    const editor = this.activeEditor;
    const text = editor.value;
    const cursor = editor.selectionStart;

    let start = cursor;
    while (start > 0 && /[\w.]/.test(text[start - 1])) {
      start--;
    }

    const before = text.substring(0, start);
    const after = text.substring(cursor);

    let insertText = item.text;
    let newCursorPos = start + insertText.length;

    if (item.type === 'function' && insertText.endsWith('()')) {
      insertText = insertText.slice(0, -2);
      newCursorPos = start + insertText.length + 1;
    }

    editor.value = before + insertText + after;
    editor.selectionStart = editor.selectionEnd = newCursorPos;

    this.close();

    editor.dispatchEvent(new Event('input'));
    editor.focus();
  },

  close() {
    this.dropdown.style.display = 'none';
    this.isOpen = false;
    this.suggestions = [];
    this.selectedIndex = -1;
    this.activeEditor = null;
  },

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Autocomplete.init();

  const observer = new MutationObserver(() => {
    document.querySelectorAll('textarea.sql-editor').forEach(editor => {
      if (!editor.dataset.autocompleteAttached) {
        Autocomplete.attach(editor);
        editor.dataset.autocompleteAttached = 'true';
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
