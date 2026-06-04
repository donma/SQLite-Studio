const TableOps = {
    // ── Helper: confirm dangerous action ──
    confirmDanger(message) {
        return window.confirm(message);
    },

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

        UI.showModal("新建表", body, footer);

        document.getElementById("addColRow").onclick = () => {
            const row = document.createElement("div");
            row.className = "col-row";
            row.innerHTML = `
        <input class="col-name" placeholder="column_name">
        <select class="col-type"><option>TEXT</option><option>INTEGER</option><option>REAL</option><option>BLOB</option><option>NUMERIC</option></select>
        <input type="checkbox" class="col-pk">
        <input type="checkbox" class="col-nn">
        <input class="col-default" placeholder="">
        <button class="col-remove" onclick="this.closest('.col-row').remove()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>`;
            document.getElementById("createTableCols").appendChild(row);
        };

        document.getElementById("createTableConfirm").onclick = () => {
            const tableName = document
                .getElementById("newTableName")
                .value.trim();
            if (!tableName) {
                UI.toast("請輸入表名稱", "error");
                return;
            }

            const rows = document.querySelectorAll("#createTableCols .col-row");
            if (rows.length === 0) {
                UI.toast("至少需要一個欄位", "error");
                return;
            }

            const pkRows = [];
            rows.forEach((row) => {
                const name = row.querySelector(".col-name").value.trim();
                const type = row.querySelector(".col-type").value;
                const pk = row.querySelector(".col-pk").checked;
                const nn = row.querySelector(".col-nn").checked;
                const def = row.querySelector(".col-default").value.trim();
                if (!name) return;
                pkRows.push({ name, type, pk, nn, def });
            });

            if (pkRows.length === 0) {
                UI.toast("至少需要一個有效欄位", "error");
                return;
            }

            const checkedPk = pkRows.filter(x => x.pk);
            const t = SqlUtils.quoteIdent(tableName);

            const colDefs = pkRows.map(x => {
                let col = `${SqlUtils.quoteIdent(x.name)} ${x.type}`;
                // Single INTEGER PK: use inline PRIMARY KEY AUTOINCREMENT
                if (checkedPk.length === 1 && x.pk && x.type === "INTEGER") {
                    col += " PRIMARY KEY AUTOINCREMENT";
                    if (x.nn) col += " NOT NULL";
                    if (x.def) col += ` DEFAULT ${x.def}`;
                    return col;
                }
                // Single non-INTEGER PK
                if (checkedPk.length === 1 && x.pk) {
                    col += " PRIMARY KEY";
                }
                if (x.nn) col += " NOT NULL";
                if (x.def) col += ` DEFAULT ${x.def}`;
                return col;
            });

            // Multiple PKs: use table-level PRIMARY KEY
            if (checkedPk.length > 1) {
                colDefs.push(`PRIMARY KEY (${checkedPk.map(x => SqlUtils.quoteIdent(x.name)).join(", ")})`);
            }

            const sql = `CREATE TABLE ${t} (${colDefs.join(", ")})`;

            try {
                DB.execute(sql);
                UI.closeModal();
                UI.toast(`表 ${tableName} 已建立`, "success");
                UI.renderSidebar();
                UI.updateHeader();
            } catch (e) {
                UI.toast(e.message, "error");
            }
        };
    },

    // ── Insert Dialog ──
    showInsertDialog(tableName, info) {
        let fieldsHTML = "";
        info.forEach((col) => {
            const defaultVal =
                col.default_value !== null ? String(col.default_value) : "";
            fieldsHTML += `
        <div class="form-group">
          <label class="form-label">${UI.esc(col.name)} <span style="color:var(--text-muted);font-weight:400">${UI.esc(col.type || "")}</span></label>
          <input class="form-input" data-col="${UI.esc(col.name)}" placeholder="${col.pk ? "自動" : ""}" value="${UI.esc(defaultVal)}">
        </div>`;
        });

        const body = `<div class="insert-form">${fieldsHTML}</div>`;
        const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      <button class="btn btn-primary" id="insertConfirm">插入</button>`;

        UI.showModal(`插入資料到 ${tableName}`, body, footer);

        document.getElementById("insertConfirm").onclick = () => {
            const values = {};
            document.querySelectorAll(".insert-form .form-input").forEach((input) => {
                const col = input.dataset.col;
                const val = input.value.trim();
                if (val !== "") values[col] = val;
            });

            try {
                const cols = Object.keys(values);
                const vals = Object.values(values);
                const placeholders = vals.map(() => "?").join(", ");
                const t = SqlUtils.quoteIdent(tableName);
                const colNames = cols.map((c) => SqlUtils.quoteIdent(c)).join(", ");
                const sql = `INSERT INTO ${t} (${colNames}) VALUES (${placeholders})`;
                DB.execute(sql, vals);
                UI.closeModal();
                UI.toast("資料已插入", "success");
                UI.renderSidebar();
                UI.updateHeader();
                const dataTab = UI.tabs.find(
                    (t) => t.tableName === tableName + "-data"
                );
                if (dataTab) UI.loadDataPage(dataTab.id);
            } catch (e) {
                UI.toast(e.message, "error");
            }
        };
    },

    // ── Edit Dialog ──
    showEditDialog(tableName, columns, row, info, pkCol) {
        let fieldsHTML = "";
        columns.forEach((col, i) => {
            const colInfo = info.find((c) => c.name === col);
            const val = row[i];
            const displayVal = val === null ? "" : String(val);
            const isPK = colInfo?.pk;
            fieldsHTML += `
        <div class="form-group">
          <label class="form-label">${UI.esc(col)}${isPK ? ' <span class="pk-badge" style="font-size:10px">PK</span>' : ""} <span style="color:var(--text-muted);font-weight:400">${UI.esc(colInfo?.type || "")}</span></label>
          <input class="form-input" data-col="${UI.esc(col)}" data-idx="${i}" value="${UI.esc(displayVal)}" ${isPK ? 'readonly style="opacity:0.6"' : ""}>
        </div>`;
        });

        const body = `<div class="edit-form">${fieldsHTML}</div>`;
        const footer = `
      <button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
      <button class="btn btn-ghost" id="editNull">設為 NULL</button>
      <button class="btn btn-primary" id="editConfirm">更新</button>`;

        UI.showModal(`編輯資料`, body, footer);

        document.getElementById("editNull").onclick = () => {
            const focused = document.activeElement;
            if (focused?.classList.contains("form-input") && !focused.readOnly) {
                focused.value = "";
            }
        };

        document.getElementById("editConfirm").onclick = () => {
            const setClauses = [];
            const setValues = [];
            const whereClauses = [];
            const whereValues = [];

            document.querySelectorAll(".edit-form .form-input").forEach((input) => {
                const col = input.dataset.col;
                const idx = +input.dataset.idx;
                const colInfo = info.find((c) => c.name === col);
                if (colInfo?.pk) {
                    whereClauses.push(`${SqlUtils.quoteIdent(col)} = ?`);
                    whereValues.push(row[idx]);
                } else {
                    const val = input.value;
                    setClauses.push(`${SqlUtils.quoteIdent(col)} = ?`);
                    setValues.push(val === "" ? null : val);
                }
            });

            if (setClauses.length === 0) {
                UI.toast("無可更新的欄位", "info");
                return;
            }

            try {
                const t = SqlUtils.quoteIdent(tableName);
                DB.execute(
                    `UPDATE ${t} SET ${setClauses.join(", ")} WHERE ${whereClauses.join(" AND ")}`,
                    [...setValues, ...whereValues]
                );
                UI.closeModal();
                UI.toast("資料已更新", "success");
                UI.updateHeader();
                const dataTab = UI.tabs.find(
                    (t) => t.tableName === tableName + "-data"
                );
                if (dataTab) UI.loadDataPage(dataTab.id);
            } catch (e) {
                UI.toast(e.message, "error");
            }
        };
    },

    // ── Delete Row ──
    deleteRow(tableName, columns, row, info, pkCol, onRefresh) {
        const whereParts = [];
        const whereValues = [];
        if (pkCol) {
            const pkIdx = columns.indexOf(pkCol);
            whereParts.push(`${SqlUtils.quoteIdent(pkCol)} = ?`);
            whereValues.push(row[pkIdx]);
        } else {
            columns.forEach((col, i) => {
                if (row[i] === null) {
                    whereParts.push(`${SqlUtils.quoteIdent(col)} IS NULL`);
                } else {
                    whereParts.push(`${SqlUtils.quoteIdent(col)} = ?`);
                    whereValues.push(row[i]);
                }
            });
        }

        const whereSQL = whereParts.join(" AND ");
        const t = SqlUtils.quoteIdent(tableName);
        const msg = `你即將從 ${tableName} 刪除一筆資料。\n此操作無法復原。\n是否繼續？`;

        if (!this.confirmDanger(msg)) return;

        try {
            DB.execute(`DELETE FROM ${t} WHERE ${whereSQL}`, whereValues);
            UI.toast("資料已刪除", "success");
            UI.renderSidebar();
            UI.updateHeader();
            if (onRefresh) onRefresh();
        } catch (e) {
            UI.toast(e.message, "error");
        }
    },

    // ── Drop Table ──
    dropTable(tableName) {
        const msg = `你即將刪除資料表 ${tableName}。\n此操作會永久移除資料表與其中所有資料。\n建議先另存備份。\n是否繼續？`;
        if (!this.confirmDanger(msg)) return;

        try {
            const t = SqlUtils.quoteIdent(tableName);
            DB.execute(`DROP TABLE ${t}`);
            UI.toast(`表 ${tableName} 已刪除`, "success");
            UI.renderSidebar();
            UI.updateHeader();
            UI.tabs
                .filter((t) => t.tableName?.startsWith(tableName))
                .forEach((t) => UI.closeTab(t.id));
        } catch (e) {
            UI.toast(e.message, "error");
        }
    },

    // ── Truncate Table ──
    truncateTable(tableName) {
        const msg = `你即將清空表 ${tableName} 的所有資料。\n此操作無法復原。\n建議先另存備份。\n是否繼續？`;
        if (!this.confirmDanger(msg)) return;

        try {
            const t = SqlUtils.quoteIdent(tableName);
            DB.execute(`DELETE FROM ${t}`);
            UI.toast(`表 ${tableName} 已清空`, "success");
            UI.renderSidebar();
            UI.updateHeader();
            const dataTab = UI.tabs.find(
                (t) => t.tableName === tableName + "-data"
            );
            if (dataTab) UI.loadDataPage(dataTab.id);
        } catch (e) {
            UI.toast(e.message, "error");
        }
    },

    // ── Drop View ──
    dropView(viewName) {
        const msg = `你即將刪除視圖 ${viewName}。\n此操作無法復原。\n是否繼續？`;
        if (!this.confirmDanger(msg)) return;

        try {
            DB.execute(`DROP VIEW ${SqlUtils.quoteIdent(viewName)}`);
            UI.toast(`視圖 ${viewName} 已刪除`, "success");
            UI.renderSidebar();
            UI.updateHeader();
        } catch (e) {
            UI.toast(e.message, "error");
        }
    },

    // ── Drop Trigger ──
    dropTrigger(triggerName) {
        const msg = `你即將刪除觸發器 ${triggerName}。\n此操作無法復原。\n是否繼續？`;
        if (!this.confirmDanger(msg)) return;

        try {
            DB.execute(`DROP TRIGGER ${SqlUtils.quoteIdent(triggerName)}`);
            UI.toast(`觸發器 ${triggerName} 已刪除`, "success");
            UI.renderSidebar();
            UI.updateHeader();
            UI.tabs
                .filter((t) => t.tableName === triggerName + "-trigger")
                .forEach((t) => UI.closeTab(t.id));
        } catch (e) {
            UI.toast(e.message, "error");
        }
    },

    // ── Duplicate Table (data snapshot only) ──
    duplicateTable(tableName) {
        UI.showModal(
            "複製資料快照",
            `<div class="form-group">
        <label class="form-label">新表名稱</label>
        <input class="form-input" id="dupTableName" value="${UI.esc(tableName)}_copy">
      </div>
      <p style="color:var(--yellow);font-size:12px;margin-top:8px">注意：此操作只複製資料，不保留 primary key、foreign key、index、trigger、constraint。</p>`,
            `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="dupConfirm">複製資料</button>`
        );

        document.getElementById("dupConfirm").onclick = () => {
            const newName = document.getElementById("dupTableName").value.trim();
            if (!newName) {
                UI.toast("請輸入表名", "error");
                return;
            }
            try {
                const src = SqlUtils.quoteIdent(tableName);
                const dst = SqlUtils.quoteIdent(newName);
                DB.execute(`CREATE TABLE ${dst} AS SELECT * FROM ${src}`);
                UI.closeModal();
                UI.toast(`資料快照已複製為 ${newName}（不含 schema 約束）`, "success");
                UI.renderSidebar();
                UI.updateHeader();
            } catch (e) {
                UI.toast(e.message, "error");
            }
        };
    },

    // ── Rename Table ──
    renameTable(tableName) {
        UI.showModal(
            "重新命名",
            `<div class="form-group">
        <label class="form-label">新名稱</label>
        <input class="form-input" id="renameInput" value="${UI.esc(tableName)}">
      </div>`,
            `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="renameConfirm">重新命名</button>`
        );

        document.getElementById("renameConfirm").onclick = () => {
            const newName = document.getElementById("renameInput").value.trim();
            if (!newName) {
                UI.toast("請輸入表名", "error");
                return;
            }
            try {
                const old = SqlUtils.quoteIdent(tableName);
                DB.execute(`ALTER TABLE ${old} RENAME TO ${SqlUtils.quoteIdent(newName)}`);
                UI.closeModal();
                UI.toast(`表已重新命名為 ${newName}`, "success");
                UI.renderSidebar();
                UI.updateHeader();
                UI.tabs
                    .filter((t) => t.tableName?.startsWith(tableName))
                    .forEach((t) => UI.closeTab(t.id));
            } catch (e) {
                UI.toast(e.message, "error");
            }
        };
    },

    // ── Add Column ──
    showAddColumnDialog(tableName) {
        UI.showModal(
            "新增欄位",
            `<div class="form-row">
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
            `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="addColConfirm">新增欄位</button>`
        );

        document.getElementById("addColConfirm").onclick = () => {
            const name = document.getElementById("colName").value.trim();
            const type = document.getElementById("colType").value;
            const notnull = document.getElementById("colNotNull").checked;
            const defaultVal = document.getElementById("colDefault").value.trim();
            if (!name) {
                UI.toast("請輸入欄位名稱", "error");
                return;
            }
            try {
                let sql = `ALTER TABLE ${SqlUtils.quoteIdent(tableName)} ADD COLUMN ${SqlUtils.quoteIdent(name)} ${type}`;
                if (notnull) sql += " NOT NULL";
                if (defaultVal) sql += ` DEFAULT ${defaultVal}`;
                DB.execute(sql);
                UI.closeModal();
                UI.toast(`欄位 ${name} 已新增`, "success");
                UI.renderSidebar();
                UI.updateHeader();
                const structTab = UI.tabs.find(
                    (t) => t.tableName === tableName + "-struct"
                );
                if (structTab) UI.closeTab(structTab.id);
            } catch (e) {
                UI.toast(e.message, "error");
            }
        };
    },

    // ── Add Index ──
    showAddIndexDialog(tableName) {
        const info = DB.getTableInfo(tableName);
        const cols = info.map((c) => c.name);

        UI.showModal(
            "新增索引",
            `<div class="form-group">
        <label class="form-label">索引名稱</label>
        <input class="form-input" id="idxName" value="idx_${tableName}_">
      </div>
      <div class="form-group">
        <label class="form-label">欄位</label>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${cols.map((c) => `<label class="form-checkbox"><input type="checkbox" value="${UI.esc(c)}" class="idx-col"> ${UI.esc(c)}</label>`).join("")}
        </div>
      </div>
      <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="idxUnique"> 唯一索引</label></div>`,
            `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="addIdxConfirm">建立索引</button>`
        );

        document.getElementById("addIdxConfirm").onclick = () => {
            const name = document.getElementById("idxName").value.trim();
            const unique = document.getElementById("idxUnique").checked;
            const selectedCols = Array.from(
                document.querySelectorAll(".idx-col:checked")
            ).map((el) => el.value);
            if (!name) {
                UI.toast("請輸入索引名稱", "error");
                return;
            }
            if (selectedCols.length === 0) {
                UI.toast("請選擇至少一個欄位", "error");
                return;
            }
            try {
                const t = SqlUtils.quoteIdent(tableName);
                const idx = SqlUtils.quoteIdent(name);
                const colList = selectedCols.map((c) => SqlUtils.quoteIdent(c)).join(", ");
                DB.execute(
                    `CREATE ${unique ? "UNIQUE " : ""}INDEX ${idx} ON ${t} (${colList})`
                );
                UI.closeModal();
                UI.toast(`索引 ${name} 已建立`, "success");
                UI.renderSidebar();
                UI.updateHeader();
                const idxTab = UI.tabs.find(
                    (t) => t.tableName === tableName + "-idx"
                );
                if (idxTab) UI.closeTab(idxTab.id);
            } catch (e) {
                UI.toast(e.message, "error");
            }
        };
    },

    // ── Drop Index ──
    dropIndex(indexName, tableName) {
        const msg = `你即將刪除索引 ${indexName}。\n此操作無法復原。\n是否繼續？`;
        if (!this.confirmDanger(msg)) return;

        try {
            DB.execute(`DROP INDEX ${SqlUtils.quoteIdent(indexName)}`);
            UI.toast(`索引 ${indexName} 已刪除`, "success");
            UI.renderSidebar();
            UI.updateHeader();
            const idxTab = UI.tabs.find(
                (t) => t.tableName === tableName + "-idx"
            );
            if (idxTab) UI.closeTab(idxTab.id);
        } catch (e) {
            UI.toast(e.message, "error");
        }
    },

    // ── Delete Column (SQLite 3.35+) ──
    deleteColumn(tableName, colName) {
        const msg = `你即將從 ${tableName} 刪除欄位 ${colName}。\n此操作無法復原。\n是否繼續？`;
        if (!this.confirmDanger(msg)) return;

        try {
            const t = SqlUtils.quoteIdent(tableName);
            const c = SqlUtils.quoteIdent(colName);
            DB.execute(`ALTER TABLE ${t} DROP COLUMN ${c}`);
            UI.toast(`欄位 ${colName} 已刪除`, "success");
            UI.renderSidebar();
            UI.updateHeader();

            // Refresh structure tab
            const structTab = UI.tabs.find(t => t.tableName === tableName + "-struct");
            if (structTab) UI.closeTab(structTab.id);
            UI.openStructureTab(tableName);
        } catch (e) {
            UI.toast(`刪除欄位失敗: ${e.message}`, "error");
        }
    },

    // ── Move Column (with transaction/rollback) ──
    moveColumn(tableName, colName, direction) {
        const info = DB.getTableInfo(tableName);
        const colIdx = info.findIndex((c) => c.name === colName);
        if (colIdx === -1) return;

        const newIdx = direction === "up" ? colIdx - 1 : colIdx + 1;
        if (newIdx < 0 || newIdx >= info.length) {
            UI.toast("無法再移動", "info");
            return;
        }

        // Block complex schemas
        const createSQL = DB.getCreateSQL(tableName);
        if (SqlUtils.isComplexSchema(createSQL)) {
            UI.toast("此資料表包含複雜 schema（FOREIGN KEY / CHECK / UNIQUE / CONSTRAINT），不支援安全欄位排序。請使用匯出 SQL 後手動調整 schema。", "error");
            return;
        }

        // Block if table has triggers
        const triggers = DB.query("SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name = ?", [tableName]);
        if (triggers.length > 0 && triggers[0].values.length > 0) {
            UI.toast("此資料表有 trigger，不支援欄位排序。請使用匯出 SQL 後手動調整 schema。", "error");
            return;
        }

        const newInfo = [...info];
        [newInfo[colIdx], newInfo[newIdx]] = [newInfo[newIdx], newInfo[colIdx]];

        const msg = `你即將移動欄位 ${colName} 到${direction === "up" ? "上方" : "下方"}。\n此操作會重建表結構，建議先另存備份。\n是否繼續？`;
        if (!this.confirmDanger(msg)) return;

        const t = SqlUtils.quoteIdent(tableName);
        const failedObjects = [];

        try {
            DB.begin();

            const oldCols = info.map(c => c.name);
            const newColNames = newInfo.map(c => c.name);
            const insertCols = newColNames.filter(c => oldCols.includes(c));
            const colList = insertCols.map(c => SqlUtils.quoteIdent(c)).join(", ");

            // Build new table
            const colDefs = newInfo.map((c) => {
                let def = `${SqlUtils.quoteIdent(c.name)} ${c.type || "TEXT"}`;
                if (c.pk) def += " PRIMARY KEY";
                if (c.notnull) def += " NOT NULL";
                if (c.default_value !== null) def += ` DEFAULT ${c.default_value}`;
                return def;
            });

            const tmpName = `_tmp_${tableName}_${Date.now()}`;
            DB.execute(`CREATE TABLE ${SqlUtils.quoteIdent(tmpName)} (${colDefs.join(", ")})`);

            // Copy data using INSERT INTO SELECT (no row limit)
            DB.execute(`INSERT INTO ${SqlUtils.quoteIdent(tmpName)} (${colList}) SELECT ${colList} FROM ${t}`);

            // Get indexes, triggers, views SQL
            const masterSQL = DB.query(
                "SELECT type, name, sql FROM sqlite_master WHERE tbl_name = ? AND type IN ('index', 'trigger', 'view') AND sql IS NOT NULL",
                [tableName]
            );
            const relatedSQL = masterSQL.length > 0 ? masterSQL[0].values : [];

            // Drop original and rename
            DB.execute(`DROP TABLE ${t}`);
            DB.execute(`ALTER TABLE ${SqlUtils.quoteIdent(tmpName)} RENAME TO ${t}`);

            // Recreate indexes, triggers, views
            relatedSQL.forEach((row) => {
                try { DB.execute(row[2]); } catch (e) { failedObjects.push(row[1]); }
            });

            DB.commit();

            UI.toast(`欄位 ${colName} 已移動`, "success");
            UI.renderSidebar();
            UI.updateHeader();

            const structTab = UI.tabs.find(t => t.tableName === tableName + "-struct");
            if (structTab) UI.closeTab(structTab.id);
            UI.openStructureTab(tableName);

            if (failedObjects.length > 0) {
                UI.showModal(
                    "部分物件重建失敗",
                    `<p>表格資料已重建，但以下物件重建失敗：</p>
          <ul>${failedObjects.map((n) => `<li style="color:var(--red)">${UI.esc(n)}</li>`).join("")}</ul>
          <p style="color:var(--text-secondary);font-size:12px;margin-top:8px">請手動檢查 SQL。</p>`,
                    '<button class="btn btn-primary" onclick="UI.closeModal()">確定</button>'
                );
            }
        } catch (e) {
            DB.rollback();
            UI.toast(`欄位移動失敗: ${e.message}`, "error");
        }
    },

    // ── Export SQL ──
    exportSQL(tableName) {
        try {
            const total = DB.getTableCount(tableName);
            const limit = 100000;
            if (total > limit) {
                if (!this.confirmDanger(`表 ${tableName} 共有 ${total} 筆資料，目前只會匯出前 ${limit} 筆。\n若要完整匯出，請使用整庫下載。\n是否繼續？`)) return;
            }
            const createSQL = DB.getCreateSQL(tableName);
            const data = DB.getTableData(tableName, { limit });
            let sql = createSQL + ";\n\n";
            data.rows.forEach((row) => {
                const vals = row.map((v) =>
                    v === null ? "NULL" : typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : v
                );
                const colList = data.columns.map((c) => SqlUtils.quoteIdent(c)).join(", ");
                sql += `INSERT INTO ${SqlUtils.quoteIdent(tableName)} (${colList}) VALUES (${vals.join(", ")});\n`;
            });
            const blob = new Blob([sql], { type: "text/sql;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${tableName}.sql`;
            a.click();
            URL.revokeObjectURL(a.href);
            UI.toast(`${tableName}.sql 已匯出 (${data.rows.length} 筆)`, "success");
        } catch (e) {
            UI.toast(e.message, "error");
        }
    },

    // ── Export CSV ──
    exportCSV(tableName) {
        try {
            const total = DB.getTableCount(tableName);
            const limit = 100000;
            if (total > limit) {
                if (!this.confirmDanger(`表 ${tableName} 共有 ${total} 筆資料，目前只會匯出前 ${limit} 筆。\n是否繼續？`)) return;
            }
            const data = DB.getTableData(tableName, { limit });
            let csv = data.columns.join(",") + "\n";
            data.rows.forEach((row) => {
                csv += row.map((cell) => {
                    if (cell === null) return "";
                    const s = String(cell);
                    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
                }).join(",") + "\n";
            });
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${tableName}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            UI.toast(`${tableName}.csv 已匯出 (${data.rows.length} 筆)`, "success");
        } catch (e) {
            UI.toast(e.message, "error");
        }
    },

    // ── Export JSON ──
    exportJSON(tableName) {
        try {
            const total = DB.getTableCount(tableName);
            const limit = 100000;
            if (total > limit) {
                if (!this.confirmDanger(`表 ${tableName} 共有 ${total} 筆資料，目前只會匯出前 ${limit} 筆。\n是否繼續？`)) return;
            }
            const data = DB.getTableData(tableName, { limit });
            const rows = data.rows.map((row) => {
                const obj = {};
                data.columns.forEach((col, i) => { obj[col] = row[i]; });
                return obj;
            });
            const json = JSON.stringify(rows, null, 2);
            const blob = new Blob([json], { type: "application/json;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${tableName}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            UI.toast(`${tableName}.json 已匯出 (${data.rows.length} 筆)`, "success");
        } catch (e) {
            UI.toast(e.message, "error");
        }
    },

    // ── Import CSV ──
    importCSV() {
        if (!DB.db) {
            UI.toast("請先開啟數據庫", "error");
            return;
        }

        UI.showModal(
            "匯入 CSV",
            `<div class="form-group"><label class="form-label">目標表名</label><input class="form-input" id="importTableName" placeholder="table_name"></div>
      <div class="form-group"><label class="form-label">CSV 檔案</label><input type="file" class="form-input" id="importCSVFile" accept=".csv,.tsv,.txt"></div>
      <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="importHasHeader" checked> 首行為欄位名稱</label></div>
      <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="importAppend"> 追加到既有表</label></div>
      <p style="color:var(--text-muted);font-size:11px;margin-top:8px">注意：目前不支援含換行符號的 CSV 欄位（多行欄位）。若 CSV 包含多行欄位，請先處理後再匯入。</p>
      <div id="importPreview" style="margin-top:12px"></div>`,
            `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="importCSVConfirm">匯入</button>`
        );

        // Preview on file select
        document.getElementById("importCSVFile").onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const lines = ev.target.result.split("\n").filter((l) => l.trim());
                const parseCSVLine = (line) => {
                    const result = [];
                    let current = "";
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const ch = line[i];
                        if (ch === '"') {
                            if (inQuotes && line[i + 1] === '"") {
                                current += '"';
                                i++;
                            } else inQuotes = !inQuotes;
                        } else if (ch === "," && !inQuotes) {
                            result.push(current);
                            current = "";
                        } else {
                            current += ch;
                        }
                    }
                    result.push(current);
                    return result;
                };

                const hasHeader = document.getElementById("importHasHeader").checked;
                const headerRow = hasHeader ? parseCSVLine(lines[0]) : null;
                const previewRows = lines.slice(hasHeader ? 1 : 0, 21);
                const colCount = headerRow
                    ? headerRow.length
                    : parseCSVLine(lines[0]).length;

                let html = `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">${lines.length - (hasHeader ? 1 : 0)} 筆資料 · ${colCount} 欄</div>`;
                if (headerRow) {
                    html += `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">欄位: ${headerRow.map((h) => `<code>${UI.esc(h.trim() || "(空白)")}</code>`).join(", ")}</div>`;
                }
                html += '<div style="max-height:150px;overflow:auto;font-size:11px;font-family:var(--font-mono)">';
                previewRows.forEach((line) => {
                    html += `<div style="padding:2px 0;border-bottom:1px solid var(--border)">${UI.esc(line.substring(0, 120))}</div>`;
                });
                html += "</div>";
                document.getElementById("importPreview").innerHTML = html;
            };
            reader.readAsText(file);
        };

        document.getElementById("importCSVConfirm").onclick = () => {
            const tableName = document.getElementById("importTableName").value.trim();
            const fileInput = document.getElementById("importCSVFile");
            const hasHeader = document.getElementById("importHasHeader").checked;
            const append = document.getElementById("importAppend").checked;
            if (!tableName) {
                UI.toast("請輸入表名", "error");
                return;
            }
            if (!fileInput.files.length) {
                UI.toast("請選擇檔案", "error");
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const lines = e.target.result.split("\n").filter((l) => l.trim());
                    if (lines.length === 0) {
                        UI.toast("CSV 檔案為空", "error");
                        return;
                    }

                    const parseCSVLine = (line) => {
                        const result = [];
                        let current = "";
                        let inQuotes = false;
                        for (let i = 0; i < line.length; i++) {
                            const ch = line[i];
                            if (ch === '"') {
                                if (inQuotes && line[i + 1] === '"') {
                                    current += '"';
                                    i++;
                                } else inQuotes = !inQuotes;
                            } else if (ch === "," && !inQuotes) {
                                result.push(current);
                                current = "";
                            } else {
                                current += ch;
                            }
                        }
                        result.push(current);
                        return result;
                    };

                    let columns, startRow;
                    if (hasHeader) {
                        columns = parseCSVLine(lines[0]).map((c) => c.trim());
                        startRow = 1;
                    } else {
                        const colCount = parseCSVLine(lines[0]).length;
                        columns = Array.from(
                            { length: colCount },
                            (_, i) => `column_${i + 1}`
                        );
                        startRow = 0;
                    }

                    // Clean up column names
                    columns = columns.map((c) => c.trim() || "unnamed");

                    // Handle duplicate column names
                    const seen = {};
                    columns = columns.map((c) => {
                        if (seen[c]) {
                            seen[c]++;
                            return `${c}_${seen[c]}`;
                        }
                        seen[c] = 1;
                        return c;
                    });

                    if (!append) {
                        const colDefs = columns
                            .map((c) => `${SqlUtils.quoteIdent(c)} TEXT`)
                            .join(", ");
                        DB.execute(
                            `CREATE TABLE IF NOT EXISTS ${SqlUtils.quoteIdent(tableName)} (${colDefs})`
                        );
                    }

                    const t = SqlUtils.quoteIdent(tableName);
                    const colList = columns.map((c) => SqlUtils.quoteIdent(c)).join(", ");
                    const placeholders = columns.map(() => "?").join(", ");
                    const insertSQL = `INSERT INTO ${t} (${colList}) VALUES (${placeholders})`;

                    let success = 0;
                    let failed = 0;
                    for (let i = startRow; i < lines.length; i++) {
                        const values = parseCSVLine(lines[i]);
                        try {
                            DB.execute(insertSQL, values);
                            success++;
                        } catch {
                            failed++;
                        }
                    }

                    UI.closeModal();
                    UI.toast(
                        `匯入完成: ${success} 成功${failed > 0 ? `, ${failed} 失敗` : ""}`,
                        failed > 0 ? "info" : "success"
                    );
                    UI.renderSidebar();
                    UI.updateHeader();
                } catch (err) {
                    UI.toast("匯入失敗: " + err.message, "error");
                }
            };
            reader.readAsText(fileInput.files[0]);
        };
    },
};
