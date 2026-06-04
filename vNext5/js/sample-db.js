const SampleDB = {
    generate() {
        const SQL = [
            // Tables
            `CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                avatar_url TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )`,
            `CREATE TABLE categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                parent_id INTEGER,
                sort_order INTEGER DEFAULT 0,
                FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                content TEXT,
                excerpt TEXT,
                author_id INTEGER NOT NULL,
                category_id INTEGER,
                status TEXT NOT NULL DEFAULT 'draft',
                view_count INTEGER DEFAULT 0,
                is_pinned INTEGER DEFAULT 0,
                metadata TEXT,
                published_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT '#6c5ce7'
            )`,
            `CREATE TABLE post_tags (
                post_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                PRIMARY KEY (post_id, tag_id),
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                parent_id INTEGER,
                content TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                description TEXT,
                updated_at TEXT DEFAULT (datetime('now'))
            )`,

            // Indexes
            `CREATE INDEX idx_posts_author ON posts(author_id)`,
            `CREATE INDEX idx_posts_category ON posts(category_id)`,
            `CREATE INDEX idx_posts_status ON posts(status)`,
            `CREATE INDEX idx_posts_published ON posts(published_at)`,
            `CREATE INDEX idx_comments_post ON comments(post_id)`,
            `CREATE INDEX idx_comments_user ON comments(user_id)`,

            // Views
            `CREATE VIEW v_post_stats AS
            SELECT
                p.id,
                p.title,
                u.username AS author,
                c.name AS category,
                p.status,
                p.view_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND status = 'approved') AS comment_count,
                (SELECT COUNT(*) FROM post_tags WHERE post_id = p.id) AS tag_count,
                p.published_at
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id`,
            `CREATE VIEW v_popular_posts AS
            SELECT p.title, u.username AS author, p.view_count, p.published_at
            FROM posts p
            JOIN users u ON p.author_id = u.id
            WHERE p.status = 'published'
            ORDER BY p.view_count DESC
            LIMIT 10`,

            // Triggers
            `CREATE TRIGGER trg_post_update AFTER UPDATE ON posts
            BEGIN
                UPDATE posts SET created_at = datetime('now') WHERE id = NEW.id;
            END`,

            // Insert users
            `INSERT INTO users (username, email, role, avatar_url) VALUES
            ('admin', 'admin@example.com', 'admin', NULL),
            ('alice', 'alice@example.com', 'editor', 'https://i.pravatar.cc/150?u=alice'),
            ('bob', 'bob@example.com', 'user', 'https://i.pravatar.cc/150?u=bob'),
            ('charlie', 'charlie@example.com', 'user', 'https://i.pravatar.cc/150?u=charlie'),
            ('diana', 'diana@example.com', 'editor', 'https://i.pravatar.cc/150?u=diana')`,

            // Insert categories
            `INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
            ('技術', 'tech', NULL, 1),
            ('前端', 'frontend', 1, 1),
            ('後端', 'backend', 1, 2),
            ('資料庫', 'database', 1, 3),
            ('生活', 'life', NULL, 2),
            ('旅行', 'travel', 5, 1),
            ('美食', 'food', 5, 2)`,

            // Insert tags
            `INSERT INTO tags (name, color) VALUES
            ('JavaScript', '#f7df1e'),
            ('TypeScript', '#3178c6'),
            ('Python', '#3776ab'),
            ('React', '#61dafb'),
            ('Vue.js', '#42b883'),
            ('Node.js', '#339933'),
            ('SQLite', '#003b57'),
            ('CSS', '#264de4'),
            ('Docker', '#2496ed'),
            ('Git', '#f05032')`,

            // Insert posts with JSON metadata
            `INSERT INTO posts (title, slug, content, excerpt, author_id, category_id, status, view_count, is_pinned, metadata, published_at) VALUES
            ('SQLite 入門指南', 'sqlite-intro', 'SQLite 是一個輕量級的嵌入式資料庫，本教程將帶你從零開始學習。', '學習 SQLite 的基礎知識', 1, 4, 'published', 1250, 1, '{"tags":["beginner","database"],"difficulty":"easy","reading_time":10}', '2024-01-15 10:00:00'),
            ('React 18 新特性', 'react-18', 'React 18 帶來了並行渲染、Suspense 改進等新功能。', '探索 React 18', 2, 2, 'published', 890, 0, '{"tags":["react","frontend"],"difficulty":"medium","reading_time":15}', '2024-02-20 14:30:00'),
            ('Python 爬蟲實戰', 'python-scraping', '使用 Python 和 BeautifulSoup 進行網頁爬蟲。', '爬蟲入門', 3, 3, 'published', 2100, 0, '{"tags":["python","scraping"],"difficulty":"medium","reading_time":20}', '2024-03-10 09:00:00'),
            ('CSS Grid 完全指南', 'css-grid', 'CSS Grid 是現代網頁佈局的強大工具。', 'Grid 佈局', 2, 2, 'published', 670, 0, '{"tags":["css","layout"],"difficulty":"easy","reading_time":12}', '2024-04-05 16:00:00'),
            ('Docker 容器化部署', 'docker-deploy', '使用 Docker 進行應用程式容器化部署。', 'Docker 實戰', 1, 3, 'published', 1560, 1, '{"tags":["docker","devops"],"difficulty":"hard","reading_time":25}', '2024-05-12 11:00:00'),
            ('Node.js RESTful API', 'nodejs-api', '使用 Express.js 建立 RESTful API。', 'API 設計', 5, 3, 'published', 980, 0, '{"tags":["nodejs","api"],"difficulty":"medium","reading_time":18}', '2024-06-18 13:00:00'),
            ('東京旅行日記', 'tokyo-travel', '分享我的東京五日遊行程與美食。', '東京旅遊', 4, 6, 'published', 340, 0, '{"tags":["travel","japan"],"difficulty":"easy","reading_time":8}', '2024-07-22 08:00:00'),
            ('Git 工作流程', 'git-workflow', '團隊協作中的 Git 分支策略。', 'Git 最佳實踐', 1, 1, 'published', 450, 0, '{"tags":["git","workflow"],"difficulty":"easy","reading_time":10}', '2024-08-30 10:00:00'),
            ('台北咖啡廳推薦', 'taipei-cafe', '精選台北必訪咖啡廳。', '咖啡愛好者', 4, 7, 'published', 280, 0, '{"tags":["coffee","taipei"],"difficulty":"easy","reading_time":6}', '2024-09-15 15:00:00'),
            ('Vue 3 Composition API', 'vue3-composition', '深入理解 Vue 3 的 Composition API。', 'Vue 3 核心', 2, 2, 'draft', 0, 0, '{"tags":["vue3","frontend"],"difficulty":"medium","reading_time":15}', NULL),
            ('TypeScript 進階技巧', 'ts-advanced', '探討 TypeScript 的進階類型系統。', 'TS 高級用法', 5, 2, 'draft', 0, 0, '{"tags":["typescript","advanced"],"difficulty":"hard","reading_time":20}', NULL),
            ('API 設計最佳實踐', 'api-design', 'RESTful API 設計的黃金法則。', 'API 設計', 1, 3, 'published', 890, 0, '{"tags":["api","design"],"difficulty":"medium","reading_time":15}', '2024-12-05 14:00:00')`,

            // Insert post_tags
            `INSERT INTO post_tags (post_id, tag_id) VALUES
            (1, 7), (1, 3),
            (2, 1), (2, 4),
            (3, 3),
            (4, 1), (4, 8),
            (5, 9),
            (6, 1), (6, 6),
            (7, 10),
            (9, 10),
            (11, 1), (11, 5),
            (12, 1), (12, 6)`,

            // Insert comments
            `INSERT INTO comments (post_id, user_id, parent_id, content, status) VALUES
            (1, 3, NULL, '這篇文章寫得很好！', 'approved'),
            (1, 4, NULL, '請問有進階教學嗎？', 'approved'),
            (1, 2, 2, '可以參考我之前寫的文章', 'approved'),
            (2, 1, NULL, 'React 18 的 Suspense 真的很棒', 'approved'),
            (3, 5, NULL, 'Python 爬蟲要注意 robots.txt', 'approved'),
            (3, 4, 5, '感謝提醒！', 'approved'),
            (5, 3, NULL, 'Docker 真的很方便', 'approved'),
            (5, 2, NULL, '可以再講講 Docker Compose 嗎？', 'approved'),
            (6, 1, NULL, 'Express.js 的中介軟體很強大', 'approved'),
            (7, 2, NULL, '東京好想去！', 'pending'),
            (8, 4, NULL, 'Git Flow 在小團隊可能太複雜', 'approved'),
            (12, 3, NULL, 'API 版本控制很重要', 'approved')`,

            // Insert settings
            `INSERT INTO settings (key, value, description) VALUES
            ('site_name', 'SQLite Studio Demo', '網站名稱'),
            ('posts_per_page', '10', '每頁文章數'),
            ('allow_comments', '1', '允許評論'),
            ('theme', 'dark', '主題'),
            ('language', 'zh-TW', '語言'),
            ('max_upload_size', '10485760', '最大上傳大小')`
        ];

        try {
            DB.create();
            let count = 0;
            for (const stmt of SQL) {
                const trimmed = stmt.trim();
                if (!trimmed) continue;
                try {
                    DB.execute(trimmed);
                    count++;
                } catch (e) {
                    console.warn('Statement failed:', trimmed.substring(0, 80), e.message);
                }
            }
            DB.fileName = 'sample.sqlite';
            DB.modified = false;

            document.getElementById('welcomeScreen').style.display = 'none';
            UI.updateHeader();
            UI.renderSidebar();
            UI.openDashboard();
            UI.toast('範例資料庫已建立 (' + count + ' 條語句)', 'success');

            const info = DB.getDatabaseInfo();
            UI.setStatus('已連線', info.tableCount + ' 表 · ' + info.viewCount + ' 視圖 · ' + info.triggerCount + ' 觸發器 · ' + info.indexCount + ' 索引');

        } catch (e) {
            UI.toast('建立範例資料庫失敗: ' + e.message, 'error');
        }
    }
};
