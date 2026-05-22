# 固定網址部署指南

這個專案建議拆成兩個固定網址：

- 前端：Vercel，提供使用者看到的中文網站
- 後端：Render，提供 FastAPI API 與 demo SQLite 資料

## 1. 推上 GitHub

```cmd
cd /d C:\Projects\gamestop-platform
git add .
git commit -m "Prepare Chinese UI and cloud deployment"
git branch -M main
git push -u origin main
```

## 2. 部署後端到 Render

1. 到 Render 建立 Web Service，連接 GitHub repo。
2. 設定：
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Environment Variables:
   - `AUTO_SEED_DEMO_DATA=true`
   - `CORS_ORIGINS=https://你的-vercel-網址.vercel.app`
4. 部署完成後，你會得到固定 API 網址，例如：
   - `https://gamestop-intel-api.onrender.com`

後端第一次啟動時會自動建立資料表並匯入 GameStop demo 資料。

## 3. 部署前端到 Vercel

1. 到 Vercel 匯入同一個 GitHub repo。
2. 設定：
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Environment Variables:
   - `VITE_API_URL=https://你的-render-api.onrender.com`
4. 部署完成後，你會得到固定網站網址，例如：
   - `https://gamestop-intel.vercel.app`

## 4. 可選：綁定自己的網域

若你有自己的網域，可以在 Vercel 的 Domains 設定中綁定，例如：

```text
https://gamestop-intel.yourdomain.com
```

後端 Render 也可綁定自訂網域，但課堂展示通常只需要 Vercel 的固定網址即可。
