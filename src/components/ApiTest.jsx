import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TestTube, CheckCircle, XCircle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateDistance } from '@/utils/googleMaps';
import { EnvDebug } from './EnvDebug';
import { DirectApiTest } from './DirectApiTest';

export function ApiTest() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const testCases = [
    { origin: '台北車站', destination: '桃園機場', description: '中文地址測試' },
    { origin: 'Taipei Main Station', destination: 'Taoyuan Airport', description: '英文地址測試' },
    { origin: '台北市信義區', destination: '台中市西屯區', description: '城市區域測試' }
  ];

  const runApiTest = async (testCase, index) => {
    try {
      const startTime = Date.now();
      const result = await calculateDistance(testCase.origin, testCase.destination);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        ...testCase,
        index,
        success: true,
        result,
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        ...testCase,
        index,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    for (let i = 0; i < testCases.length; i++) {
      const testResult = await runApiTest(testCases[i], i);
      setTestResults(prev => [...prev, testResult]);
    }

    setIsRunning(false);
  };

  const getApiStatus = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('API Key status check:', { apiKey: apiKey ? 'Set' : 'Not set', length: apiKey?.length });
    
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      return { 
        status: 'mock', 
        message: '目前使用模擬資料模式',
        detail: '未設置有效的 Google Maps API Key'
      };
    }
    return { 
      status: 'real', 
      message: '已配置 Google Maps API Key',
      detail: `API Key: ${apiKey.substring(0, 20)}...`
    };
  };

  const apiStatus = getApiStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* 環境變數診斷 */}
      <EnvDebug />
      
      {/* 直接 API 測試 */}
      <DirectApiTest />
      
      <Card className="glass-effect border-blue-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 gradient-text">
            <TestTube className="w-6 h-6" />
            Google API 整合測試
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API 狀態顯示 */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <Globe className={`w-5 h-5 ${apiStatus.status === 'real' ? 'text-green-400' : 'text-yellow-400'}`} />
              <div className="flex-1">
                <div className="text-white font-medium">{apiStatus.message}</div>
                <div className="text-white/70 text-sm">{apiStatus.detail}</div>
              </div>
              {apiStatus.status === 'real' && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
            </div>
          </div>

          {/* 測試按鈕 */}
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {isRunning ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
              />
            ) : (
              <TestTube className="w-4 h-4 mr-2" />
            )}
            {isRunning ? '測試進行中...' : '開始 API 測試'}
          </Button>

          {/* 測試結果 */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold">測試結果：</h3>
              {testResults.map((test, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg border ${
                    test.success
                      ? 'bg-green-500/10 border-green-400/30'
                      : 'bg-red-500/10 border-red-400/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {test.success ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {test.description}: {test.origin} → {test.destination}
                      </div>
                      {test.success && test.result && (
                        <div className={`text-sm font-medium ${
                          test.result.mock ? 'text-yellow-300' : 'text-green-300'
                        }`}>
                          🔄 {test.result.mock ? '模擬資料' : 'Google API'} 
                          {!test.result.mock && ' ✅'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {test.success && test.result && (
                    <div className="text-sm text-white/80 space-y-1">
                      <div>距離: {test.result.distance} 公里</div>
                      <div>時間: {test.result.duration} 分鐘</div>
                      <div>響應時間: {test.responseTime} ms</div>
                      <div>資料來源: {test.result.mock ? '模擬資料' : 'Google API'}</div>
                    </div>
                  )}
                  
                  {!test.success && (
                    <div className="text-sm text-red-300">
                      錯誤: {test.error}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}