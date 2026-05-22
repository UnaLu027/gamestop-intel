-- 在 XAMPP phpMyAdmin 執行這個 SQL 建立資料庫
CREATE DATABASE IF NOT EXISTS gamestop_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gamestop_db;

-- 確認建立成功
SELECT 'gamestop_db 建立成功！' AS status;
