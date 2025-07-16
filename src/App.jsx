
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Leaf, BarChart3, Upload, Database, TestTube } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/toaster';
import { AddressInput } from '@/components/AddressInput';
import { CSVUploader } from '@/components/CSVUploader';
import { CarbonResults } from '@/components/CarbonResults';
import { Charts } from '@/components/Charts';
import { DataTable } from '@/components/DataTable';
import { ApiTest } from '@/components/ApiTest';
import { useLocalStorage } from '@/hooks/useLocalStorage';

function App() {
  const [calculations, setCalculations] = useLocalStorage('carbon-calculations', []);
  const [currentCalculation, setCurrentCalculation] = useState(null);

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

  const handleClearData = () => {
    setCalculations([]);
    setCurrentCalculation(null);
  };

  return (
    <>
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
            <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
              <TabsTrigger value="calculator" className="flex items-center gap-2">
                <Leaf className="w-4 h-4" />
                計算器
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                批量上傳
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
              <p className="text-white/70 text-sm">
                🌱 讓我們一起為地球環保盡一份心力，減少碳排放，創造更美好的未來！
              </p>
            </div>
          </motion.footer>
        </div>

        <Toaster />
      </div>
    </>
  );
}

export default App;
