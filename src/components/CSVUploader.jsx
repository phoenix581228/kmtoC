
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { parseCSV, validateCSVData } from '@/utils/csvProcessor';
import { calculateDistance } from '@/utils/googleMaps';
import { calculateCarbonEmission, normalizeTransportType, getSupportedTransportOptions } from '@/utils/carbonCalculator';
import { replaceWithTzuChiAddress } from '@/data/tzuChiLocations';

export function CSVUploader({ onBatchCalculationComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const { toast } = useToast();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      processCSVFile(csvFile);
    } else {
      toast({
        title: '檔案格式錯誤',
        description: '請上傳 CSV 格式檔案',
        variant: 'destructive'
      });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processCSVFile(file);
    }
  };

  const processCSVFile = async (file) => {
    setIsProcessing(true);
    setUploadStatus('processing');
    
    try {
      const text = await file.text();
      const { data } = parseCSV(text);
      
      // 驗證數據
      const validationErrors = validateCSVData(data);
      if (validationErrors.length > 0) {
        toast({
          title: 'CSV 格式錯誤',
          description: validationErrors.join('\n'),
          variant: 'destructive'
        });
        setUploadStatus('error');
        return;
      }

      // 批量計算
      const results = [];
      const processingErrors = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // 正規化交通工具名稱
          const normalizedTransport = normalizeTransportType(row['交通工具']);
          if (!normalizedTransport) {
            processingErrors.push(`第 ${i + 2} 行：不支援的交通工具「${row['交通工具']}」`);
            continue;
          }
          
          const distanceResult = await calculateDistance(row['起點'], row['終點']);
          
          if (distanceResult.status === 'OK') {
            const carbonEmission = calculateCarbonEmission(distanceResult.distance, normalizedTransport);
            
            results.push({
              id: `batch-${Date.now()}-${i}`,
              origin: row['起點'],
              destination: row['終點'],
              transportType: normalizedTransport, // 使用正規化後的值
              distance: distanceResult.distance,
              duration: distanceResult.duration,
              carbonEmission,
              timestamp: new Date().toISOString()
            });
          } else {
            processingErrors.push(`第 ${i + 2} 行：無法計算路線「${row['起點']} → ${row['終點']}」`);
          }
        } catch (error) {
          console.error(`處理第 ${i + 2} 行時發生錯誤:`, error);
          processingErrors.push(`第 ${i + 2} 行：處理失敗 - ${error.message}`);
        }
      }

      onBatchCalculationComplete(results);
      setUploadStatus(processingErrors.length > 0 ? 'warning' : 'success');
      
      // 顯示處理結果
      if (processingErrors.length > 0) {
        toast({
          title: `批量計算完成（有部分錯誤）`,
          description: `成功：${results.length} 筆，失敗：${processingErrors.length} 筆。查看控制台了解詳情。`,
          variant: 'destructive'
        });
        console.warn('CSV 處理錯誤詳情：', processingErrors);
      } else {
        toast({
          title: '批量計算完成！',
          description: `成功處理 ${results.length} 筆記錄`
        });
      }
      
    } catch (error) {
      console.error('處理 CSV 檔案時發生錯誤:', error);
      toast({
        title: '處理失敗',
        description: '無法處理 CSV 檔案，請檢查檔案格式',
        variant: 'destructive'
      });
      setUploadStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="glass-effect border-blue-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 gradient-text">
            <Upload className="w-6 h-6" />
            CSV 批量上傳
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`upload-zone ${isDragging ? 'border-blue-400 bg-blue-400/10' : ''} ${
              isProcessing ? 'opacity-50 pointer-events-none' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
              disabled={isProcessing}
            />
            
            <div className="flex flex-col items-center gap-4">
              {isProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full"
                />
              ) : uploadStatus === 'success' ? (
                <CheckCircle className="w-12 h-12 text-green-400" />
              ) : uploadStatus === 'error' ? (
                <AlertCircle className="w-12 h-12 text-red-400" />
              ) : (
                <FileText className="w-12 h-12 text-blue-400" />
              )}
              
              <div className="text-center">
                <p className="text-lg font-semibold text-white mb-2">
                  {isProcessing ? '正在處理檔案...' : '拖放 CSV 檔案到此處'}
                </p>
                <p className="text-sm text-white/70 mb-4">
                  或點擊下方按鈕選擇檔案
                </p>
                
                <Button
                  asChild
                  variant="outline"
                  className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
                  disabled={isProcessing}
                >
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    選擇 CSV 檔案
                  </label>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-white/80 mb-2">
              <strong>CSV 格式要求：</strong>
            </p>
            <ul className="text-xs text-white/70 space-y-1">
              <li>• <strong>必須包含欄位</strong>：起點、終點、交通工具</li>
              <li>• <strong>支援交通工具</strong>：汽車/小客車、機車/摩托車、公車/巴士/客運、火車/台鐵/高鐵、捷運/地鐵、腳踏車/自行車/單車、步行/走路</li>
              <li>• <strong>地址格式</strong>：支援詳細地址或慈濟據點名稱（如：台北市大安區-台北東區聯絡處）</li>
              <li>• <strong>慈濟據點</strong>：支援全台66個慈濟據點名稱自動轉換為詳細地址</li>
              <li>• <strong>範例</strong>：台北車站,台中市西區-台中分會,汽車</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
