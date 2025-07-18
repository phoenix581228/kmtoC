import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, Bot, RefreshCw } from 'lucide-react';

const ChatbotSelector = ({ onSelect, defaultChatbotId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 從 localStorage 讀取已保存的 chatbot，優先使用正確的財務發票掃描小助手
  useEffect(() => {
    // 優先使用財務發票掃描小助手的正確 ID
    const correctChatbotId = 'a43bdcbf-a953-42c7-872f-9a5f4bb4d3aa';
    const correctChatbotName = '財務發票掃描小助手';
    
    // 清除舊的錯誤 ID 並設置正確的
    localStorage.setItem('ocr_default_chatbot_id', correctChatbotId);
    localStorage.setItem('ocr_default_chatbot_name', correctChatbotName);
    
    const defaultChatbot = {
      id: correctChatbotId,
      name: correctChatbotName
    };
    
    setSelectedChatbot(defaultChatbot);
    
    // 立即通知父組件
    if (onSelect) {
      onSelect(defaultChatbot);
    }
  }, []); // 移除 onSelect 依賴，只在組件掛載時執行一次

  // 獲取 chatbot 列表
  const fetchChatbots = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/chatbots');
      
      if (!response.ok) {
        throw new Error(`獲取 chatbot 列表失敗: ${response.status}`);
      }
      
      const data = await response.json();
      setChatbots(data.chatbots || []);
      
      // 顯示過濾資訊
      if (data.totalCount && data.filteredCount) {
        console.log(`📊 從 ${data.totalCount} 個助理中過濾出 ${data.filteredCount} 個 OCR 相關助理`);
      }
      
      // 如果有預設的 chatbot ID，找到並設置
      if (defaultChatbotId && data.chatbots) {
        const defaultBot = data.chatbots.find(bot => bot.id === defaultChatbotId);
        if (defaultBot) {
          setSelectedChatbot(defaultBot);
        }
      }
    } catch (err) {
      console.error('獲取 chatbot 列表錯誤:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 組件掛載時獲取列表
  useEffect(() => {
    fetchChatbots();
  }, []);

  // 選擇 chatbot
  const handleSelect = (chatbot) => {
    setSelectedChatbot(chatbot);
    setIsOpen(false);
    
    // 保存到 localStorage
    localStorage.setItem('ocr_default_chatbot_id', chatbot.id);
    localStorage.setItem('ocr_default_chatbot_name', chatbot.name);
    
    // 通知父組件
    if (onSelect) {
      onSelect(chatbot);
    }
  };

  // 過濾 chatbots
  const filteredChatbots = chatbots.filter(bot => 
    bot.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      {/* 選擇器按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-gray-600" />
          <span className="text-gray-900">
            {selectedChatbot ? selectedChatbot.name : '選擇 OCR Agent'}
          </span>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 下拉選單 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          >
            {/* 搜尋欄 */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <label htmlFor="chatbot-search" className="sr-only">搜尋 chatbot</label>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="chatbot-search"
                  name="chatbot-search"
                  type="text"
                  placeholder="搜尋 chatbot..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 重新載入按鈕 */}
            <div className="px-3 py-2 border-b border-gray-100">
              <button
                onClick={fetchChatbots}
                disabled={loading}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                重新載入列表
              </button>
            </div>

            {/* Chatbot 列表 */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  載入中...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500">
                  {error}
                </div>
              ) : filteredChatbots.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  沒有找到符合的 chatbot
                </div>
              ) : (
                filteredChatbots.map((chatbot) => (
                  <button
                    key={chatbot.id}
                    onClick={() => handleSelect(chatbot)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {chatbot.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {chatbot.id}
                      </div>
                      {chatbot.description && (
                        <div className="text-sm text-gray-400 mt-1">
                          {chatbot.description}
                        </div>
                      )}
                    </div>
                    {selectedChatbot?.id === chatbot.id && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* 提示訊息 */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-600">
                選擇的 Agent 將被記住並用於下次 OCR 處理
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatbotSelector;