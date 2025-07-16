// Google Maps API 代理伺服器
// 解決 CORS 跨域問題
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// 允許跨域
app.use(cors());
app.use(express.json());

// 讀取環境變數
let API_KEY;
try {
  const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
  const keyMatch = envFile.match(/VITE_GOOGLE_MAPS_API_KEY=(.+)/);
  API_KEY = keyMatch ? keyMatch[1].trim() : null;
} catch (error) {
  console.error('無法讀取 .env 檔案:', error);
}

// Google Distance Matrix API 代理端點
app.get('/api/distance', async (req, res) => {
  const { origins, destinations } = req.query;
  
  if (!API_KEY) {
    return res.status(500).json({
      error: 'API Key 未配置',
      message: '請檢查 .env 檔案中的 VITE_GOOGLE_MAPS_API_KEY'
    });
  }

  if (!origins || !destinations) {
    return res.status(400).json({
      error: '參數錯誤',
      message: '需要 origins 和 destinations 參數'
    });
  }

  try {
    // 構建 Google API URL
    const params = new URLSearchParams({
      origins: origins,
      destinations: destinations,
      key: API_KEY,
      units: 'metric',
      language: 'zh-TW'
    });

    const googleApiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    
    console.log('🌐 呼叫 Google API:', { origins, destinations });
    console.log('🔗 API URL:', googleApiUrl);

    // 呼叫 Google API
    const response = await fetch(googleApiUrl);
    const data = await response.json();

    console.log('✅ Google API 回應:', data.status);

    if (data.status !== 'OK') {
      return res.status(400).json({
        error: 'Google API 錯誤',
        status: data.status,
        message: data.error_message || '未知錯誤',
        details: data
      });
    }

    // 返回處理過的結果
    const element = data.rows[0]?.elements[0];
    
    if (!element || element.status !== 'OK') {
      return res.status(400).json({
        error: '路線計算失敗',
        status: element?.status || '未知錯誤',
        details: data
      });
    }

    const result = {
      distance: Math.round(element.distance.value / 1000), // 轉換為公里
      duration: Math.round(element.duration.value / 60), // 轉換為分鐘
      status: 'OK',
      origin: origins,
      destination: destinations,
      source: 'google-api',
      raw: element
    };

    console.log('📊 回傳結果:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ API 呼叫失敗:', error);
    res.status(500).json({
      error: '伺服器錯誤',
      message: error.message,
      type: 'network_error'
    });
  }
});

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Google Maps 代理伺服器運行中',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!API_KEY
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Google Maps 代理伺服器啟動於 http://localhost:${PORT}`);
  console.log(`📍 API 端點: http://localhost:${PORT}/api/distance`);
  console.log(`💚 健康檢查: http://localhost:${PORT}/api/health`);
  console.log(`🔑 API Key 狀態: ${API_KEY ? '已配置' : '未配置'}`);
});