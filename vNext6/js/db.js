const DB = {
    db: null,
    SQL: null,
    fileName: '',
    fileHandle: null,
    modified: false,

    async init() {
        if (window.location.protocol === 'https:' || window.location.protocol === 'http:') {
            this.SQL = await initSqlJs({ locateFile: file => `lib/${file}` });
        } else {
            this.SQL = await initSqlJs();
        }
    },

    create() {
        this.db = new this.SQL.Database();
        this.fileName = 'untitled.sqlite';
        this.fileHandle = null;
        this.modified = false;
        return this;
    },

    loadFromArrayBuffer(buffer, fileName) {
        this.db = new this.SQL.Database(new Uint8Array(buffer));
        this.fileName = fileName || 'untitled.sqlite';
        this.modified = false;
        return this;
    },

    hasFSAccess() {
        return 'showOpenFilePicker' in window && window.isSecureContext;
    },

    async openFile() {
        if (this.hasFSAccess()) {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'SQLite Database',
                        accept: { 'application/x-sqlite': ['.sqlite', '.db', '.sqlite3', '.db3'] }
                    }]
                });
                const file = await handle.getFile();
                const buf = await file.arrayBuffer();
                this.fileHandle = handle;
                this.loadFromArrayBuffer(buf, file.name);
                await Storage.saveHandle('lastDB', handle);
                return true;
            } catch (e) {
                if (e.name !== 'AbortError') throw e;
                return false;
            }
        }
        return this.openFileFallback();
    },

    openFileFallback() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.sqlite,.db,.sqlite3,.db3';
            input.onchange = async () => {
                const file = input.files[0];
                if (!file) { resolve(false); return; }
                const buf = await file.arrayBuffer();
                this.fileHandle = null;
                this.loadFromArrayBuffer(buf, file.name);
                resolve(true);
            };
            input.click();
        });
    },

    async openLast() {
        try {
            const handle = await Storage.getHandle('lastDB');
            if (!handle) return false;
            const perm = await handle.queryPermission({ mode: 'readwrite' });
            if (perm === 'granted') {
                const file = await handle.getFile();
                const buf = await file.arrayBuffer();
                this.fileHandle = handle;
                this.loadFromArrayBuffer(buf, file.name);
                return true;
            }
            if (perm === 'prompt') {
                const newPerm = await handle.requestPermission({ mode: 'readwrite' });
                if (newPerm === 'granted') {
                    const file = await handle.getFile();
                    const buf = await file.arrayBuffer();
                    this.fileHandle = handle;
                    this.loadFromArrayBuffer(buf, file.name);
                    return true;
                }
            }
        } catch (e) { /* ignore */ }
        return false;
    },

    async save() {
        if (!this.db) return false;
        if (this.fileHandle) {
            try {
                const data = this.db.export();
                const writable = await this.fileHandle.createWritable();
                await writable.write(data);
                await writable.close();
                this.modified = false;
                return true;
            } catch (e) {
                if (e.name !== 'AbortError') throw e;
                return false;
            }
        }
        return this.saveAs();
    },

    async saveAs() {
        if (!this.db) return false;
        if (this.hasFSAccess()) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: this.fileName,
                    types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite': ['.sqlite'] } }]
                });
                const data = this.db.export();
                const writable = await handle.createWritable();
                await writable.write(data);
                await writable.close();
                this.fileHandle = handle;
                this.fileName = handle.name;
                this.modified = false;
                await Storage.saveHandle('lastDB', handle);
                return true;
            } catch (e) {
                if (e.name !== 'AbortError') throw e;
                return false;
            }
        }
        this.exportAsDownload();
        this.modified = false;
        UI.toast('已產生下載檔。若下載被瀏覽器阻擋，請重新另存。', 'info');
        return true;
    },

    exportAsDownload() {
        if (!this.db) return;
        const data = this.db.export();
        const blob = new Blob([data], { type: 'application/x-sqlite' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = this.fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    // Query: SELECT / PRAGMA / EXPLAIN — does NOT mark modified
    query(sql, params = []) {
        if (!this.db) throw new Error('Database is not opened.');
        return this.db.exec(sql, params || []);
    },

    // Execute: INSERT / UPDATE / DELETE / CREATE / ALTER / DROP — marks modified
    // Uses db.run() for write operations (correct API)
    execute(sql, params = []) {
        if (!this.db) throw new Error('Database is not opened.');
        this.db.run(sql, params || []);
        this.modified = true;
        return true;
    },

    // Legacy run: auto-detect if write operation
    run(sql, params = []) {
        if (!this.db) throw new Error('Database is not opened.');
        if (SqlUtils.isWriteSql(sql)) {
            return this.execute(sql, params);
        }
        return this.query(sql, params);
    },

    getTableNames() {
        if (!this.db) return [];
        const result = this.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
        return result.length > 0 ? result[0].values.map(r => r[0]) : [];
    },

    getViewNames() {
        if (!this.db) return [];
        const result = this.query("SELECT name FROM sqlite_master WHERE type='view' ORDER BY name");
        return result.length > 0 ? result[0].values.map(r => r[0]) : [];
    },

    getIndexNames() {
        if (!this.db) return [];
        const result = this.query("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name");
        return result.length > 0 ? result[0].values.map(r => r[0]) : [];
    },

    getTriggerNames() {
        if (!this.db) return [];
        const result = this.query("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name");
        return result.length > 0 ? result[0].values.map(r => r[0]) : [];
    },

    getTableInfo(tableName) {
        const t = SqlUtils.quoteIdent(tableName);
        const result = this.query(`PRAGMA table_info(${t})`);
        if (result.length === 0) return [];
        return result[0].values.map(row => ({
            cid: row[0], name: row[1], type: row[2],
            notnull: row[3], default_value: row[4], pk: row[5]
        }));
    },

    getTableCount(tableName) {
        try {
            const t = SqlUtils.quoteIdent(tableName);
            const result = this.query(`SELECT COUNT(*) FROM ${t}`);
            return result[0]?.values[0]?.[0] ?? 0;
        } catch { return 0; }
    },

    getTableData(tableName, { offset = 0, limit = 100, orderBy = null, orderDir = 'ASC', where = '' } = {}) {
        const t = SqlUtils.quoteIdent(tableName);
        let sql = `SELECT * FROM ${t}`;
        if (where) sql += ` WHERE ${where}`;
        if (orderBy) {
            const col = SqlUtils.quoteIdent(orderBy);
            sql += ` ORDER BY ${col} ${orderDir === 'DESC' ? 'DESC' : 'ASC'}`;
        }
        sql += ` LIMIT ${limit} OFFSET ${offset}`;
        const countSql = `SELECT COUNT(*) FROM ${t}${where ? ' WHERE ' + where : ''}`;
        const data = this.query(sql);
        const countResult = this.query(countSql);
        const total = countResult[0]?.values[0]?.[0] ?? 0;
        return {
            columns: data.length > 0 ? data[0].columns : [],
            rows: data.length > 0 ? data[0].values : [],
            total
        };
    },

    getCreateSQL(tableName) {
        const result = this.query('SELECT sql FROM sqlite_master WHERE name = ?', [tableName]);
        return result[0]?.values[0]?.[0] || '';
    },

    getDatabaseInfo() {
        const tables = this.getTableNames();
        const views = this.getViewNames();
        const indexes = this.getIndexNames();
        const triggers = this.getTriggerNames();
        let totalPages = 0, pageSize = 0;
        try { totalPages = this.query('PRAGMA page_count')[0]?.values[0]?.[0] ?? 0; } catch {}
        try { pageSize = this.query('PRAGMA page_size')[0]?.values[0]?.[0] ?? 0; } catch {}
        return {
            tables, views, indexes, triggers,
            size: totalPages * pageSize,
            tableCount: tables.length, viewCount: views.length,
            indexCount: indexes.length, triggerCount: triggers.length
        };
    },

    vacuum() {
        if (!this.db) throw new Error('Database is not opened.');
        const before = this.db.export().length;
        this.execute('VACUUM');
        const after = this.db.export().length;
        return { before, after, saved: before - after };
    },

    integrityCheck() {
        if (!this.db) throw new Error('Database is not opened.');
        const result = this.query('PRAGMA integrity_check');
        return result.length > 0 ? result[0].values : [];
    },

    begin() {
        this.db.run('BEGIN TRANSACTION');
    },

    commit() {
        this.db.run('COMMIT');
    },

    rollback() {
        try { this.db.run('ROLLBACK'); } catch (e) { console.error('Rollback failed:', e); }
    }
};
