import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function DirectApiTest() {
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const testDirectApi = async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      setTestResult({
        success: false,
        error: 'API Key 未配置或仍為預設值'
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // 使用本地代理伺服器避免 CORS 問題
      const proxyUrl = 'http://localhost:3001/api/distance';
      const params = new URLSearchParams({
        origins: '台北車站',
        destinations: '桃園機場'
      });
      
      const fullUrl = `${proxyUrl}?${params.toString()}`;
      console.log('Testing API call via proxy:', fullUrl);

      const response = await fetch(fullUrl);
      const data = await response.json();
      
      console.log('Proxy API Response:', data);

      if (data.error) {
        setTestResult({
          success: false,
          error: `API 錯誤: ${data.error} - ${data.message || '未知錯誤'}`,
          raw: data
        });
      } else if (data.distance && data.duration) {
        setTestResult({
          success: true,
          data: {
            distance: data.distance,
            duration: data.duration,
            source: data.source || 'google-api-proxy',
            raw: data
          }
        });
      } else {
        setTestResult({
          success: false,
          error: '回應格式錯誤或資料不完整',
          raw: data
        });
      }
    } catch (error) {
      console.error('Direct API test failed:', error);
      setTestResult({
        success: false,
        error: `網路錯誤: ${error.message}`,
        networkError: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-effect border-purple-400/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-purple-400" />
          直接 API 測試
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-white/80 text-sm">
          直接測試 Google Distance Matrix API 是否可用
        </div>

        <Button
          onClick={testDirectApi}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              測試中...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              測試 Google API
            </>
          )}
        </Button>

        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success
              ? 'bg-green-500/10 border-green-400/30'
              : 'bg-red-500/10 border-red-400/30'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className="text-white font-medium">
                {testResult.success ? 'API 測試成功！' : 'API 測試失敗'}
              </span>
            </div>

            {testResult.success && testResult.data && (
              <div className="text-white/80 text-sm space-y-1">
                <div>✅ 台北車站 → 桃園機場</div>
                <div>🚗 距離: {testResult.data.distance} 公里</div>
                <div>⏱️ 時間: {testResult.data.duration} 分鐘</div>
                <div className="text-green-300 font-medium">🌐 Google Maps API 回應正常</div>
              </div>
            )}

            {!testResult.success && (
              <div className="text-red-300 text-sm">
                ❌ 錯誤: {testResult.error}
              </div>
            )}

            {testResult.raw && (
              <details className="mt-3">
                <summary className="text-white/60 text-xs cursor-pointer">
                  查看原始 API 回應
                </summary>
                <pre className="text-xs text-white/60 mt-2 overflow-auto max-h-40">
                  {JSON.stringify(testResult.raw, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="text-white/60 text-xs">
          💡 這個測試會直接呼叫 Google API，不經過應用程式的邏輯層
        </div>
      </CardContent>
    </Card>
  );
}