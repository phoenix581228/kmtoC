import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function EnvDebug() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // 檢查各種可能的問題
  const checks = [
    {
      name: '環境變數是否存在',
      status: apiKey ? 'pass' : 'fail',
      value: apiKey ? '✅ 已設置' : '❌ 未設置',
      detail: apiKey ? `長度: ${apiKey.length} 字符` : '請檢查 .env 檔案'
    },
    {
      name: 'API Key 格式檢查',
      status: apiKey && apiKey.startsWith('AIza') ? 'pass' : 'fail',
      value: apiKey && apiKey.startsWith('AIza') ? '✅ 格式正確' : '❌ 格式錯誤',
      detail: apiKey ? `前綴: ${apiKey.substring(0, 10)}...` : '應以 AIza 開頭'
    },
    {
      name: '是否為預設值',
      status: apiKey && apiKey !== 'your_google_maps_api_key_here' ? 'pass' : 'fail',
      value: apiKey && apiKey !== 'your_google_maps_api_key_here' ? '✅ 已更新' : '❌ 仍為預設值',
      detail: apiKey === 'your_google_maps_api_key_here' ? '需要設置真實 API Key' : '已設置真實值'
    }
  ];

  const overallStatus = checks.every(check => check.status === 'pass') ? 'pass' : 'fail';

  return (
    <Card className="glass-effect border-orange-400/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-400" />
          環境變數診斷
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 總體狀態 */}
        <div className={`p-3 rounded-lg border ${
          overallStatus === 'pass' 
            ? 'bg-green-500/10 border-green-400/30' 
            : 'bg-red-500/10 border-red-400/30'
        }`}>
          <div className="flex items-center gap-2">
            {overallStatus === 'pass' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-white font-medium">
              {overallStatus === 'pass' ? 'API Key 配置正常' : 'API Key 配置有問題'}
            </span>
          </div>
        </div>

        {/* 詳細檢查項目 */}
        <div className="space-y-2">
          {checks.map((check, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded bg-white/5">
              <div className="flex items-center gap-2">
                {check.status === 'pass' ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-white text-sm">{check.name}</span>
              </div>
              <div className="text-right">
                <div className="text-white text-sm">{check.value}</div>
                <div className="text-white/60 text-xs">{check.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 原始數據顯示 */}
        <div className="p-3 rounded bg-black/20 border border-white/10">
          <div className="text-white/80 text-sm mb-2">原始環境變數：</div>
          <div className="font-mono text-xs text-green-300 break-all">
            VITE_GOOGLE_MAPS_API_KEY = {apiKey || '(未設置)'}
          </div>
        </div>

        {/* 修復建議 */}
        {overallStatus === 'fail' && (
          <div className="p-3 rounded bg-yellow-500/10 border border-yellow-400/30">
            <div className="text-yellow-300 font-medium mb-2">修復建議：</div>
            <div className="text-yellow-200 text-sm space-y-1">
              <div>1. 確認 .env 檔案存在於專案根目錄</div>
              <div>2. 確認環境變數名稱為 VITE_GOOGLE_MAPS_API_KEY</div>
              <div>3. 確認 API Key 格式正確 (以 AIza 開頭)</div>
              <div>4. 重新啟動開發伺服器載入新的環境變數</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}