-- AISQA 数据库初始化（Docker 首次启动用）
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS aisqa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 用户由 docker-compose.yml 的 MYSQL_USER 环境变量创建
-- 表结构由 SQLAlchemy 自动创建（app.main.py init_db）
