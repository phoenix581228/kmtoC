
// Google Distance Matrix API 整合
// 支援真實 API 呼叫和本地開發模式
import { replaceWithTzuChiAddress } from '../data/tzuChiLocations.js';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const USE_REAL_API = API_KEY && API_KEY !== 'your_google_maps_api_key_here';

export async function calculateDistance(origin, destination) {
  // 自動替換慈濟據點名稱為詳細地址
  const processedOrigin = replaceWithTzuChiAddress(origin);
  const processedDestination = replaceWithTzuChiAddress(destination);
  
  // 調試資訊：顯示地址替換結果
  if (processedOrigin !== origin) {
    console.log(`📍 起點地址替換: "${origin}" → "${processedOrigin}"`);
  }
  if (processedDestination !== destination) {
    console.log(`📍 終點地址替換: "${destination}" → "${processedDestination}"`);
  }
  
  // 調試資訊：顯示當前 API 狀態
  console.log('calculateDistance called:', {
    originalOrigin: origin,
    originalDestination: destination,
    processedOrigin,
    processedDestination,
    API_KEY: API_KEY ? `${API_KEY.substring(0, 20)}...` : 'Not set',
    USE_REAL_API
  });

  if (USE_REAL_API) {
    console.log('🌐 Using Google Distance Matrix API');
    return await calculateDistanceReal(processedOrigin, processedDestination);
  } else {
    console.log('🔄 Using mock data');
    return await calculateDistanceMock(processedOrigin, processedDestination);
  }
}

// 真實 Google Distance Matrix API 呼叫（透過本地代理）
async function calculateDistanceReal(origin, destination) {
  try {
    // 使用本地代理伺服器避免 CORS 問題
    const proxyUrl = 'http://localhost:3001/api/distance';
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination
    });
    
    const fullUrl = `${proxyUrl}?${params.toString()}`;
    console.log('🌐 Making API request via proxy:', fullUrl);

    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || '未知錯誤'}`);
    }

    const data = await response.json();
    console.log('🌐 Proxy API response:', data);
    
    if (data.error) {
      console.error('❌ Proxy API error:', data);
      throw new Error(`API error: ${data.error} - ${data.message || '未知錯誤'}`);
    }

    return {
      distance: data.distance,
      duration: data.duration,
      status: 'OK',
      origin: data.origin,
      destination: data.destination,
      source: 'google-api-proxy',
      raw: data.raw // 保留原始資料供除錯使用
    };

  } catch (error) {
    console.error('Google Distance Matrix API (代理) 呼叫失敗:', error);
    
    // 發生錯誤時回退到模擬模式
    console.warn('回退到模擬模式');
    return await calculateDistanceMock(origin, destination);
  }
}

// 模擬 API 函數 (開發/備援使用)
async function calculateDistanceMock(origin, destination) {
  // 模擬 API 調用延遲
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // 模擬距離計算
  const mockDistances = {
    '台北,新北': 25,
    '台北,桃園': 45,
    '台北,台中': 180,
    '台北,台南': 350,
    '台北,高雄': 380,
    '新北,桃園': 30,
    '新北,台中': 200,
    '台中,台南': 150,
    '台中,高雄': 200,
    '台南,高雄': 50
  };
  
  // 簡化的距離查找
  const key1 = `${origin},${destination}`;
  const key2 = `${destination},${origin}`;
  
  let distance = mockDistances[key1] || mockDistances[key2];
  
  if (!distance) {
    // 如果沒有預設距離，生成隨機距離
    distance = Math.floor(Math.random() * 100) + 10;
  }
  
  return {
    distance,
    duration: Math.floor(distance / 50 * 60), // 假設平均時速 50km/h
    status: 'OK',
    origin: origin,
    destination: destination,
    mock: true // 標記為模擬資料
  };
}

export function validateAddress(address) {
  // 簡單的地址驗證
  return address && address.trim().length > 0;
}
