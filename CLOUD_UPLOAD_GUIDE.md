# Apache/PHP 雲端上傳指南

請把本機這個資料夾裡的內容上傳到雲端主機的 `htdocs`：

```text
C:\Projects\gamestop-platform\cloud-upload\htdocs
```

正確的雲端結構應該是：

```text
htdocs/
  index.html
  assets/
  api/
```

如果主機的 File Manager 不能一次上傳資料夾，請手動建立：

```text
htdocs/assets
htdocs/api
htdocs/api/data
```

然後分別上傳：

```text
C:\Projects\gamestop-platform\cloud-upload\htdocs\index.html
C:\Projects\gamestop-platform\cloud-upload\htdocs\assets\所有檔案
C:\Projects\gamestop-platform\cloud-upload\htdocs\api\index.php
C:\Projects\gamestop-platform\cloud-upload\htdocs\api\data\app-data.json
C:\Projects\gamestop-platform\cloud-upload\htdocs\api\data\user-state.json
```

上傳完成後，打開主機給你的固定網址即可。
