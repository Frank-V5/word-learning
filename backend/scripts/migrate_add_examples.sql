-- ============================================================
-- word_dict 增加例句字段 (example_en / example_cn)
-- 适用于已存在的旧库; 新库由 schema.sql 的 CREATE TABLE 直接包含。
--
-- 执行方式 (SQLite 原生不支持 ADD COLUMN IF NOT EXISTS, 故用 SELECT 判断):
--   sqlite3 backend/data/wordlearning.db < scripts/migrate_add_examples.sql
--
-- 注意: 后端 getDb() 启动时已内置幂等自动迁移, 通常无需手动跑此文件;
--       此文件仅作留档/手动补库用。
-- ============================================================

-- 仅当列不存在时才添加 (SQLite 的 ADD COLUMN 不可重复执行, 必须先查)
-- 用 PRAGMA table_info 配合 shell 一次性完成:
--   以下两行在 sqlite3 CLI 里直接粘贴执行即可;
--   若列已存在会报 "duplicate column name" —— 属正常, 忽略即可, 或改用 db/index.js 的自动迁移。

ALTER TABLE word_dict ADD COLUMN example_en TEXT;   -- 例句英文 (GLM 生成, CEFR A2-B1)
ALTER TABLE word_dict ADD COLUMN example_cn TEXT;   -- 例句中文翻译

-- 验证:
-- SELECT name FROM pragma_table_info('word_dict');
