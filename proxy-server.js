// Google Maps API 代理伺服器
// 解決 CORS 跨域問題
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { convert } from 'pdf-poppler';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, mkdirSync, existsSync, writeFileSync, unlinkSync, appendFileSync } from 'fs';
import { Readable } from 'stream';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// 允許跨域
app.use(cors());
app.use(express.json());

// 設定檔案上傳
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 限制
  }
});

// 建立 temp 目錄
const tempDir = join(__dirname, 'temp');
if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

// 建立 logs 目錄
const logsDir = join(__dirname, 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// 詳細日誌記錄系統
class DetailedLogger {
  constructor(logFile) {
    this.logFile = join(logsDir, logFile);
    this.sessionId = uuidv4().substring(0, 8);
    this.stepCounter = 0;
    
    // 初始化日誌檔案
    this.writeLog('===== 新的 OCR 處理會話開始 =====', 'INFO');
    this.writeLog(`會話 ID: ${this.sessionId}`, 'INFO');
    this.writeLog(`開始時間: ${new Date().toISOString()}`, 'INFO');
    this.writeLog('================================\n', 'INFO');
  }

  writeLog(message, level = 'INFO', data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      sessionId: this.sessionId,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };
    
    const logLine = `[${timestamp}] [${this.sessionId}] [${level}] ${message}${data ? '\nData: ' + logEntry.data : ''}\n`;
    
    // 寫入檔案
    appendFileSync(this.logFile, logLine);
    
    // 同時輸出到控制台
    if (level === 'ERROR') {
      console.error(`[${this.sessionId}] ${message}`, data || '');
    } else {
      console.log(`[${this.sessionId}] ${message}`, data || '');
    }
  }

  startStep(stepName) {
    this.stepCounter++;
    const stepId = `STEP-${this.stepCounter}`;
    this.writeLog(`\n----- ${stepId}: ${stepName} -----`, 'STEP');
    return stepId;
  }

  endStep(stepId, success = true, result = null) {
    this.writeLog(`----- ${stepId} 結束: ${success ? '成功' : '失敗'} -----`, success ? 'SUCCESS' : 'ERROR', result);
  }
}

// 從發票品項中提取交通相關資訊
function extractTransportInfo(items) {
  const transportKeywords = [
    '車票', '機票', '船票', '火車', '高鐵', '捷運', '公車', '計程車', '計程車費',
    '交通費', '車資', '燃料費', '油費', '停車費', '過路費', '通行費',
    '航空', '飛機', '船舶', '渡輪', '巴士', '客運'
  ];
  
  const transportItems = items.filter(item => {
    const description = item.description || '';
    return transportKeywords.some(keyword => description.includes(keyword));
  });
  
  if (transportItems.length === 0) {
    return null;
  }
  
  return {
    hasTransportItems: true,
    items: transportItems.map(item => ({
      description: item.description,
      amount: item.amount,
      quantity: item.quantity,
      // 嘗試識別交通工具類型
      transportType: identifyTransportType(item.description)
    })),
    totalTransportAmount: transportItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  };
}

// 識別交通工具類型
function identifyTransportType(description) {
  const typeMap = {
    '高鐵': 'train',
    '火車': 'train', 
    '台鐵': 'train',
    '機票': 'plane',
    '航空': 'plane',
    '飛機': 'plane',
    '船票': 'ship',
    '船舶': 'ship',
    '渡輪': 'ship',
    '捷運': 'metro',
    '地鐵': 'metro',
    '公車': 'bus',
    '巴士': 'bus',
    '客運': 'bus',
    '計程車': 'taxi',
    '計程車費': 'taxi',
    '油費': 'car',
    '燃料費': 'car'
  };
  
  for (const [keyword, type] of Object.entries(typeMap)) {
    if (description.includes(keyword)) {
      return type;
    }
  }
  
  return 'unknown';
}

