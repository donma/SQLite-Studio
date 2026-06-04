const ERD = {
  svg: null,
  g: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  dragging: null,
  dragStart: null,

  open() {
    const existing = UI.tabs.find(t => t.type === 'erd');
    if (existing) { UI.activateTab(existing.id); return; }

    const icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';

    const panelHTML = `
      <div class="data-panel-toolbar">
        <button class="btn btn-sm btn-ghost" data-action="zoom-in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          放大
        </button>
        <button class="btn btn-sm btn-ghost" data-action="zoom-out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          縮小
        </button>
        <button class="btn btn-sm btn-ghost" data-action="zoom-fit">適應畫面</button>
        <button class="btn btn-sm btn-ghost" data-action="zoom-reset">重置</button>
        <button class="btn btn-sm btn-ghost" data-action="export-svg">匯出 SVG</button>
      </div>
      <div class="erd-container" data-field="erd-container">
        <svg data-field="erd-svg"></svg>
      </div>`;

    const tabId = UI.createTab('關聯圖', icon, panelHTML);
    const tab = UI.tabs.find(t => t.id === tabId);
    tab.type = 'erd';

    const panel = document.querySelector(`.tab-panel[data-id="${tabId}"]`);
    const container = panel.querySelector('[data-field="erd-container"]');
    const svgEl = panel.querySelector('[data-field="erd-svg"]');

    panel.querySelector('[data-action="zoom-in"]').onclick = () => this.setZoom(this.zoom * 1.2, container, svgEl);
    panel.querySelector('[data-action="zoom-out"]').onclick = () => this.setZoom(this.zoom / 1.2, container, svgEl);
    panel.querySelector('[data-action="zoom-fit"]').onclick = () => this.zoomFit(container, svgEl);
    panel.querySelector('[data-action="zoom-reset"]').onclick = () => { this.zoom = 1; this.panX = 0; this.panY = 0; this.renderSVG(svgEl); };
    panel.querySelector('[data-action="export-svg"]').onclick = () => this.exportSVG(svgEl);

    this.setupInteraction(container, svgEl);
    this.buildGraph(svgEl);

    // Delay zoomFit to ensure container has layout dimensions
    setTimeout(() => {
      this.zoomFit(container, svgEl);
    }, 50);
  },

  setupInteraction(container, svgEl) {
    let isPanning = false;
    let startX, startY;

    container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.erd-table')) return;
      isPanning = true;
      startX = e.clientX - this.panX;
      startY = e.clientY - this.panY;
      container.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      this.panX = e.clientX - startX;
      this.panY = e.clientY - startY;
      this.renderSVG(svgEl);
    });

    document.addEventListener('mouseup', () => {
      isPanning = false;
      container.style.cursor = 'grab';
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldZoom = this.zoom;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.2, Math.min(3, this.zoom * delta));

      this.panX = mouseX - (mouseX - this.panX) * (this.zoom / oldZoom);
      this.panY = mouseY - (mouseY - this.panY) * (this.zoom / oldZoom);

      this.renderSVG(svgEl);
    }, { passive: false });

    // Touch support
    let lastTouchDist = 0;
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isPanning = true;
        startX = e.touches[0].clientX - this.panX;
        startY = e.touches[0].clientY - this.panY;
      } else if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isPanning) {
        this.panX = e.touches[0].clientX - startX;
        this.panY = e.touches[0].clientY - startY;
        this.renderSVG(svgEl);
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastTouchDist > 0) {
          this.zoom = Math.max(0.2, Math.min(3, this.zoom * (dist / lastTouchDist)));
          this.renderSVG(svgEl);
        }
        lastTouchDist = dist;
      }
    }, { passive: false });

    container.addEventListener('touchend', () => { isPanning = false; lastTouchDist = 0; });
  },

  buildGraph(svgEl) {
    const tables = DB.getTableNames();
    if (tables.length === 0) {
      svgEl.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="var(--text-muted)" font-size="16">無資料表</text>';
      return;
    }

    this.g = new dagre.graphlib.Graph();
    this.g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 });
    this.g.setDefaultEdgeLabel(() => ({}));

    const tableData = {};

    tables.forEach(t => {
      const info = DB.getTableInfo(t);
      const width = Math.max(180, t.length * 12 + 40);
      const height = 36 + info.length * 24 + 8;
      this.g.setNode(t, { width, height, label: t, columns: info });
      tableData[t] = info;
    });

    // Foreign key edges
    tables.forEach(t => {
      try {
        const result = DB.run(`PRAGMA foreign_key_list('${t.replace(/'/g, "''")}')`);
        if (result.length > 0) {
          result[0].values.forEach(fk => {
            const [, , refTable, fromCol, toCol] = fk;
            if (tables.includes(refTable)) {
              this.g.setEdge(t, refTable, { fromCol, toCol, label: `${fromCol} → ${toCol}` });
            }
          });
        }
      } catch {}
    });

    dagre.layout(this.g);

    // Center the graph
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.g.nodes().forEach(v => {
      const node = this.g.node(v);
      minX = Math.min(minX, node.x - node.width / 2);
      minY = Math.min(minY, node.y - node.height / 2);
      maxX = Math.max(maxX, node.x + node.width / 2);
      maxY = Math.max(maxY, node.y + node.height / 2);
    });

    const graphW = maxX - minX;
    const graphH = maxY - minY;

    this.renderSVG(svgEl, minX, minY, graphW, graphH);
  },

  renderSVG(svgEl, minX, minY, graphW, graphH) {
    if (!this.g) return;

    const ns = 'http://www.w3.org/2000/svg';

    // Clear
    svgEl.innerHTML = '';

    const defs = document.createElementNS(ns, 'defs');
    defs.innerHTML = `
      <marker id="fk-arrow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="10" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 3 L 0 6 z" fill="#6c5ce7" opacity="0.7"/>
      </marker>
      <filter id="table-shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
      </filter>`;
    svgEl.appendChild(defs);

    const mainGroup = document.createElementNS(ns, 'g');
    mainGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);

    // Draw edges (foreign keys)
    this.g.edges().forEach(e => {
      const edge = this.g.edge(e);
      const points = edge.points;
      if (!points || points.length < 2) return;

      let pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }

      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', pathD);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'var(--accent)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-opacity', '0.5');
      path.setAttribute('marker-end', 'url(#fk-arrow)');
      mainGroup.appendChild(path);

      // Edge label
      const mid = points[Math.floor(points.length / 2)];
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', mid.x);
      label.setAttribute('y', mid.y - 8);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', 'var(--text-muted)');
      label.setAttribute('font-size', '10');
      label.setAttribute('font-family', 'var(--font-mono)');
      label.textContent = edge.label || '';
      mainGroup.appendChild(label);
    });

    // Draw tables
    this.g.nodes().forEach(v => {
      const node = this.g.node(v);
      const x = node.x - node.width / 2;
      const y = node.y - node.height / 2;

      const group = document.createElementNS(ns, 'g');
      group.classList.add('erd-table');
      group.setAttribute('transform', `translate(${x}, ${y})`);
      group.style.cursor = 'pointer';

      // Table background
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('width', node.width);
      rect.setAttribute('height', node.height);
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', 'var(--bg-elevated)');
      rect.setAttribute('stroke', 'var(--border-light)');
      rect.setAttribute('stroke-width', '1.5');
      rect.setAttribute('filter', 'url(#table-shadow)');
      group.appendChild(rect);

      // Header background
      const headerRect = document.createElementNS(ns, 'rect');
      headerRect.setAttribute('width', node.width);
      headerRect.setAttribute('height', '36');
      headerRect.setAttribute('rx', '8');
      headerRect.setAttribute('fill', 'var(--accent)');
      headerRect.setAttribute('opacity', '0.15');
      group.appendChild(headerRect);

      // Clip for header bottom corners
      const clipRect = document.createElementNS(ns, 'rect');
      clipRect.setAttribute('y', '20');
      clipRect.setAttribute('width', node.width);
      clipRect.setAttribute('height', '16');
      clipRect.setAttribute('fill', 'var(--accent)');
      clipRect.setAttribute('opacity', '0.15');
      group.appendChild(clipRect);

      // Table name
      const title = document.createElementNS(ns, 'text');
      title.setAttribute('x', node.width / 2);
      title.setAttribute('y', '24');
      title.setAttribute('text-anchor', 'middle');
      title.setAttribute('fill', 'var(--accent)');
      title.setAttribute('font-weight', '700');
      title.setAttribute('font-size', '13');
      title.setAttribute('font-family', 'var(--font-sans)');
      title.textContent = v;
      group.appendChild(title);

      // Columns
      node.columns.forEach((col, i) => {
        const cy = 36 + i * 24 + 16;

        // PK icon
        if (col.pk) {
          const pkIcon = document.createElementNS(ns, 'text');
          pkIcon.setAttribute('x', '10');
          pkIcon.setAttribute('y', cy + 1);
          pkIcon.setAttribute('fill', 'var(--yellow)');
          pkIcon.setAttribute('font-size', '10');
          pkIcon.setAttribute('font-family', 'var(--font-mono)');
          pkIcon.textContent = 'PK';
          group.appendChild(pkIcon);
        }

        // Column name
        const colName = document.createElementNS(ns, 'text');
        colName.setAttribute('x', col.pk ? '34' : '12');
        colName.setAttribute('y', cy + 1);
        colName.setAttribute('fill', 'var(--text)');
        colName.setAttribute('font-size', '12');
        colName.setAttribute('font-family', 'var(--font-mono)');
        colName.textContent = col.name;
        group.appendChild(colName);

        // Type
        const colType = document.createElementNS(ns, 'text');
        colType.setAttribute('x', node.width - 12);
        colType.setAttribute('y', cy + 1);
        colType.setAttribute('text-anchor', 'end');
        colType.setAttribute('fill', 'var(--text-muted)');
        colType.setAttribute('font-size', '10');
        colType.setAttribute('font-family', 'var(--font-mono)');
        colType.textContent = col.type || '';
        group.appendChild(colType);

        // Separator line
        if (i < node.columns.length - 1) {
          const line = document.createElementNS(ns, 'line');
          line.setAttribute('x1', '8');
          line.setAttribute('y1', cy + 10);
          line.setAttribute('x2', node.width - 8);
          line.setAttribute('y2', cy + 10);
          line.setAttribute('stroke', 'var(--border)');
          line.setAttribute('stroke-width', '0.5');
          group.appendChild(line);
        }
      });

      // Click to open table
      group.addEventListener('click', () => {
        UI.openTableTab(v, 'table');
      });

      mainGroup.appendChild(group);
    });

    svgEl.appendChild(mainGroup);
  },

  setZoom(newZoom, container, svgEl) {
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const oldZoom = this.zoom;
    this.zoom = Math.max(0.2, Math.min(3, newZoom));

    this.panX = centerX - (centerX - this.panX) * (this.zoom / oldZoom);
    this.panY = centerY - (centerY - this.panY) * (this.zoom / oldZoom);

    this.renderSVG(svgEl);
  },

  zoomFit(container, svgEl) {
    if (!this.g) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.g.nodes().forEach(v => {
      const node = this.g.node(v);
      minX = Math.min(minX, node.x - node.width / 2);
      minY = Math.min(minY, node.y - node.height / 2);
      maxX = Math.max(maxX, node.x + node.width / 2);
      maxY = Math.max(maxY, node.y + node.height / 2);
    });

    const graphW = maxX - minX || 1;
    const graphH = maxY - minY || 1;
    const rect = container.getBoundingClientRect();
    const padding = 80;

    const scaleX = (rect.width - padding * 2) / graphW;
    const scaleY = (rect.height - padding * 2) / graphH;
    this.zoom = Math.min(scaleX, scaleY, 1.5);
    if (this.zoom < 0.1) this.zoom = 0.5;

    this.panX = (rect.width - graphW * this.zoom) / 2 - minX * this.zoom;
    this.panY = (rect.height - graphH * this.zoom) / 2 - minY * this.zoom;

    this.renderSVG(svgEl);
  },

  exportSVG(svgEl) {
    const svgData = svgEl.outerHTML;
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svgData}`], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'erd.svg';
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('SVG 已匯出', 'success');
  }
};
