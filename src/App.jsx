
import React, { useState } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Leaf, BarChart3, Upload, Database, TestTube, Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/toaster';
import { AddressInput } from '@/components/AddressInput';
import { CSVUploader } from '@/components/CSVUploader';
import { OCRUploader } from '@/components/OCRUploader';
import { CarbonResults } from '@/components/CarbonResults';
import { Charts } from '@/components/Charts';
import { DataTable } from '@/components/DataTable';
import { ApiTest } from '@/components/ApiTest';
import { useLocalStorage } from '@/hooks/useLocalStorage';

function App() {
  const [calculations, setCalculations] = useLocalStorage('carbon-calculations', []);
  const [currentCalculation, setCurrentCalculation] = useState(null);
  const [ocrResults, setOcrResults] = useLocalStorage('ocr-results', []);

  const handleCalculationComplete = (calculation) => {
    const newCalculation = {
      ...calculation,
      id: `calc-${Date.now()}`,
      carbonEmission: calculation.distance * 0.21 // 預設汽車排放係數
    };
    
    setCurrentCalculation(newCalculation);
    setCalculations(prev => [newCalculation, ...prev]);
  };

  const handleBatchCalculationComplete = (batchResults) => {
    setCalculations(prev => [...batchResults, ...prev]);
    setCurrentCalculation(null);
  };

  const handleOCRComplete = (ocrResult) => {
    console.log('🔄 OCR 完成回調:', ocrResult);
    
    const newOcrResult = {
      ...ocrResult,
      id: `ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setOcrResults(prev => [newOcrResult, ...prev]);
    
    // 如果有交通相關資訊，也加入碳盤查計算
    if (ocrResult.extractedData?.transportInfo?.items?.length > 0) {
      const transportInfo = ocrResult.extractedData.transportInfo;
      const carbonCalculations = [];
      
      transportInfo.items.forEach((item, index) => {
        if (item.transportType && item.transportType !== 'unknown') {
          // 為交通項目建立碳盤查記錄（假設距離）
          const carbonCalculation = {
            id: `ocr-transport-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            origin: '發票來源',
            destination: '目的地',
            transportType: item.transportType,
            distance: item.amount / 10, // 簡單估算：每10元約1公里
            carbonEmission: (item.amount / 10) * (item.transportType === 'car' ? 0.21 : 
                           item.transportType === 'train' ? 0.04 : 
                           item.transportType === 'bus' ? 0.08 : 0.1),
            timestamp: ocrResult.timestamp,
            source: 'ocr',
            originalItem: item
          };
          carbonCalculations.push(carbonCalculation);
        }
      });
      
      if (carbonCalculations.length > 0) {
        setCalculations(prev => [...carbonCalculations, ...prev]);
        console.log('✅ 已加入', carbonCalculations.length, '筆交通碳盤查記錄');
      }
    }
  };

  const handleClearData = () => {
    setCalculations([]);
    setCurrentCalculation(null);
  };

  const handleClearOCRData = () => {
    setOcrResults([]);
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>碳盤查系統 - 智能碳排放計算平台</title>
        <meta name="description" content="專業的碳排放計算系統，支援手動輸入和CSV批量上傳，提供詳細的統計圖表和數據分析，幫助您追蹤和管理碳足跡。" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex justify-center items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold gradient-text">
                碳盤查系統
              </h1>
            </div>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              智能碳排放計算平台，支援路線規劃、批量處理與數據分析
            </p>
          </motion.div>

          {/* Main Content */}
          <Tabs defaultValue="calculator" className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
              <TabsTrigger value="calculator" className="flex items-center gap-2">
                <Leaf className="w-4 h-4" />
                計算器
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                批量上傳
              </TabsTrigger>
              <TabsTrigger value="ocr" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                發票 OCR
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                統計圖表
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                數據管理
              </TabsTrigger>
              <TabsTrigger value="api-test" className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                API 測試
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calculator" className="space-y-8">
              <AddressInput onCalculationComplete={handleCalculationComplete} />
              {currentCalculation && (
                <CarbonResults calculation={currentCalculation} />
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-8">
              <CSVUploader onBatchCalculationComplete={handleBatchCalculationComplete} />
            </TabsContent>

            <TabsContent value="ocr" className="space-y-8">
              <OCRUploader onOCRComplete={handleOCRComplete} />
              {ocrResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">OCR 處理結果</h3>
                  {ocrResults.slice(0, 5).map((result) => (
                    <div key={result.id} className="glass-effect p-4 rounded-lg border border-white/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-green-400">{result.fileName}</h4>
                        <span className="text-xs text-white/60">
                          {new Date(result.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {result.extractedData ? (
                        <div className="space-y-2 text-sm text-white/80">
                          {result.extractedData.invoiceNumber && (
                            <p><strong>發票號碼：</strong>{result.extractedData.invoiceNumber}</p>
                          )}
                          {result.extractedData.date && (
                            <p><strong>日期：</strong>{result.extractedData.date}</p>
                          )}
                          {result.extractedData.totalAmount && (
                            <p><strong>總金額：</strong>NT$ {result.extractedData.totalAmount}</p>
                          )}
                          {result.extractedData.transportInfo && (
                            <div className="mt-2 p-2 bg-green-400/10 rounded">
                              <p className="font-semibold text-green-400">交通項目已加入碳盤查</p>
                              <p className="text-xs">共 {result.extractedData.transportInfo.items.length} 項，
                                 總金額 NT$ {result.extractedData.transportInfo.totalTransportAmount}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-white/60 text-sm">未能提取結構化資料</p>
                      )}
                    </div>
                  ))}
                  {ocrResults.length > 5 && (
                    <p className="text-white/60 text-sm text-center">
                      顯示最近 5 筆結果，共 {ocrResults.length} 筆
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="charts" className="space-y-8">
              <Charts calculations={calculations} />
            </TabsContent>

            <TabsContent value="data" className="space-y-8">
              <DataTable 
                calculations={calculations} 
                onClearData={handleClearData}
              />
            </TabsContent>

            <TabsContent value="api-test" className="space-y-8">
              <ApiTest />
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 text-center"
          >
            <div className="glass-effect rounded-xl p-6 border border-white/20">
              <p className="text-white/70 text-sm mb-3">
                🌱 讓我們一起為地球環保盡一份心力，減少碳排放，創造更美好的未來！
              </p>
              <div className="flex justify-center items-center gap-4 text-xs text-white/50">
                <span>碳盤查系統</span>
                <span>•</span>
                <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent font-semibold">
                  v0.5.0
                </span>
                <span>•</span>
                <span>圖檔轉PDF前置處理里程碑</span>
              </div>
            </div>
          </motion.footer>
        </div>

        <Toaster />
      </div>
    </HelmetProvider>
  );
}

export default App;
