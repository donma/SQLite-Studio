(function () {
    'use strict';

    window.SqlUtils = window.SqlUtils || {};

    window.SqlUtils.quoteIdent = function (name) {
        if (name === null || name === undefined) {
            throw new Error('SQL identifier cannot be null or undefined.');
        }
        return '"' + String(name).replace(/"/g, '""') + '"';
    };

    window.SqlUtils.quoteIdentList = function (names) {
        if (!Array.isArray(names)) {
            throw new Error('SQL identifier list must be an array.');
        }
        return names.map(window.SqlUtils.quoteIdent).join(', ');
    };

    // Only true DDL/DML — excludes BEGIN/COMMIT/ROLLBACK
    window.SqlUtils.isWriteSql = function (sql) {
        const normalized = String(sql || '')
            .replace(/\/\*[\s\S]*?\*\//g, ' ')
            .replace(/^\s*--.*$/gm, ' ')
            .trim()
            .toUpperCase();
        return /^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|REPLACE|VACUUM|REINDEX|ANALYZE|ATTACH|DETACH)\b/.test(normalized);
    };

    // Check if table has complex schema that blocks moveColumn
    window.SqlUtils.isComplexSchema = function (createSQL) {
        if (!createSQL) return false;
        const upper = createSQL.toUpperCase();
        const blockers = ['FOREIGN KEY', 'CHECK', 'UNIQUE', 'CONSTRAINT', 'GENERATED', 'WITHOUT ROWID'];
        return blockers.some(kw => upper.includes(kw));
    };

})();
