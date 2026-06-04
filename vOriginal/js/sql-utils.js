window.SqlUtils = window.SqlUtils || {};

window.SqlUtils.quoteIdent = function (name) {
    if (name === null || name === undefined) {
        throw new Error("Identifier cannot be null or undefined.");
    }
    return '"' + String(name).replace(/"/g, '""') + '"';
};

window.SqlUtils.isWriteSql = function (sql) {
    const normalized = String(sql || "")
        .trim()
        .replace(/--.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim()
        .toUpperCase();
    return /^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|REPLACE|VACUUM|REINDEX|ANALYZE|ATTACH|DETACH|BEGIN|COMMIT|ROLLBACK)/.test(normalized);
};
