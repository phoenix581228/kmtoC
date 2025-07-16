# 碳盤查系統專案概覽

## 專案目的
智能碳排放計算平台，提供個別計算器、批量上傳處理、統計圖表分析和數據管理功能，幫助用戶追蹤和管理碳足跡。

## 技術棧
- **前端框架**: React 18.2.0 + Vite 4.4.5
- **UI 框架**: Radix UI + TailwindCSS 3.3.3  
- **動畫**: Framer Motion 10.16.4
- **圖表**: Recharts 2.8.0
- **工具**: Lucide React (圖示)、React Helmet (SEO)
- **開發工具**: ESLint、PostCSS、Autoprefixer

## 核心功能模組
1. **AddressInput**: 個別路線計算器
2. **CSVUploader**: 批量檔案上傳處理
3. **CarbonResults**: 結果顯示組件
4. **Charts**: 統計圖表視覺化
5. **DataTable**: 歷史數據管理

## 工具函數
- **carbonCalculator.js**: 碳排放計算邏輯
- **googleMaps.js**: 距離計算模擬
- **csvProcessor.js**: CSV 檔案處理
- **useLocalStorage.js**: 本地儲存管理