// PDF 轉圖片處理函數
async function convertPdfToImage(pdfBuffer) {
  console.log('📄 開始處理 PDF 檔案');
  
  // 建立臨時檔案
  const tempPdfPath = join(tempDir, `temp-${Date.now()}.pdf`);
  
  try {
    // 寫入 PDF 到臨時檔案
    writeFileSync(tempPdfPath, pdfBuffer);
    
    // PDF 轉換選項
    const options = {
      format: 'jpeg',
      out_dir: tempDir,
      out_prefix: `pdf-page-${Date.now()}`,
      page: 1, // 只處理第一頁
      quality: 85
    };
    
    // 轉換 PDF 第一頁為圖片
    const imageFiles = await convert(tempPdfPath, options);
    
    if (!imageFiles || imageFiles.length === 0) {
      throw new Error('PDF 轉換失敗：沒有產生圖片');
    }
    
    // 讀取生成的圖片
    const imagePath = imageFiles[0];
    const imageBuffer = readFileSync(imagePath);
    
    // 清理臨時檔案
    unlinkSync(tempPdfPath);
    unlinkSync(imagePath);
    
    console.log('✅ PDF 轉圖片完成');
    return imageBuffer;
    
  } catch (error) {
    console.error('❌ PDF 處理失敗:', error);
    
    // 清理臨時檔案
    try {
      if (existsSync(tempPdfPath)) unlinkSync(tempPdfPath);
    } catch (cleanupError) {
      console.error('清理臨時檔案失敗:', cleanupError);
    }
    
    throw new Error('PDF 處理失敗: ' + error.message);
  }
}

// 讀取環境變數
let GOOGLE_API_KEY, MAIAGENT_API_KEY, MAIAGENT_CONVERSATION_ID;
try {
  const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
  const googleKeyMatch = envFile.match(/VITE_GOOGLE_MAPS_API_KEY=(.+)/);
  const maiagentKeyMatch = envFile.match(/MAIAGENT_API_KEY=(.+)/);
  const maiagentConversationMatch = envFile.match(/MAIAGENT_CONVERSATION_ID=(.+)/);
  
  GOOGLE_API_KEY = googleKeyMatch ? googleKeyMatch[1].trim() : null;
  MAIAGENT_API_KEY = maiagentKeyMatch ? maiagentKeyMatch[1].trim() : null;
  MAIAGENT_CONVERSATION_ID = maiagentConversationMatch ? maiagentConversationMatch[1].trim() : null;
} catch (error) {
  console.error('無法讀取 .env 檔案:', error);
}

// Google Distance Matrix API 代理端點
app.get('/api/distance', async (req, res) => {
  const { origins, destinations } = req.query;
  
  if (!GOOGLE_API_KEY) {
    return res.status(500).json({
      error: 'API Key 未配置',
      message: '請檢查 .env 檔案中的 VITE_GOOGLE_MAPS_API_KEY'
    });
  }

  if (!origins || !destinations) {
    return res.status(400).json({
      error: '參數錯誤',
      message: '需要 origins 和 destinations 參數'
    });
  }

  try {
    // 構建 Google API URL
    const params = new URLSearchParams({
      origins: origins,
      destinations: destinations,
      key: GOOGLE_API_KEY,
      units: 'metric',
      language: 'zh-TW'
    });

    const googleApiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    
    console.log('🌐 呼叫 Google API:', { origins, destinations });
    console.log('🔗 API URL:', googleApiUrl);

    // 呼叫 Google API
    const response = await fetch(googleApiUrl);
    const data = await response.json();

    console.log('✅ Google API 回應:', data.status);

    if (data.status !== 'OK') {
      return res.status(400).json({
        error: 'Google API 錯誤',
        status: data.status,
        message: data.error_message || '未知錯誤',
        details: data
      });
    }

    // 返回處理過的結果
    const element = data.rows[0]?.elements[0];
    
    if (!element || element.status !== 'OK') {
      return res.status(400).json({
        error: '路線計算失敗',
        status: element?.status || '未知錯誤',
        details: data
      });
    }

    const result = {
      distance: Math.round(element.distance.value / 1000), // 轉換為公里
      duration: Math.round(element.duration.value / 60), // 轉換為分鐘
      status: 'OK',
      origin: origins,
      destination: destinations,
      source: 'google-api',
      raw: element
    };

    console.log('📊 回傳結果:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ API 呼叫失敗:', error);
    res.status(500).json({
      error: '伺服器錯誤',
      message: error.message,
      type: 'network_error'
    });
  }
});

