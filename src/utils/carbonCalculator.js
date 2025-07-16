
// 碳排放係數 (kg CO2 per km)
export const EMISSION_FACTORS = {
  car: 0.21,        // 汽車
  motorcycle: 0.09, // 機車
  bus: 0.08,        // 公車
  train: 0.04,      // 火車
  metro: 0.03,      // 捷運
  bicycle: 0,       // 腳踏車
  walking: 0        // 步行
};

export const TRANSPORT_TYPES = [
  { value: 'car', label: '汽車', icon: '🚗' },
  { value: 'motorcycle', label: '機車', icon: '🏍️' },
  { value: 'bus', label: '公車', icon: '🚌' },
  { value: 'train', label: '火車', icon: '🚆' },
  { value: 'metro', label: '捷運', icon: '🚇' },
  { value: 'bicycle', label: '腳踏車', icon: '🚲' },
  { value: 'walking', label: '步行', icon: '🚶' }
];

// 中文到英文交通工具對應表（用於 CSV 處理）
export const TRANSPORT_MAPPING = {
  // 汽車相關
  '汽車': 'car',
  '小客車': 'car',
  '轎車': 'car',
  'car': 'car',
  
  // 機車相關
  '機車': 'motorcycle',
  '摩托車': 'motorcycle',
  '重型機車': 'motorcycle',
  'motorcycle': 'motorcycle',
  
  // 公車相關
  '公車': 'bus',
  '巴士': 'bus',
  '客運': 'bus',
  'bus': 'bus',
  
  // 火車相關
  '火車': 'train',
  '台鐵': 'train',
  '高鐵': 'train', // 高鐵使用火車係數
  '鐵路': 'train',
  'train': 'train',
  
  // 捷運相關
  '捷運': 'metro',
  '地鐵': 'metro',
  'mrt': 'metro',
  'metro': 'metro',
  
  // 腳踏車相關
  '腳踏車': 'bicycle',
  '自行車': 'bicycle',
  '單車': 'bicycle',
  'bicycle': 'bicycle',
  'bike': 'bicycle',
  
  // 步行相關
  '步行': 'walking',
  '走路': 'walking',
  'walking': 'walking',
  'walk': 'walking'
};

export function calculateCarbonEmission(distance, transportType) {
  const factor = EMISSION_FACTORS[transportType] || 0;
  return distance * factor;
}

export function formatCarbonEmission(emission) {
  if (emission < 1) {
    return `${(emission * 1000).toFixed(0)} g CO₂`;
  }
  return `${emission.toFixed(2)} kg CO₂`;
}

export function getTransportLabel(transportType) {
  const transport = TRANSPORT_TYPES.find(t => t.value === transportType);
  return transport ? `${transport.icon} ${transport.label}` : transportType;
}

// 正規化交通工具名稱（將中文轉換為英文 key）
export function normalizeTransportType(inputTransport) {
  if (!inputTransport) return null;
  
  const normalized = inputTransport.trim().toLowerCase();
  const mappedTransport = TRANSPORT_MAPPING[inputTransport.trim()] || TRANSPORT_MAPPING[normalized];
  
  return mappedTransport || null;
}

// 取得所有支援的交通工具選項（用於驗證和文檔）
export function getSupportedTransportOptions() {
  const options = new Set();
  Object.keys(TRANSPORT_MAPPING).forEach(key => options.add(key));
  return Array.from(options).sort();
}
