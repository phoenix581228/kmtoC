import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, Image, AlertCircle, CheckCircle, FileImage, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import ChatbotSelector from './ChatbotSelector';
import { prepareFileForMaiAgent, isImageFile, isPdfFile } from '../utils/imageToPdf';

export function OCRUploader({ onOCRComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [conversionInfo, setConversionInfo] = useState(null); // 轉換資訊
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
    const supportedFile = files.find(file => 
      isImageFile(file) || isPdfFile(file)
    );
    
    if (supportedFile) {
      processFileForOCR(supportedFile);
    } else {
      toast({
        title: '檔案格式錯誤',
        description: '請上傳圖片檔案（JPG、PNG、GIF、WebP）或 PDF 檔案',
        variant: 'destructive'
      });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFileForOCR(file);
    }
  };

  const processFileForOCR = async (file) => {
    // 檢查是否已選擇 chatbot
    if (!selectedChatbot) {
      toast({
        title: '請選擇 OCR Agent',
        description: '在處理檔案前，請先從列表中選擇一個 OCR Agent',
        variant: 'destructive'
      });
      return;
    }

    // 檢查檔案大小（建議 10MB 以下）
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: '檔案過大',
        description: '檔案大小請控制在 10MB 以內',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    setUploadStatus('processing');
    setConversionInfo(null);
    
    // 建立預覽（只對圖檔）
    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }

    try {
      // 第一步：準備檔案（如果是圖檔則轉為PDF）
      console.log('🔄 準備檔案處理...');
      const preparedFile = await prepareFileForMaiAgent(file);
      
      // 記錄轉換資訊
      if (preparedFile.wasConverted) {
        const conversionData = {
          wasConverted: true,
          originalType: preparedFile.originalType,
          originalSize: `${(file.size / 1024).toFixed(1)}KB`,
          convertedSize: `${(preparedFile.file.size / 1024).toFixed(1)}KB`,
          originalName: file.name,
          convertedName: preparedFile.file.name
        };
        setConversionInfo(conversionData);
        
        toast({
          title: '圖檔轉換完成',
          description: `已將圖檔轉換為PDF格式，準備進行OCR處理`,
        });
      }

      // 第二步：準備OCR請求
      const formData = new FormData();
      formData.append('file', preparedFile.file);
      formData.append('chatbotId', selectedChatbot.id);

      console.log('🔍 開始 OCR 處理:', {
        原始檔案: file.name,
        處理檔案: preparedFile.file.name,
        是否轉換: preparedFile.wasConverted,
        Chatbot: selectedChatbot.name
      });
      
      // 第三步：發送OCR請求
      const response = await fetch('http://localhost:3001/api/ocr', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OCR 處理失敗: ${response.status} - ${errorData.message || '未知錯誤'}`);
      }

      const result = await response.json();
      console.log('✅ OCR 處理結果:', result);

      if (result.success) {
        setUploadStatus('success');
        
        // 傳遞結果給父元件，包含轉換資訊
        onOCRComplete({
          fileName: file.name,
          fileSize: file.size,
          extractedData: result.extractedData,
          rawResponse: result.rawResponse,
          conversationId: result.conversationId,
          timestamp: new Date().toISOString(),
          conversionInfo: conversionInfo // 新增轉換資訊
        });

        const successMessage = preparedFile.wasConverted 
          ? `成功將圖檔轉換為PDF並完成OCR處理！${result.extractedData?.invoiceNumber ? '提取到發票資料' : ''}` 
          : `OCR 處理完成！${result.extractedData?.invoiceNumber ? '成功提取發票內容' : ''}`;

        toast({
          title: 'OCR 處理完成！',
          description: successMessage
        });
      } else {
        throw new Error('OCR 處理未成功');
      }
      
    } catch (error) {
      console.error('檔案處理失敗:', error);
      setUploadStatus('error');
      setPreviewImage(null);
      setConversionInfo(null);
      
      // 根據錯誤類型提供更具體的錯誤訊息
      let errorMessage = error.message;
      if (error.message.includes('圖檔轉PDF失敗')) {
        errorMessage = '圖檔轉換為PDF時發生錯誤，請嘗試其他圖檔或直接上傳PDF檔案';
      }
      
      toast({
        title: '處理失敗',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearUpload = () => {
    setUploadStatus(null);
    setPreviewImage(null);
    setConversionInfo(null);
  };

  // 使用 useCallback 避免 onSelect 函數在每次渲染時重新創建
  const handleChatbotSelect = useCallback((chatbot) => {
    setSelectedChatbot(chatbot);
    console.log('已選擇 OCR Agent:', chatbot);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="glass-effect border-green-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 gradient-text">
            <Camera className="w-6 h-6" />
            發票 OCR 上傳
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Chatbot 選擇器 */}
          <div className="mb-4">
            <ChatbotSelector 
              onSelect={handleChatbotSelect}
              defaultChatbotId={selectedChatbot?.id}
            />
          </div>

          <div
            className={`upload-zone ${isDragging ? 'border-green-400 bg-green-400/10' : ''} ${
              isProcessing ? 'opacity-50 pointer-events-none' : ''
            } ${previewImage ? 'min-h-[300px]' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
              disabled={isProcessing}
            />
            
            {previewImage ? (
              // 預覽模式
              <div className="space-y-4">
                <div className="relative">
                  <img 
                    src={previewImage} 
                    alt="預覽圖片" 
                    className="max-w-full max-h-64 mx-auto rounded-lg border border-white/20"
                  />
                  {!isProcessing && (
                    <Button
                      onClick={clearUpload}
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 border-white/30 text-white hover:bg-white/10"
                    >
                      重新選擇
                    </Button>
                  )}
                </div>
                
                <div className="flex flex-col items-center gap-4">
                  {isProcessing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full"
                    />
                  ) : uploadStatus === 'success' ? (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  ) : uploadStatus === 'error' ? (
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  ) : null}
                  
                  <p className="text-sm text-white/80">
                    {isProcessing ? '正在處理檔案，請耐心等待...' : 
                     uploadStatus === 'success' ? 'OCR 處理完成' :
                     uploadStatus === 'error' ? 'OCR 處理失敗' :
                     '準備進行 OCR 處理'}
                  </p>
                  
                  {/* 顯示轉換資訊 */}
                  {conversionInfo && (
                    <div className="mt-2 p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-medium text-blue-300">檔案轉換資訊</span>
                      </div>
                      <div className="text-xs text-blue-200 space-y-1">
                        <div>原始檔案: {conversionInfo.originalName} ({conversionInfo.originalSize})</div>
                        <div>轉換後: {conversionInfo.convertedName} ({conversionInfo.convertedSize})</div>
                        <div className="text-blue-300">✓ 已成功轉換為PDF格式，相容MaiAgent</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // 上傳模式
              <div className="flex flex-col items-center gap-4">
                {isProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full"
                  />
                ) : uploadStatus === 'success' ? (
                  <CheckCircle className="w-12 h-12 text-green-400" />
                ) : uploadStatus === 'error' ? (
                  <AlertCircle className="w-12 h-12 text-red-400" />
                ) : (
                  <FileImage className="w-12 h-12 text-green-400" />
                )}
                
                <div className="text-center">
                  <p className="text-lg font-semibold text-white mb-2">
                    {isProcessing ? '正在處理檔案，請耐心等待...' : '拖放圖片或 PDF 到此處'}
                  </p>
                  <p className="text-sm text-white/70 mb-4">
                    支援發票、收據、車票、機票、船票等圖片或 PDF 檔案
                  </p>
                  
                  <Button
                    asChild
                    variant="outline"
                    className="border-green-400 text-green-400 hover:bg-green-400 hover:text-white"
                    disabled={isProcessing}
                  >
                    <label htmlFor="image-upload" className="cursor-pointer">
                      選擇檔案
                    </label>
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-white/80 mb-2">
              <strong>支援格式與功能：</strong>
            </p>
            <ul className="text-xs text-white/70 space-y-1">
              <li>• <strong>圖片格式</strong>：JPG、PNG、GIF、WebP、BMP、TIFF（建議 10MB 以內）</li>
              <li>• <strong>PDF 格式</strong>：直接支援 PDF 檔案處理</li>
              <li>• <strong>自動轉換</strong>：圖片檔案會自動轉換為 PDF 格式以相容 MaiAgent API</li>
              <li>• <strong>處理內容</strong>：發票號碼、統一編號、日期、品項、金額</li>
              <li>• <strong>交通票券</strong>：自動識別交通相關項目，協助碳盤查</li>
              <li>• <strong>智能識別</strong>：支援各種票據格式的自動識別</li>
              <li>• <strong>處理時間</strong>：包含轉換和 AI 分析，需要 30-90 秒，請耐心等待</li>
              <li>• <strong>轉換優化</strong>：自動調整圖片尺寸和壓縮以確保最佳 OCR 效果</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}