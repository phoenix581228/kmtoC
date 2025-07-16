# Google Maps API 整合 POC 測試指南

## 🎯 POC 目標
測試 Google Distance Matrix API 整合功能，驗證真實 API 呼叫和錯誤處理機制。

## 📋 準備步驟

### 1. 獲取 Google Maps API Key
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 "Distance Matrix API"
4. 建立 API 金鑰
5. 設定 API 金鑰限制（建議限制來源網域）

### 2. 配置環境變數
編輯 `.env` 檔案，更新 API Key：
```bash
# 將 your_google_maps_api_key_here 替換為實際的 API Key
VITE_GOOGLE_MAPS_API_KEY=AIzaSyABC123...你的API金鑰
```

### 3. 啟動開發伺服器
```bash
npm run dev
```

## 🧪 測試流程

### 階段 1: 確認模擬模式 (不需要 API Key)
1. 打開應用程式 (http://localhost:5173)
2. 前往 "API 測試" 標籤頁
3. 點擊 "開始 API 測試"
4. 確認顯示 "目前使用模擬資料模式"
5. 驗證所有測試都顯示 "資料來源: 模擬資料"

### 階段 2: 真實 API 測試 (需要有效的 API Key)
1. 在 `.env` 檔案中設置真實的 API Key
2. 重新啟動開發伺服器 (`npm run dev`)
3. 前往 "API 測試" 標籤頁
4. 確認顯示 "已配置 Google Maps API Key"
5. 點擊 "開始 API 測試"
6. 驗證測試結果顯示 "資料來源: Google API"

### 階段 3: 功能驗證
1. 前往 "計算器" 標籤頁
2. 輸入真實地址進行測試：
   - 起點: `台北車站`
   - 終點: `桃園機場`
   - 選擇交通工具
3. 點擊 "計算碳排放量"
4. 確認顯示正確的距離和資料來源

## 🔍 測試重點

### 品質檢查點
- **📋 API 狀態確認**: 檢查 API Key 是否正確配置
- **🌐 網路請求**: 使用瀏覽器 DevTools Network 檢查 API 請求
- **✅ 回應數據**: 確認 API 回應格式正確
- **🔄 錯誤處理**: 測試無效 API Key 或網路錯誤時的處理
- **⚡ 性能**: 檢查 API 響應時間

### 測試案例
1. **有效地址**: `台北車站` → `桃園機場`
2. **英文地址**: `Taipei Main Station` → `Taoyuan Airport`
3. **無效地址**: `不存在的地址` → `另一個不存在的地址`
4. **網路錯誤**: 暫時斷網測試錯誤處理

## 🚨 問題排除

### 常見問題
1. **API Key 無效**: 檢查 `.env` 檔案中的 API Key 格式
2. **CORS 錯誤**: Google Distance Matrix API 支援客戶端請求
3. **配額超限**: 檢查 Google Cloud Console 中的 API 配額
4. **地址無法識別**: 使用更具體的地址格式

### Debug 資訊
- 開啟瀏覽器 DevTools Console 查看詳細錯誤資訊
- 在開發模式下會自動記錄 API 回應資料
- 檢查 Network 面板中的 API 請求狀態

## 📊 預期結果

### 成功標準
- ✅ 模擬模式正常運作
- ✅ 真實 API 模式可以獲取準確距離
- ✅ 錯誤處理機制正常
- ✅ 用戶介面顯示正確的資料來源
- ✅ API 響應時間在合理範圍內 (< 2秒)

### 驗收要點
1. 能夠在沒有 API Key 時使用模擬資料
2. 配置 API Key 後能夠獲取真實距離資料
3. 錯誤發生時能夠優雅地回退到模擬模式
4. 用戶能夠清楚知道當前使用的資料來源
5. 整體用戶體驗流暢無卡頓

## 🎯 POC 交付物
- [x] 功能完整的 Google API 整合
- [x] 模擬資料備援機制
- [x] 錯誤處理和用戶回饋
- [x] API 測試工具
- [x] 完整的測試指南

**下午 POC 準備完成！** 🚀