
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Route, Calculator, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { TRANSPORT_TYPES } from '@/utils/carbonCalculator';
import { calculateDistance } from '@/utils/googleMaps';
import { searchTzuChiLocations, isTzuChiLocationName } from '@/data/tzuChiLocations';

export function AddressInput({ onCalculationComplete }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [transportType, setTransportType] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const { toast } = useToast();

  // 處理起點輸入變化
  const handleOriginChange = (value) => {
    setOrigin(value);
    if (value.length >= 2) {
      const suggestions = searchTzuChiLocations(value);
      setOriginSuggestions(suggestions.slice(0, 5)); // 最多顯示5個建議
      setShowOriginSuggestions(suggestions.length > 0);
    } else {
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
    }
  };

  // 處理終點輸入變化
  const handleDestinationChange = (value) => {
    setDestination(value);
    if (value.length >= 2) {
      const suggestions = searchTzuChiLocations(value);
      setDestinationSuggestions(suggestions.slice(0, 5)); // 最多顯示5個建議
      setShowDestinationSuggestions(suggestions.length > 0);
    } else {
      setDestinationSuggestions([]);
      setShowDestinationSuggestions(false);
    }
  };

  // 選擇建議項目
  const selectOriginSuggestion = (suggestion) => {
    setOrigin(suggestion.name);
    setShowOriginSuggestions(false);
  };

  const selectDestinationSuggestion = (suggestion) => {
    setDestination(suggestion.name);
    setShowDestinationSuggestions(false);
  };

  const handleCalculate = async () => {
    if (!origin.trim() || !destination.trim() || !transportType) {
      toast({
        title: '請填寫完整資訊',
        description: '請輸入起點、終點和選擇交通工具',
        variant: 'destructive'
      });
      return;
    }

    setIsCalculating(true);
    
    try {
      const result = await calculateDistance(origin, destination);
      
      if (result.status === 'OK') {
        onCalculationComplete({
          origin,
          destination,
          transportType,
          distance: result.distance,
          duration: result.duration,
          timestamp: new Date().toISOString()
        });
        
        // 顯示計算結果和資料來源
        const dataSource = result.mock ? '模擬資料' : 'Google Maps API';
        toast({
          title: '計算完成！',
          description: `路線距離：${result.distance} 公里 (${dataSource})`
        });
        
        // 在開發模式下顯示更多資訊
        if (import.meta.env.DEV) {
          console.log('Distance calculation result:', result);
        }
      } else {
        throw new Error('無法計算路線距離');
      }
    } catch (error) {
      toast({
        title: '計算失敗',
        description: '無法取得路線資訊，請檢查地址是否正確',
        variant: 'destructive'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-effect border-green-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 gradient-text">
            <Route className="w-6 h-6" />
            路線碳排放計算
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="origin" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" />
                起點地址
                {isTzuChiLocationName(origin) && (
                  <Building2 className="w-4 h-4 text-blue-400" title="慈濟據點" />
                )}
              </Label>
              <Input
                id="origin"
                placeholder="請輸入起點地址或慈濟據點名稱"
                value={origin}
                onChange={(e) => handleOriginChange(e.target.value)}
                onFocus={() => origin.length >= 2 && setShowOriginSuggestions(originSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              />
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800/95 backdrop-blur-sm border border-white/20 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {originSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 cursor-pointer hover:bg-white/10 text-white text-sm border-b border-white/10 last:border-b-0"
                      onClick={() => selectOriginSuggestion(suggestion)}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{suggestion.name}</div>
                          <div className="text-xs text-white/60">{suggestion.address}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-2 relative">
              <Label htmlFor="destination" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                終點地址
                {isTzuChiLocationName(destination) && (
                  <Building2 className="w-4 h-4 text-blue-400" title="慈濟據點" />
                )}
              </Label>
              <Input
                id="destination"
                placeholder="請輸入終點地址或慈濟據點名稱"
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                onFocus={() => destination.length >= 2 && setShowDestinationSuggestions(destinationSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              />
              {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800/95 backdrop-blur-sm border border-white/20 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {destinationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 cursor-pointer hover:bg-white/10 text-white text-sm border-b border-white/10 last:border-b-0"
                      onClick={() => selectDestinationSuggestion(suggestion)}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{suggestion.name}</div>
                          <div className="text-xs text-white/60">{suggestion.address}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-400" />
              交通工具
            </Label>
            <Select value={transportType} onValueChange={setTransportType}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="選擇交通工具" />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORT_TYPES.map((transport) => (
                  <SelectItem key={transport.value} value={transport.value}>
                    <span className="flex items-center gap-2">
                      <span>{transport.icon}</span>
                      <span>{transport.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            {isCalculating ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              '計算碳排放量'
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
