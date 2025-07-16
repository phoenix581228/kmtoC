# 程式碼風格與慣例

## 命名慣例
- **檔案名稱**: PascalCase (組件) / camelCase (工具)
- **函數**: camelCase (`calculateDistance`, `handleCalculate`)
- **常數**: SCREAMING_SNAKE_CASE (`EMISSION_FACTORS`, `TRANSPORT_TYPES`)
- **組件**: PascalCase (`AddressInput`, `CarbonResults`)

## 組件結構模式
```jsx
// Hook 聲明
const [state, setState] = useState(initialValue);
const { toast } = useToast();

// 事件處理函數
const handleFunction = async () => {
  // 邏輯實作
};

// 渲染返回
return (
  <motion.div>
    {/* JSX 內容 */}
  </motion.div>
);
```

## 樣式規範
- 使用 TailwindCSS 進行樣式設計
- 玻璃態效果: `glass-effect` 類別
- 漸層文字: `gradient-text` 類別
- 動畫效果: Framer Motion `motion` 組件

## 專案架構模式
- 組件位於 `/src/components/`
- 工具函數位於 `/src/utils/`
- UI 組件位於 `/src/components/ui/`
- 自定義 Hook 位於 `/src/hooks/`