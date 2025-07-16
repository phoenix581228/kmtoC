# 開發命令參考

## 常用開發命令
```bash
# 開發伺服器 (Port 5173)
npm run dev

# 建置生產版本
npm run build

# 預覽建置結果
npm run preview

# 安裝依賴套件
npm install
```

## 專案特定工具
```bash
# 生成 LLMs 文件 (建置前自動執行)
node tools/generate-llms.js
```

## 系統命令 (macOS Darwin)
```bash
# 檔案操作
ls -la          # 列出檔案詳細資訊
find . -name    # 搜尋檔案
grep -r         # 搜尋內容

# 進程管理  
lsof -i :5173   # 檢查開發伺服器端口
kill -9 <PID>   # 結束進程

# Git 操作
git status      # 檢查狀態
git add .       # 添加變更
git commit -m   # 提交變更
```

## 編輯器整合
- 專案配置 Visual Editor 插件
- 支援即時編輯模式