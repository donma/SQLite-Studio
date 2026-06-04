const Enhancements = {
  // ── BLOB Image Detection ──
  IMAGE_SIGNATURES: [
    { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
    { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
    { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46] },
    { mime: 'image/bmp',  bytes: [0x42, 0x4D] },
    { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }
  ],

  isImageBlob(cell) {
    if (!(cell instanceof Uint8Array) && !ArrayBuffer.isView(cell)) return null;
    const arr = cell instanceof Uint8Array ? cell : new Uint8Array(cell.buffer);
    if (arr.length < 4) return null;
    for (const sig of this.IMAGE_SIGNATURES) {
      const match = sig.bytes.every((b, i) => arr[i] === b);
      if (match) return sig.mime;
    }
    return null;
  },

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  renderBlobThumbnail(cell) {
    const mime = this.isImageBlob(cell);
    if (!mime) return null;
    const arr = cell instanceof Uint8Array ? cell : new Uint8Array(cell.buffer);
    const b64 = this.arrayBufferToBase64(arr);
    const dataUrl = `data:${mime};base64,${b64}`;
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    return `<img src="${esc(dataUrl)}" class="blob-thumbnail" data-action="view-image" data-src="${esc(dataUrl)}" alt="BLOB image" style="max-width:100px;max-height:60px;cursor:pointer;border-radius:4px;border:1px solid var(--border);vertical-align:middle">`;
  },

  showFullImage(dataUrl) {
    const body = `<div style="text-align:center;overflow:auto;max-height:70vh">
      <img src="${dataUrl}" style="max-width:100%;max-height:70vh;border-radius:var(--radius)" alt="Full image">
    </div>`;
    const footer = `<button class="btn btn-ghost" onclick="UI.closeModal()">關閉</button>
      <a class="btn btn-primary" href="${dataUrl}" download="blob_image">下載</a>`;
    UI.showModal('圖片預覽', body, footer);
  },

  // ── JSON Detection and Formatting ──
  isJSON(str) {
    if (typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch {}
    return null;
  },

  renderJSONPreview(str) {
    const parsed = this.isJSON(str);
    if (parsed === null) return null;
    const raw = str.trim();
    const truncated = raw.length > 50 ? raw.substring(0, 50) + '...' : raw;
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    return `<span class="json-preview" data-action="view-json" data-json="${esc(raw)}" style="cursor:pointer;color:var(--blue);font-family:var(--font-mono)" title="點擊查看 JSON">${esc(truncated)}</span>`;
  },

  showJSONTree(json) {
    const html = this.buildJSONTreeHTML(json, 0);
    const body = `<div class="json-tree" style="font-family:var(--font-mono);font-size:12px;line-height:1.8;max-height:60vh;overflow:auto;padding:4px">${html}</div>`;
    const footer = `<button class="btn btn-ghost" onclick="UI.closeModal()">關閉</button>
      <button class="btn btn-secondary" id="jsonCopyBtn">複製</button>`;
    UI.showModal('JSON 檢視器', body, footer);
    document.getElementById('jsonCopyBtn').onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(json, null, 2)).then(() => UI.toast('已複製', 'success'));
    };
    this.initTreeToggles();
  },

  buildJSONTreeHTML(value, depth) {
    if (value === null) return '<span class="json-null">null</span>';
    if (typeof value === 'boolean') return `<span class="json-boolean">${value}</span>`;
    if (typeof value === 'number') return `<span class="json-number">${value}</span>`;
    if (typeof value === 'string') {
      const escaped = value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      return `<span class="json-string">"${escaped}"</span>`;
    }

    const indent = '  '.repeat(depth);
    const childIndent = '  '.repeat(depth + 1);

    if (Array.isArray(value)) {
      if (value.length === 0) return '<span class="json-bracket">[]</span>';
      const id = 'jt_' + Math.random().toString(36).slice(2, 9);
      let html = `<span class="json-toggle" data-target="${id}" style="cursor:pointer;user-select:none;color:var(--text-muted)">▼</span><span class="json-bracket">[</span>`;
      html += `<span class="json-collapsed" data-id="${id}" style="display:none;color:var(--text-muted)"> ${value.length} items ]</span>`;
      html += `<div class="json-children" data-id="${id}">`;
      value.forEach((item, i) => {
        html += `${childIndent}${this.buildJSONTreeHTML(item, depth + 1)}`;
        if (i < value.length - 1) html += ',';
        html += '\n';
      });
      html += `${indent}</span><span class="json-bracket">]</span>`;
      return html;
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return '<span class="json-bracket">{}</span>';
      const id = 'jt_' + Math.random().toString(36).slice(2, 9);
      let html = `<span class="json-toggle" data-target="${id}" style="cursor:pointer;user-select:none;color:var(--text-muted)">▼</span><span class="json-bracket">{</span>`;
      html += `<span class="json-collapsed" data-id="${id}" style="display:none;color:var(--text-muted)"> ${keys.length} keys }</span>`;
      html += `<div class="json-children" data-id="${id}">`;
      keys.forEach((key, i) => {
        const escapedKey = key.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        html += `${childIndent}<span class="json-key">"${escapedKey}"</span>: ${this.buildJSONTreeHTML(value[key], depth + 1)}`;
        if (i < keys.length - 1) html += ',';
        html += '\n';
      });
      html += `${indent}<span class="json-bracket">}</span>`;
      return html;
    }

    return String(value);
  },

  initTreeToggles() {
    document.querySelectorAll('.json-toggle').forEach(el => {
      el.addEventListener('click', () => {
        const target = el.dataset.target;
        const children = document.querySelector(`.json-children[data-id="${target}"]`);
        const collapsed = document.querySelector(`.json-collapsed[data-id="${target}"]`);
        if (!children) return;
        const isHidden = children.style.display === 'none';
        children.style.display = isHidden ? '' : 'none';
        collapsed.style.display = isHidden ? 'none' : '';
        el.textContent = isHidden ? '▼' : '▶';
      });
    });
  },

  // ── Charts ──
  showChartModal(columns, rows) {
    if (!columns || columns.length < 2 || !rows || rows.length === 0) {
      UI.toast('需要至少 2 欄資料才能繪製圖表', 'info');
      return;
    }

    const body = `
      <div style="margin-bottom:12px">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <label class="form-label" style="margin:0;line-height:28px">圖表類型:</label>
          <button class="btn btn-sm btn-primary chart-type-btn" data-type="bar">長條圖</button>
          <button class="btn btn-sm btn-ghost chart-type-btn" data-type="pie">圓餅圖</button>
          <button class="btn btn-sm btn-ghost chart-type-btn" data-type="line">折線圖</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <label class="form-label" style="margin:0;line-height:28px">標籤欄:</label>
          <select class="form-select" id="chartLabelCol" style="width:auto">${columns.map((c, i) => `<option value="${i}">${UI.esc(c)}</option>`).join('')}</select>
          <label class="form-label" style="margin:0;line-height:28px">數值欄:</label>
          <select class="form-select" id="chartValueCol" style="width:auto">${columns.map((c, i) => `<option value="${i}"${i === 1 ? ' selected' : ''}>${UI.esc(c)}</option>`).join('')}</select>
        </div>
      </div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center">
        <canvas id="chartCanvas" width="500" height="300" style="max-width:100%;height:auto"></canvas>
      </div>`;

    UI.showModal('查詢結果圖表', body, '<button class="btn btn-ghost" onclick="UI.closeModal()">關閉</button>');

    const state = { type: 'bar', columns, rows };

    const draw = () => {
      const labelIdx = +document.getElementById('chartLabelCol').value;
      const valueIdx = +document.getElementById('chartValueCol').value;
      const labels = rows.map(r => String(r[labelIdx] ?? ''));
      const values = rows.map(r => {
        const v = r[valueIdx];
        return typeof v === 'number' ? v : parseFloat(v) || 0;
      });
      const canvas = document.getElementById('chartCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (state.type === 'bar') this.drawBarChart(canvas, labels, values);
      else if (state.type === 'pie') this.drawPieChart(canvas, labels, values);
      else this.drawLineChart(canvas, labels, values);
    };

    document.querySelectorAll('.chart-type-btn').forEach(btn => {
      btn.onclick = () => {
        state.type = btn.dataset.type;
        document.querySelectorAll('.chart-type-btn').forEach(b => { b.className = 'btn btn-sm btn-ghost chart-type-btn'; });
        btn.className = 'btn btn-sm btn-primary chart-type-btn';
        draw();
      };
    });

    document.getElementById('chartLabelCol').onchange = draw;
    document.getElementById('chartValueCol').onchange = draw;
    draw();
  },

  _getChartColors() {
    const s = getComputedStyle(document.documentElement);
    return {
      bg: s.getPropertyValue('--bg').trim(),
      text: s.getPropertyValue('--text').trim(),
      textSec: s.getPropertyValue('--text-secondary').trim(),
      border: s.getPropertyValue('--border').trim(),
      accent: s.getPropertyValue('--accent').trim(),
      green: s.getPropertyValue('--green').trim(),
      blue: s.getPropertyValue('--blue').trim(),
      red: s.getPropertyValue('--red').trim(),
      yellow: s.getPropertyValue('--yellow').trim(),
      palette: [
        '#6c5ce7', '#00d68f', '#4fc3f7', '#ff6b6b', '#ffd93d',
        '#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff',
        '#ffcb6b', '#546e7a'
      ]
    };
  },

  drawBarChart(canvas, labels, values) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const c = this._getChartColors();
    const pad = { top: 30, right: 20, bottom: 60, left: 60 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const maxVal = Math.max(...values, 1);
    const niceMax = Math.ceil(maxVal / Math.pow(10, Math.floor(Math.log10(maxVal)))) * Math.pow(10, Math.floor(Math.log10(maxVal)));
    const barW = Math.max(4, (chartW / values.length) * 0.7);
    const gap = (chartW - barW * values.length) / (values.length + 1);

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + chartH - (chartH * i / 5);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = c.textSec;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(niceMax * i / 5), pad.left - 8, y + 4);
    }

    // Bars
    values.forEach((v, i) => {
      const x = pad.left + gap + i * (barW + gap);
      const barH = (v / niceMax) * chartH;
      const y = pad.top + chartH - barH;
      const color = c.palette[i % c.palette.length];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
      ctx.fill();

      // Value label
      ctx.fillStyle = c.text;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      if (barH > 16) {
        ctx.fillText(v, x + barW / 2, y - 4);
      }

      // X label
      ctx.save();
      ctx.translate(x + barW / 2, pad.top + chartH + 8);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = c.textSec;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      const lbl = labels[i].length > 12 ? labels[i].substring(0, 12) + '...' : labels[i];
      ctx.fillText(lbl, 0, 0);
      ctx.restore();
    });
  },

  drawPieChart(canvas, labels, values) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const c = this._getChartColors();

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    const total = values.reduce((a, b) => a + Math.abs(b), 0) || 1;
    const cx = W * 0.38, cy = H / 2, r = Math.min(W * 0.3, H * 0.4);
    let startAngle = -Math.PI / 2;

    values.forEach((v, i) => {
      const slice = (Math.abs(v) / total) * Math.PI * 2;
      const color = c.palette[i % c.palette.length];

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Label line
      if (slice > 0.08) {
        const mid = startAngle + slice / 2;
        const lx = cx + Math.cos(mid) * (r + 14);
        const ly = cy + Math.sin(mid) * (r + 14);
        ctx.fillStyle = c.text;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = Math.cos(mid) > 0 ? 'left' : 'right';
        const pct = ((Math.abs(v) / total) * 100).toFixed(1);
        ctx.fillText(`${pct}%`, lx, ly + 4);
      }
      startAngle += slice;
    });

    // Legend
    const legendX = W * 0.72;
    let legendY = 20;
    ctx.font = '11px Inter, sans-serif';
    labels.forEach((label, i) => {
      if (i >= 12) return;
      const color = c.palette[i % c.palette.length];
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY, 10, 10);
      ctx.fillStyle = c.textSec;
      const lbl = label.length > 14 ? label.substring(0, 14) + '...' : label;
      ctx.textAlign = 'left';
      ctx.fillText(lbl, legendX + 16, legendY + 9);
      legendY += 18;
    });
  },

  drawLineChart(canvas, labels, values) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const c = this._getChartColors();
    const pad = { top: 30, right: 20, bottom: 60, left: 60 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const maxVal = Math.max(...values.map(Math.abs), 1);
    const niceMax = Math.ceil(maxVal / Math.pow(10, Math.floor(Math.log10(maxVal)))) * Math.pow(10, Math.floor(Math.log10(maxVal)));

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + chartH - (chartH * i / 5);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = c.textSec;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(niceMax * i / 5), pad.left - 8, y + 4);
    }

    if (values.length < 2) {
      ctx.fillStyle = c.textSec;
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('需要至少 2 筆資料', W / 2, H / 2);
      return;
    }

    // Line + area
    const points = values.map((v, i) => ({
      x: pad.left + (i / (values.length - 1)) * chartW,
      y: pad.top + chartH - (v / niceMax) * chartH
    }));

    // Area fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, pad.top + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, c.accent + '33');
    grad.addColorStop(1, c.accent + '05');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dots
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = c.accent;
      ctx.fill();
      ctx.strokeStyle = c.bg;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // X labels
    ctx.fillStyle = c.textSec;
    ctx.font = '10px Inter, sans-serif';
    labels.forEach((label, i) => {
      const x = pad.left + (i / Math.max(labels.length - 1, 1)) * chartW;
      ctx.save();
      ctx.translate(x, pad.top + chartH + 8);
      ctx.rotate(-Math.PI / 6);
      ctx.textAlign = 'right';
      const lbl = label.length > 12 ? label.substring(0, 12) + '...' : label;
      ctx.fillText(lbl, 0, 0);
      ctx.restore();
    });
  },

  // ── Auto Backup ──
  _backupDB: null,
  _backupStoreName: 'backups',

  async _openBackupDB() {
    if (this._backupDB) return this._backupDB;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('sqlite-studio-backups', 1);
      req.onupgradeneeded = () => req.result.createObjectStore(this._backupStoreName, { keyPath: 'id' });
      req.onsuccess = () => { this._backupDB = req.result; resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
  },

  async autoBackup(operationName) {
    if (!DB.db) return;
    try {
      const db = await this._openBackupDB();
      const data = DB.db.export();
      const backup = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        operation: operationName,
        fileName: DB.fileName,
        data: data
      };
      const tx = db.transaction(this._backupStoreName, 'readwrite');
      tx.objectStore(this._backupStoreName).put(backup);

      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      await this._pruneOldBackups();
      UI.toast(`已自動備份 (${operationName})`, 'info');
    } catch (e) {
      console.warn('Auto backup failed:', e);
    }
  },

  async _pruneOldBackups() {
    try {
      const db = await this._openBackupDB();
      const tx = db.transaction(this._backupStoreName, 'readwrite');
      const store = tx.objectStore(this._backupStoreName);
      const all = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (all.length > 5) {
        const sorted = all.sort((a, b) => a.id - b.id);
        const toDelete = sorted.slice(0, all.length - 5);
        toDelete.forEach(item => store.delete(item.id));
      }
    } catch {}
  },

  async listBackups() {
    try {
      const db = await this._openBackupDB();
      const tx = db.transaction(this._backupStoreName, 'readonly');
      const store = tx.objectStore(this._backupStoreName);
      const all = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return all.sort((a, b) => b.id - a.id);
    } catch {
      return [];
    }
  },

  async restoreBackup(id) {
    try {
      const db = await this._openBackupDB();
      const tx = db.transaction(this._backupStoreName, 'readonly');
      const store = tx.objectStore(this._backupStoreName);
      const backup = await new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (!backup) { UI.toast('備份不存在', 'error'); return; }

      DB.db = new DB.SQL.Database(backup.data);
      DB.fileName = backup.fileName;
      DB.modified = true;
      UI.updateHeader();
      UI.renderSidebar();
      UI.toast(`已恢復到 ${new Date(backup.timestamp).toLocaleString('zh-TW')} 的備份`, 'success');
    } catch (e) {
      UI.toast('恢復失敗: ' + e.message, 'error');
    }
  },

  async showRestoreDialog() {
    const backups = await this.listBackups();
    let html = '';
    if (backups.length === 0) {
      html = '<div class="empty-state"><p>無可用備份</p></div>';
    } else {
      html = '<div class="history-list">';
      backups.forEach(b => {
        const time = new Date(b.timestamp).toLocaleString('zh-TW');
        html += `<div class="history-item" data-id="${b.id}">
          <span class="history-item-time">${time}</span>
          <span class="history-item-sql">${UI.esc(b.operation)}</span>
          <span class="history-item-badge badge-info" style="background:var(--blue-bg);color:var(--blue)">${UI.esc(b.fileName)}</span>
        </div>`;
      });
      html += '</div>';
    }

    UI.showModal('還原備份', html, `
      <button class="btn btn-ghost" onclick="UI.closeModal()">關閉</button>
    `);

    document.querySelectorAll('.history-item[data-id]').forEach(el => {
      el.onclick = async () => {
        if (!confirm('確定要還原此備份？當前未儲存的變更將遺失。')) return;
        await Enhancements.restoreBackup(+el.dataset.id);
        UI.closeModal();
      };
    });
  },

  // ── Detect destructive operations ──
  isDestructiveSQL(sql) {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('DROP')) return 'DROP';
    if (upper.startsWith('DELETE')) return 'DELETE';
    if (upper.startsWith('ALTER')) return 'ALTER';
    if (upper.startsWith('TRUNCATE')) return 'TRUNCATE';
    if (upper.startsWith('UPDATE') && /\bSET\b/i.test(sql)) return 'UPDATE';
    return null;
  },

  // ── Cell Renderer (called from UI/Editor) ──
  renderCell(cell, colType) {
    // BLOB image
    if (cell instanceof Uint8Array || (cell && ArrayBuffer.isView(cell))) {
      const thumb = this.renderBlobThumbnail(cell);
      if (thumb) return { html: thumb, enhanced: true };
      // Non-image BLOB: show hex preview
      const hex = Array.from(cell.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const preview = `<span class="blob-hex" data-action="view-hex" data-bytes="${Array.from(cell).join(',')}" style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);cursor:pointer" title="點擊檢視 Hex">${hex}${cell.length > 20 ? ' ...' : ''} (${cell.length} bytes)</span>`;
      return { html: preview, enhanced: true };
    }
    // JSON
    if (typeof cell === 'string') {
      const jsonPreview = this.renderJSONPreview(cell);
      if (jsonPreview) return { html: jsonPreview, enhanced: true };
    }
    return { html: null, enhanced: false };
  },

  // ── Hex Viewer Modal ──
  showHexViewer(bytesStr) {
    const bytes = bytesStr.split(',').map(Number);
    let hex = '', ascii = '';
    let html = '<div style="font-family:var(--font-mono);font-size:12px;line-height:1.8;white-space:pre">';
    for (let i = 0; i < bytes.length; i++) {
      if (i > 0 && i % 16 === 0) {
        html += `  ${ascii}\n`;
        ascii = '';
      }
      if (i % 16 === 0) html += `<span style="color:var(--text-muted)">${i.toString(16).padStart(8, '0')}</span>  `;
      html += `<span style="color:var(--blue)">${bytes[i].toString(16).padStart(2, '0')}</span> `;
      ascii += bytes[i] >= 32 && bytes[i] < 127 ? String.fromCharCode(bytes[i]) : '.';
    }
    if (ascii) html += `${' '.repeat((16 - bytes.length % 16) * 3)}  ${ascii}`;
    html += '</div>';
    UI.showModal('Hex 檢視器', html, `<span style="font-size:12px;color:var(--text-muted)">${bytes.length} bytes</span><button class="btn btn-primary" onclick="UI.closeModal()">關閉</button>`);
  },

  // ── Bind global click for enhanced elements ──
  init() {
    document.addEventListener('click', (e) => {
      const imgEl = e.target.closest('[data-action="view-image"]');
      if (imgEl) {
        e.preventDefault();
        this.showFullImage(imgEl.dataset.src);
        return;
      }
      const jsonEl = e.target.closest('[data-action="view-json"]');
      if (jsonEl) {
        e.preventDefault();
        try {
          const parsed = JSON.parse(jsonEl.dataset.json);
          this.showJSONTree(parsed);
        } catch {}
        return;
      }
      const hexEl = e.target.closest('[data-action="view-hex"]');
      if (hexEl) {
        e.preventDefault();
        this.showHexViewer(hexEl.dataset.bytes);
        return;
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Enhancements.init());
