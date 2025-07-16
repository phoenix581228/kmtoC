
import { normalizeTransportType, getSupportedTransportOptions } from './carbonCalculator.js';

export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }
  
  return { headers, data };
}

export function validateCSVData(data) {
  const requiredFields = ['起點', '終點', '交通工具'];
  const errors = [];
  const supportedTransports = getSupportedTransportOptions();
  
  if (data.length === 0) {
    errors.push('CSV 檔案沒有數據行');
    return errors;
  }
  
  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 因為有標題行且從1開始計算
    
    // 檢查必要欄位
    requiredFields.forEach(field => {
      if (!row[field] || row[field].trim() === '') {
        errors.push(`第 ${rowNumber} 行缺少必要欄位: ${field}`);
      }
    });
    
    // 驗證交通工具是否有效
    if (row['交通工具'] && row['交通工具'].trim()) {
      const normalizedTransport = normalizeTransportType(row['交通工具']);
      if (!normalizedTransport) {
        errors.push(`第 ${rowNumber} 行交通工具「${row['交通工具']}」無效。支援的選項：${supportedTransports.join(', ')}`);
      }
    }
    
    // 驗證地址不為空且合理
    ['起點', '終點'].forEach(field => {
      if (row[field] && row[field].trim().length < 2) {
        errors.push(`第 ${rowNumber} 行${field}「${row[field]}」過短，請提供詳細地址`);
      }
    });
  });
  
  return errors;
}

export function exportToCSV(data, filename = 'carbon_footprint_report.csv') {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header] || '').join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
