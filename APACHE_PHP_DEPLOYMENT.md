# Apache + PHP 發布方式

這個版本會把網站整理成：

- Apache 提供 React 靜態前端
- PHP 提供 `/api/...` 後端 API
- JSON 檔案提供展示資料
- Python/ML 保留在開發端，負責資料處理、模型訓練與匯出資料

## 本機打包

先確認已經跑過：

```cmd
cd /d C:\Projects\gamestop-platform
reinstall.bat
```

然後產生 Apache/PHP 發布資料夾：

```cmd
scripts\build_apache_php.bat
```

產物會在：

```text
C:\Projects\gamestop-platform\apache-php
```

## 放到本機 Apache

把 `apache-php` 內容複製到：

```text
C:\Apache24\htdocs\gamestop
```

然後瀏覽：

```text
http://localhost/gamestop
```

## Apache 設定

目前這版不需要修改 Apache 全域設定，也不需要開啟 `.htaccess`。
前端使用 hash route，PHP API 會走 `api/index.php/...`。

## 上傳到雲端

雲端主機只要支援 Apache + PHP，就可以上傳整個 `apache-php` 資料夾內容。

例如你固定網址是：

```text
https://your-domain.com
```

只要把 `apache-php` 裡的所有檔案放到網站根目錄，前端會自動呼叫同一個網域底下的 PHP API：

```text
https://your-domain.com/api/index.php/market/GME/summary
```

## 注意

這個 PHP 版本適合課堂展示與固定網址發布。若之後要做即時爬蟲、真正模型訓練、排程任務，仍建議保留 Python/FastAPI 或讓 PHP 呼叫 Python 腳本。
