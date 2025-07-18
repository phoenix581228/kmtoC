import { jsPDF } from 'jspdf';

/**
 * 將圖檔轉換為PDF格式
 * @param {File} imageFile - 要轉換的圖檔
 * @param {Object} options - 轉換選項
 * @returns {Promise<Blob>} - 轉換後的PDF Blob
 */
export async function convertImageToPdf(imageFile, options = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const img = new Image();
        
        img.onload = function() {
          try {
            // 預設選項
            const defaultOptions = {
              format: 'a4',
              orientation: 'portrait',
              quality: 0.8,
              margin: 10, // mm
              maxWidth: 190, // A4 寬度 - 邊距
              maxHeight: 277 // A4 高度 - 邊距
            };
            
            const opts = { ...defaultOptions, ...options };
            
            // 建立PDF文檔
            const pdf = new jsPDF({
              orientation: opts.orientation,
              unit: 'mm',
              format: opts.format
            });
            
            // 計算圖片尺寸以適應頁面
            const imgWidth = img.width;
            const imgHeight = img.height;
            const aspectRatio = imgWidth / imgHeight;
            
            let pdfWidth, pdfHeight;
            
            // 根據長寬比調整尺寸
            if (aspectRatio > opts.maxWidth / opts.maxHeight) {
              // 寬圖片 - 以寬度為基準
              pdfWidth = opts.maxWidth;
              pdfHeight = opts.maxWidth / aspectRatio;
            } else {
              // 高圖片 - 以高度為基準
              pdfHeight = opts.maxHeight;
              pdfWidth = opts.maxHeight * aspectRatio;
            }
            
            // 計算置中位置
            const xPos = (pdf.internal.pageSize.getWidth() - pdfWidth) / 2;
            const yPos = opts.margin;
            
            // 將圖片加入PDF
            pdf.addImage(
              e.target.result, // base64 圖片資料
              'JPEG', // 格式 (jsPDF會自動處理不同格式)
              xPos,
              yPos,
              pdfWidth,
              pdfHeight,
              undefined, // alias
              'MEDIUM' // compression
            );
            
            // 轉換為Blob
            const pdfBlob = pdf.output('blob');
            
            console.log('✅ 圖檔轉PDF成功:', {
              originalSize: `${imgWidth}x${imgHeight}`,
              pdfSize: `${Math.round(pdfWidth)}x${Math.round(pdfHeight)}mm`,
              fileSize: `${(pdfBlob.size / 1024).toFixed(1)}KB`
            });
            
            resolve(pdfBlob);
          } catch (pdfError) {
            console.error('❌ PDF生成失敗:', pdfError);
            reject(new Error('PDF生成失敗: ' + pdfError.message));
          }
        };
        
        img.onerror = function() {
          reject(new Error('圖片載入失敗，請確認圖片檔案格式正確'));
        };
        
        // 載入圖片
        img.src = e.target.result;
        
      } catch (error) {
        console.error('❌ 圖片處理失敗:', error);
        reject(new Error('圖片處理失敗: ' + error.message));
      }
    };
    
    reader.onerror = function() {
      reject(new Error('檔案讀取失敗'));
    };
    
    // 讀取圖檔為base64
    reader.readAsDataURL(imageFile);
  });
}

/**
 * 檢查檔案是否為支援的圖檔格式
 * @param {File} file - 要檢查的檔案
 * @returns {boolean} - 是否為支援的圖檔格式
 */
export function isImageFile(file) {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff'
  ];
  
  return supportedTypes.includes(file.type.toLowerCase());
}

/**
 * 檢查檔案是否為PDF
 * @param {File} file - 要檢查的檔案
 * @returns {boolean} - 是否為PDF檔案
 */
export function isPdfFile(file) {
  return file.type === 'application/pdf';
}

/**
 * 根據MaiAgent需求處理檔案
 * 如果是圖檔則轉為PDF，如果已經是PDF則直接返回
 * @param {File} file - 要處理的檔案
 * @param {Object} options - 轉換選項
 * @returns {Promise<{file: File, wasConverted: boolean, originalType: string}>}
 */
export async function prepareFileForMaiAgent(file, options = {}) {
  console.log('🔄 準備檔案給MaiAgent:', {
    name: file.name,
    type: file.type,
    size: `${(file.size / 1024).toFixed(1)}KB`
  });
  
  // 如果已經是PDF，直接返回
  if (isPdfFile(file)) {
    console.log('✅ 檔案已是PDF格式，無需轉換');
    return {
      file: file,
      wasConverted: false,
      originalType: 'pdf'
    };
  }
  
  // 如果是圖檔，轉換為PDF
  if (isImageFile(file)) {
    console.log('🖼️ 偵測到圖檔，開始轉換為PDF...');
    
    try {
      const pdfBlob = await convertImageToPdf(file, options);
      
      // 建立新的File物件
      const originalName = file.name.replace(/\.[^/.]+$/, ''); // 移除副檔名
      const pdfFile = new File(
        [pdfBlob], 
        `${originalName}_converted.pdf`, 
        { type: 'application/pdf' }
      );
      
      console.log('✅ 圖檔轉PDF完成:', {
        originalSize: `${(file.size / 1024).toFixed(1)}KB`,
        pdfSize: `${(pdfFile.size / 1024).toFixed(1)}KB`,
        compression: `${((1 - pdfFile.size / file.size) * 100).toFixed(1)}%`
      });
      
      return {
        file: pdfFile,
        wasConverted: true,
        originalType: 'image'
      };
    } catch (error) {
      console.error('❌ 圖檔轉PDF失敗:', error);
      throw new Error('圖檔轉PDF失敗: ' + error.message);
    }
  }
  
  // 不支援的檔案格式
  throw new Error(`不支援的檔案格式: ${file.type}. 請上傳圖片檔案（JPG、PNG、GIF、WebP）或PDF檔案`);
}