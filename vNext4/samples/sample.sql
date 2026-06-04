-- SQLite Studio Web Sample Database
-- 包含 users, posts, orders, order_items 四張表
-- 以及 foreign key, index, view, trigger

-- Users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    author_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    view_count INTEGER DEFAULT 0,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- View: post with author info
CREATE VIEW IF NOT EXISTS v_posts_with_author AS
SELECT
    p.id,
    p.title,
    u.username AS author,
    p.status,
    p.view_count,
    p.published_at
FROM posts p
LEFT JOIN users u ON p.author_id = u.id;

-- View: order summary
CREATE VIEW IF NOT EXISTS v_order_summary AS
SELECT
    o.id AS order_id,
    u.username,
    o.total_amount,
    o.status,
    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
    o.created_at
FROM orders o
LEFT JOIN users u ON o.user_id = u.id;

-- Trigger: update post count on user
CREATE TRIGGER IF NOT EXISTS trg_update_post_count
AFTER INSERT ON posts
BEGIN
    UPDATE users SET is_active = is_active WHERE id = NEW.author_id;
END;

-- Trigger: audit log on order delete
CREATE TRIGGER IF NOT EXISTS trg_audit_order_delete
BEFORE DELETE ON orders
BEGIN
    SELECT RAISE(IGNORE);
END;

-- Sample data: Users
INSERT INTO users (username, email, role) VALUES
('admin', 'admin@example.com', 'admin'),
('alice', 'alice@example.com', 'editor'),
('bob', 'bob@example.com', 'user'),
('charlie', 'charlie@example.com', 'user'),
('diana', 'diana@example.com', 'editor');

-- Sample data: Posts
INSERT INTO posts (title, content, author_id, status, view_count, published_at) VALUES
('SQLite 入門指南', 'SQLite 是一個輕量級的嵌入式資料庫...', 1, 'published', 1250, '2024-01-15 10:00:00'),
('React 18 新特性', 'React 18 帶來了並行渲染...', 2, 'published', 890, '2024-02-20 14:30:00'),
('Python 爬蟲實戰', '使用 Python 進行網頁爬蟲...', 3, 'published', 2100, '2024-03-10 09:00:00'),
('CSS Grid 完全指南', 'CSS Grid 是現代網頁佈局的強大工具...', 2, 'published', 670, '2024-04-05 16:00:00'),
('Docker 容器化部署', '使用 Docker 進行應用程式容器化部署...', 1, 'draft', 0, NULL),
('Node.js RESTful API', '使用 Express.js 建立 RESTful API...', 5, 'published', 980, '2024-06-18 13:00:00'),
('Git 工作流程', '團隊協作中的 Git 分支策略...', 4, 'published', 450, '2024-08-30 10:00:00'),
('2025 前端趨勢', '展望 2025 年前端技術發展趨勢...', 2, 'draft', 0, NULL);

-- Sample data: Orders
INSERT INTO orders (user_id, total_amount, status) VALUES
(1, 299.99, 'completed'),
(2, 149.50, 'completed'),
(3, 89.00, 'pending'),
(4, 450.00, 'shipped'),
(5, 59.99, 'completed'),
(1, 199.00, 'pending');

-- Sample data: Order Items
INSERT INTO order_items (order_id, product_name, quantity, unit_price) VALUES
(1, 'SQLite 專業版', 1, 199.99),
(1, '技術支援方案', 1, 100.00),
(2, '前端課程', 1, 149.50),
(3, '雲端儲存方案', 1, 89.00),
(4, '企業授權', 1, 350.00),
(4, '技術顧問', 2, 50.00),
(5, '個人方案', 1, 59.99),
(6, '進階功能', 1, 199.00);