// Maiagent OCR API 代理端點
app.post('/api/ocr', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'chatbotId', maxCount: 1 }]), async (req, res) => {
  // 建立本次請求的日誌記錄器
  const logger = new DetailedLogger(`ocr-${new Date().toISOString().split('T')[0]}.log`);
  
  const step0 = logger.startStep('檢查 API 配置');
  if (!MAIAGENT_API_KEY) {
    logger.endStep(step0, false, { error: 'Maiagent 配置未完成' });
    return res.status(500).json({
      error: 'Maiagent 配置未完成',
      message: '請檢查 .env 檔案中的 MAIAGENT_API_KEY'
    });
  }
  logger.endStep(step0, true);

  const step1 = logger.startStep('檢查上傳檔案');
  if (!req.files || !req.files.file || !req.files.file[0]) {
    logger.endStep(step1, false, { error: '沒有上傳檔案' });
    return res.status(400).json({
      error: '沒有上傳檔案',
      message: '請上傳圖片或 PDF 檔案'
    });
  }
  
  // 取得上傳的檔案
  const uploadedFile = req.files.file[0];
  
  logger.writeLog('收到檔案', 'INFO', {
    originalname: uploadedFile.originalname,
    mimetype: uploadedFile.mimetype,
    size: uploadedFile.size
  });
  logger.endStep(step1, true);

  // 從請求中獲取 chatbotId
  const step2 = logger.startStep('檢查 Chatbot ID');
  const chatbotId = req.body.chatbotId;
  if (!chatbotId) {
    logger.endStep(step2, false, { error: '缺少 chatbot ID' });
    return res.status(400).json({
      error: '缺少 chatbot ID',
      message: '請選擇一個 OCR Agent'
    });
  }
  logger.writeLog('使用指定的 chatbot ID', 'INFO', { chatbotId });
  logger.endStep(step2, true);

  try {
    let imageBuffer = uploadedFile.buffer;
    const fileName = uploadedFile.originalname;
    const fileType = uploadedFile.mimetype;
    
    const step3 = logger.startStep('檔案處理與轉換');
    logger.writeLog('開始處理檔案', 'INFO', {
      fileName,
      fileSize: uploadedFile.size,
      fileType
    });
    
    // 1. 檢查檔案類型並處理
    let finalBuffer;
    let fileExtension;
    let mimeType;
    
    if (fileType === 'application/pdf') {
      // PDF 檔案處理 - 直接上傳 PDF 給 MaiAgent，因為 MaiAgent 支援 PDF 格式
      console.log('📄 偵測到 PDF 檔案，直接上傳原始 PDF');
      
      // 檢查檔案大小限制
      if (uploadedFile.size > 10 * 1024 * 1024) {
        return res.status(400).json({
          error: 'PDF 檔案過大',
          message: '檔案大小超過 10MB 限制，請使用較小的 PDF'
        });
      }
      
      // 直接使用原始 PDF
      finalBuffer = uploadedFile.buffer;
      
      // 從原始檔名取得正確的副檔名
      const originalExtension = fileName.toLowerCase().split('.').pop();
      fileExtension = originalExtension;
      mimeType = fileType; // 使用原始 MIME 類型
      
      logger.writeLog('使用原始 PDF 檔案', 'SUCCESS', {
        originalSize: uploadedFile.size,
        fileExtension: fileExtension,
        mimeType: mimeType
      });
    } else if (fileType.startsWith('image/')) {
      // 圖片檔案處理 - 直接上傳原始檔案給 MaiAgent 處理
      console.log('🖼️ 跳過圖片預處理，直接上傳原始檔案');
      
      // 檢查檔案大小限制
      if (uploadedFile.size > 10 * 1024 * 1024) {
        return res.status(400).json({
          error: '圖片檔案過大',
          message: '檔案大小超過 10MB 限制，請使用較小的圖片'
        });
      }

      // 直接使用原始檔案
      finalBuffer = uploadedFile.buffer;
      
      // 從原始檔名取得正確的副檔名
      const originalExtension = fileName.toLowerCase().split('.').pop();
      fileExtension = originalExtension;
      mimeType = fileType; // 使用原始 MIME 類型
      
      logger.writeLog('使用原始圖片檔案', 'SUCCESS', {
        originalSize: uploadedFile.size,
        fileExtension: fileExtension,
        mimeType: mimeType
      });
    } else {
      return res.status(400).json({
        error: '不支援的檔案格式',
        message: '請上傳圖片檔案（JPG、PNG、GIF、WebP）或 PDF 檔案'
      });
    }

    logger.endStep(step3, true, {
      fileExtension,
      mimeType,
      finalSize: finalBuffer.length
    });

    // 2. 跳過 Conversation 查詢，讓 API 自動創建新對話
    const step4 = logger.startStep('準備新對話');
    
    // 不使用預設的 conversation ID，讓每次 OCR 都創建新對話
    const conversationId = null;
    
    logger.writeLog('將創建新對話', 'INFO', {
      note: '每次 OCR 請求都會創建獨立的新對話，避免插入到其他人的對話中'
    });
    logger.endStep(step4, true);
    
    // 3. 步驟一：上傳附件到 Maiagent
    const step5 = logger.startStep('三步驟流程 - 步驟一：上傳檔案');
    
    // 建立統一的檔案名稱，確保使用 ASCII 檔名避免編碼問題
    const timestamp = Date.now();
    const standardFilename = `ocr-${timestamp}.${fileExtension}`;
    logger.writeLog('使用標準化檔名', 'INFO', { 
      originalName: fileName,
      standardName: standardFilename 
    });
    
    let fileUrl = null;
    let attachmentId = null;
    
    // 使用正確的 multipart/form-data 上傳
    const formData = new FormData();
    
    // 再次嘗試使用 Stream
    const fileStream = Readable.from(finalBuffer);
    
    // 使用 Stream 附加檔案
    formData.append('file', fileStream, {
      filename: standardFilename,
      contentType: mimeType,
      knownLength: finalBuffer.length
    });
    
    // 顯示 FormData 資訊用於調試
    logger.writeLog('FormData 準備', 'DEBUG', {
      filename: standardFilename,
      contentType: mimeType,
      bufferSize: finalBuffer.length,
      headers: formData.getHeaders(),
      boundary: formData.getBoundary()
    });
    
    // 步驟 1: 上傳檔案到 attachments-upload 端點
    let uploadResponse;
    try {
      const axiosResponse = await axios.post('https://api.maiagent.ai/api/attachments-upload/', formData, {
        headers: {
          'Authorization': `Api-Key ${MAIAGENT_API_KEY}`,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      // 轉換成功的 axios 回應為類似 fetch 的格式
      uploadResponse = {
        ok: true,
        status: axiosResponse.status,
        statusText: axiosResponse.statusText,
        text: async () => JSON.stringify(axiosResponse.data),
        json: async () => axiosResponse.data,
        headers: {
          get: (name) => axiosResponse.headers[name.toLowerCase()],
          entries: () => Object.entries(axiosResponse.headers).map(([k, v]) => [k, v])
        }
      };
    } catch (axiosError) {
      if (axiosError.response) {
        // 轉換錯誤的 axios 回應
        uploadResponse = {
          ok: false,
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          text: async () => JSON.stringify(axiosError.response.data),
          json: async () => axiosError.response.data,
          headers: {
            get: (name) => axiosError.response.headers[name.toLowerCase()],
            entries: () => Object.entries(axiosError.response.headers).map(([k, v]) => [k, v])
          }
        };
      } else {
        throw axiosError;
      }
    }
    
    if (uploadResponse.ok) {
      try {
        // 先取得回應文字
        const responseText = await uploadResponse.text();
        logger.writeLog('上傳回應內容', 'DEBUG', { responseText });
        
        // 嘗試解析為 JSON（即使文檔說沒有回應內容）
        if (responseText) {
          const uploadData = JSON.parse(responseText);
          fileUrl = uploadData.file_url || uploadData.url || uploadData.file || uploadData.uri;
          logger.writeLog('檔案上傳成功', 'SUCCESS', { fileUrl });
          
          // 如果沒有獲得 URL，可能需要從 headers 或其他地方取得
          if (!fileUrl) {
            const location = uploadResponse.headers.get('location');
            if (location) {
              fileUrl = location;
              console.log('📍 從 Location header 獲得 URI:', fileUrl);
            }
          }
        } else {
          // 如果沒有回應內容，檢查 headers
          const location = uploadResponse.headers.get('location');
          const resourceUrl = uploadResponse.headers.get('x-resource-url');
          fileUrl = location || resourceUrl;
          console.log('📍 從 headers 獲得 URI:', fileUrl);
        }
        
        if (!fileUrl) {
          throw new Error('上傳成功但無法獲取檔案 URI');
        }
      } catch (parseError) {
        logger.writeLog('解析上傳回應時發生錯誤', 'ERROR', {
          error: parseError.message
        });
        logger.endStep(step5, false);
        throw new Error('無法從上傳回應中獲取檔案 URI: ' + parseError.message);
      }
      
      logger.endStep(step5, true, { fileUrl });
      
      // 步驟 2: 註冊附件以獲取附件 ID
      const step6 = logger.startStep('三步驟流程 - 步驟二：註冊附件');
      
      const registerPayload = {
        filename: standardFilename,
        file: fileUrl
      };
      
      const registerResponse = await fetch('https://api.maiagent.ai/api/attachments/', {
        method: 'POST',
        headers: {
          'Authorization': `Api-Key ${MAIAGENT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerPayload)
      });
      
      if (registerResponse.ok) {
        const registerData = await registerResponse.json();
        attachmentId = registerData.id;
        fileUrl = registerData.file; // 更新為註冊後的正式 URI
        logger.writeLog('附件註冊成功', 'SUCCESS', {
          id: attachmentId,
          filename: standardFilename,
          fileUrl: fileUrl
        });
        logger.endStep(step6, true);
      } else {
        const regError = await registerResponse.text().catch(() => '無法讀取錯誤文字');
        logger.writeLog('附件註冊失敗', 'ERROR', {
          status: registerResponse.status,
          statusText: registerResponse.statusText,
          error: regError
        });
        logger.endStep(step6, false);
        throw new Error('附件註冊失敗');
      }
    } else {
      const errorText = await uploadResponse.text().catch(() => '無法讀取錯誤文字');
      console.error('❌ 檔案上傳失敗:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });
      
      // 檢查是否是認證問題
      if (uploadResponse.status === 401) {
        throw new Error('檔案上傳失敗：API Key 無效或未授權');
      }
      
      throw new Error(`檔案上傳失敗 (${uploadResponse.status}): ${errorText}`);
    }
    
    // 4. 步驟三：使用 chatbot completions API 發送含圖片的訊息
    const step7 = logger.startStep('替代方案 - 步驟一：建立對話附件');
    
    // 首先將附件加到對話中
    const conversationAttachmentData = {
      filename: standardFilename,
      file: fileUrl,
      type: 'image'
    };
    
    logger.writeLog('建立對話附件', 'INFO', {
      url: `https://api.maiagent.ai/api/conversations/${MAIAGENT_CONVERSATION_ID}/attachments/`,
      attachmentData: conversationAttachmentData
    });
    
    const conversationAttachmentResponse = await fetch(`https://api.maiagent.ai/api/conversations/${MAIAGENT_CONVERSATION_ID}/attachments/`, {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${MAIAGENT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(conversationAttachmentData)
    });
    
    if (!conversationAttachmentResponse.ok) {
      const errorText = await conversationAttachmentResponse.text();
      logger.writeLog('對話附件建立失敗', 'ERROR', {
        status: conversationAttachmentResponse.status,
        statusText: conversationAttachmentResponse.statusText,
        errorText: errorText
      });
      logger.endStep(step7, false);
      
      return res.status(502).json({
        error: '對話附件建立失敗',
        message: `無法建立對話附件: ${conversationAttachmentResponse.status}`,
        details: errorText,
        type: 'conversation_attachment_error'
      });
    }
    
    const conversationAttachmentResult = await conversationAttachmentResponse.json();
    logger.writeLog('對話附件建立成功', 'SUCCESS', conversationAttachmentResult);
    logger.endStep(step7, true);
    
    // STEP-8.5: 等待圖片預處理完成
    const stepPreprocess = logger.startStep('等待圖片預處理完成');
    logger.writeLog('圖片預處理延遲', 'INFO', {
      delaySeconds: 10,
      reason: '等待系統完成 OCR 預處理和圖片分析'
    });
    await new Promise(resolve => setTimeout(resolve, 10000)); // 等待 10 秒
    logger.endStep(stepPreprocess, true);
    
    // STEP-9: 使用 Chatbot Completions API 創建新對話並傳送附件
    const step8 = logger.startStep('Chatbot Completions API - 創建新對話並傳送附件');
    
    const ocrPrompt = "請幫我分析這張發票圖片的內容，提取其中的結構化資訊，包括發票號碼、日期、統一編號、品項詳細和總金額。";
    
    // 根據 MaiAgent API 文檔，在 message 中包含 attachments 參數
    const completionData = {
      message: {
        content: ocrPrompt,
        attachments: [
          {
            id: attachmentId,
            type: "image",
            filename: standardFilename,
            file: fileUrl
          }
        ]
      },
      isStreaming: false
    };
    
    logger.writeLog('發送 chatbot completion 請求（新對話含附件）', 'INFO', {
      url: `https://api.maiagent.ai/api/chatbots/${chatbotId}/completions/`,
      chatbotId: chatbotId,
      completionData: completionData,
      attachmentId: attachmentId,
      fileUrl: fileUrl,
      note: 'API 將自動創建新對話並處理圖片附件'
    });
    
    // 使用 Chatbot Completions API，包含 attachments 參數
    const messageResponse = await fetch(`https://api.maiagent.ai/api/chatbots/${chatbotId}/completions/`, {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${MAIAGENT_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'zh-TW',
        'Content-Language': 'zh-TW'
      },
      body: JSON.stringify(completionData)
    });

    if (messageResponse.ok) {
      // 成功發送訊息
      const messageResult = await messageResponse.json();
      
      // 從回應中獲取新創建的對話 ID
      const newConversationId = messageResult.conversationId;
      
      logger.writeLog('訊息發送成功', 'SUCCESS', {
        messageId: messageResult.id,
        conversationId: newConversationId
      });
      logger.endStep(step8, true);
      
      // 5. 等待 AI 回應並輪詢取得結果
      const step9 = logger.startStep('等待 AI 處理並輪詢結果');
      
      let aiResponse = null;
      let pollAttempts = 0;
      const maxPollAttempts = 18; // 最多輪詢 18 次 (約 90 秒)，給 AI 更多處理時間
      
      while (pollAttempts < maxPollAttempts && !aiResponse) {
        // 等待 5 秒後再次查詢
        await new Promise(resolve => setTimeout(resolve, 5000));
        pollAttempts++;
        
        logger.writeLog(`輪詢第 ${pollAttempts} 次`, 'INFO');
        
        try {
          // 查詢新創建對話中的最新訊息
          const messagesResponse = await fetch(`https://api.maiagent.ai/api/messages/?conversation=${newConversationId}&pageSize=10`, {
            method: 'GET',
            headers: {
              'Authorization': `Api-Key ${MAIAGENT_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!messagesResponse.ok) {
            console.error('❌ 查詢訊息失敗:', messagesResponse.status);
            continue;
          }
          
          const messagesData = await messagesResponse.json();
          const messages = messagesData.results || [];
          
          logger.writeLog(`取得 ${messages.length} 個訊息`, 'INFO', {
            conversationId: newConversationId,
            totalMessages: messages.length
          });
          
          // 尋找最新的 AI 回應訊息 (type: 'outgoing')
          for (const message of messages) {
            logger.writeLog(`檢查訊息 ${message.id}`, 'DEBUG', {
              type: message.type,
              createdAt: message.createdAt,
              hasContent: !!message.content
            });
            
            // 檢查是否是 AI 的回應訊息（type: 'outgoing'）
            if (message.type === 'outgoing' && message.content && message.content.trim().length > 0) {
              logger.writeLog('找到 AI 回應', 'SUCCESS', {
                messageId: message.id,
                contentLength: message.content.length,
                createdAt: message.createdAt
              });
              aiResponse = message;
              break;
            }
          }
          
        } catch (error) {
          console.error('❌ 輪詢訊息時發生錯誤:', error);
        }
      }
      
      if (!aiResponse) {
        console.error('❌ 超時：無法取得 AI 回應');
        return res.status(408).json({
          error: 'AI 處理超時',
          message: '等待 AI 回應超時，請稍後再試',
          type: 'timeout_error'
        });
      }
      
      logger.endStep(step9, true, { aiResponseId: aiResponse.id });
      
      // 6. 解析 AI 回應並提取結構化資料
      const step10 = logger.startStep('解析 AI 回應並提取結構化資料');
      let extractedData = null;
      
      try {
        // 從 AI 回應中解析 JSON
        const content = aiResponse.content || aiResponse.message || '';
        console.log('📝 AI 回應內容:', content);
        
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[1]);
          // 確保是陣列格式
          const invoiceData = Array.isArray(jsonData) ? jsonData[0] : jsonData;
          
          if (invoiceData) {
            extractedData = {
              // 發票基本資訊
              invoiceNumber: invoiceData.invoice_number,
              date: invoiceData.date,
              
              // 統一編號
              sellerTaxId: invoiceData.unified_business_number?.seller,
              buyerTaxId: invoiceData.unified_business_number?.buyer,
              
              // 金額資訊
              totalAmount: invoiceData.total_amount,
              
              // 品項詳細
              items: invoiceData.items?.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                amount: item.amount
              })) || [],
              
              // 用於碳盤查的交通資訊（如果適用）
              transportInfo: extractTransportInfo(invoiceData.items || [])
            };
          }
        }
        
        logger.writeLog('解析的結構化資料', 'SUCCESS', extractedData);
        logger.endStep(step10, true);
      } catch (error) {
        console.error('⚠️ JSON 解析失敗:', error);
      }

      const ocrResult = {
        success: true,
        conversationId: MAIAGENT_CONVERSATION_ID,
        messageId: messageResult.id || 'completion-message',
        aiResponseId: aiResponse.id,
        rawResponse: aiResponse,
        extractedData: extractedData,
        processingTime: `${pollAttempts * 5} 秒`,
        method: 'messages_api',
        attachmentMethod: fileUrl ? 'direct_upload' : 'base64_data_url'
      };

      logger.writeLog('OCR 處理完成', 'SUCCESS', {
        processingTime: ocrResult.processingTime,
        method: ocrResult.method,
        hasExtractedData: !!ocrResult.extractedData
      });
      
      logger.writeLog('\n===== OCR 處理會話結束 =====', 'INFO');
      return res.json(ocrResult);
    } else {
      const errorText = await messageResponse.text();
      logger.writeLog('Messages API 錯誤', 'ERROR', {
        status: messageResponse.status,
        statusText: messageResponse.statusText,
        errorText: errorText,
        headers: Object.fromEntries(messageResponse.headers.entries())
      });
      logger.endStep(step8, false);
      
      // 直接返回錯誤
      return res.status(502).json({
        error: 'Messages API 錯誤',
        message: `無法發送訊息: ${messageResponse.status}`,
        details: errorText,
        type: 'api_error'
      });
    }

  } catch (error) {
    logger.writeLog('OCR 處理失敗', 'ERROR', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // 根據錯誤類型返回更具體的錯誤狀態碼
    let statusCode = 500;
    let errorType = 'ocr_error';
    
    if (error.message.includes('PDF 處理失敗')) {
      statusCode = 400;
      errorType = 'pdf_processing_error';
    } else if (error.message.includes('查詢 conversation 失敗')) {
      statusCode = 401;
      errorType = 'conversation_access_error';
    } else if (error.message.includes('檔案上傳失敗')) {
      statusCode = 502;
      errorType = 'file_upload_error';
    } else if (error.message.includes('附件註冊失敗')) {
      statusCode = 502;
      errorType = 'attachment_registration_error';
    } else if (error.message.includes('發送訊息失敗')) {
      statusCode = 502;
      errorType = 'api_communication_error';
    }
    
    res.status(statusCode).json({
      success: false,
      error: 'OCR 處理失敗',
      message: error.message,
      type: errorType,
      timestamp: new Date().toISOString()
    });
  }
});

// 獲取 chatbot 列表端點
app.get('/api/chatbots', async (req, res) => {
  console.log('🤖 獲取 chatbot 列表');
  
  if (!MAIAGENT_API_KEY) {
    return res.status(500).json({
      error: 'Maiagent 配置未完成',
      message: '請檢查 .env 檔案中的 MAIAGENT_API_KEY'
    });
  }

  try {
    // 初始化變數
    let allChatbots = [];
    let nextUrl = 'https://api.maiagent.ai/api/chatbots/?pageSize=100'; // 增加每頁大小
    
    // 循環獲取所有頁面的資料
    while (nextUrl) {
      console.log('📄 獲取頁面:', nextUrl);
      
      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Api-Key ${MAIAGENT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 無法獲取 chatbot 列表:', response.status, errorText);
        throw new Error(`獲取 chatbot 列表失敗: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 本頁獲取 ${data.results?.length || 0} 個 chatbots`);
      
      // 將本頁結果加入總列表
      if (data.results && data.results.length > 0) {
        allChatbots = allChatbots.concat(data.results);
      }
      
      // 檢查是否有下一頁
      nextUrl = data.next;
    }
    
    console.log(`✅ 總共獲取到 ${allChatbots.length} 個 chatbots`);
    
    // 只過濾包含 "OCR" 或 "掃描" 的 chatbot
    const ocrChatbots = allChatbots.filter(bot => {
      const name = bot.name || '';
      const description = bot.description || '';
      const searchText = (name + ' ' + description).toLowerCase();
      return searchText.includes('ocr') || searchText.includes('掃描');
    });
    
    console.log(`🔍 過濾後有 ${ocrChatbots.length} 個 OCR 相關的 chatbots`);
    
    // 格式化 chatbot 列表
    const formattedChatbots = ocrChatbots.map(bot => ({
      id: bot.id,
      name: bot.name,
      description: bot.description || '',
      agentMode: bot.agentMode,
      replyMode: bot.replyMode,
      updatedAt: bot.updatedAt
    }));
    
    // 排序：名稱包含 OCR 的優先
    const sortedChatbots = formattedChatbots.sort((a, b) => {
      const aHasOCR = a.name.toLowerCase().includes('ocr');
      const bHasOCR = b.name.toLowerCase().includes('ocr');
      
      if (aHasOCR && !bHasOCR) return -1;
      if (!aHasOCR && bHasOCR) return 1;
      
      // 如果都有或都沒有 OCR，按名稱排序
      return a.name.localeCompare(b.name);
    });

    res.json({
      totalCount: allChatbots.length,
      filteredCount: sortedChatbots.length,
      chatbots: sortedChatbots
    });

  } catch (error) {
    console.error('❌ 獲取 chatbot 列表失敗:', error);
    res.status(500).json({
      error: '伺服器錯誤',
      message: error.message
    });
  }
});

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Google Maps 代理伺服器運行中',
    timestamp: new Date().toISOString(),
    googleApiConfigured: !!GOOGLE_API_KEY,
    maiagentApiConfigured: !!MAIAGENT_API_KEY,
    maiagentConversationConfigured: !!MAIAGENT_CONVERSATION_ID
  });
});

// 查詢 MaiAgent 支援的檔案類型
app.get('/api/maiagent/supported-file-types', async (req, res) => {
  try {
    const response = await fetch('https://api.maiagent.ai/api/parsers/supported-file-types', {
      method: 'GET',
      headers: {
        'Authorization': `Api-Key ${MAIAGENT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      const errorText = await response.text();
      res.status(response.status).json({
        error: 'MaiAgent API 錯誤',
        status: response.status,
        details: errorText
      });
    }
  } catch (error) {
    res.status(500).json({
      error: '伺服器錯誤',
      message: error.message
    });
  }
});

// 查看 OCR 日誌端點
app.get('/api/logs/ocr', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logFile = join(logsDir, `ocr-${today}.log`);
    
    if (!existsSync(logFile)) {
      return res.json({
        message: '今天還沒有 OCR 處理日誌',
        logFile,
        logs: []
      });
    }
    
    const logContent = readFileSync(logFile, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim());
    
    // 解析日誌並分組
    const sessions = {};
    let currentSession = null;
    
    lines.forEach(line => {
      const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)/);
      if (match) {
        const [, timestamp, sessionId, level, message] = match;
        
        if (!sessions[sessionId]) {
          sessions[sessionId] = {
            sessionId,
            startTime: timestamp,
            logs: []
          };
        }
        
        sessions[sessionId].logs.push({
          timestamp,
          level,
          message: message.trim()
        });
        
        sessions[sessionId].endTime = timestamp;
      }
    });
    
    res.json({
      logFile,
      sessionCount: Object.keys(sessions).length,
      sessions: Object.values(sessions).reverse() // 最新的在前
    });
    
  } catch (error) {
    res.status(500).json({
      error: '讀取日誌失敗',
      message: error.message
    });
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Google Maps 代理伺服器啟動於 http://localhost:${PORT}`);
  console.log(`📍 API 端點: http://localhost:${PORT}/api/distance`);
  console.log(`🔍 OCR 端點: http://localhost:${PORT}/api/ocr`);
  console.log(`🤖 Chatbot 列表: http://localhost:${PORT}/api/chatbots`);
  console.log(`💚 健康檢查: http://localhost:${PORT}/api/health`);
  console.log(`📋 OCR 日誌: http://localhost:${PORT}/api/logs/ocr`);
  console.log(`🔑 Google API Key: ${GOOGLE_API_KEY ? '已配置' : '未配置'}`);
  console.log(`🤖 Maiagent API Key: ${MAIAGENT_API_KEY ? '已配置' : '未配置'}`);
  console.log(`💬 Maiagent Conversation ID: ${MAIAGENT_CONVERSATION_ID ? '已配置' : '未配置'}`);
});