
import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, MapPin, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateCarbonEmission, formatCarbonEmission, getTransportLabel } from '@/utils/carbonCalculator';

export function CarbonResults({ calculation }) {
  if (!calculation) return null;

  const carbonEmission = calculateCarbonEmission(calculation.distance, calculation.transportType);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card className="carbon-card border-green-400/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 gradient-text">
            <Leaf className="w-6 h-6" />
            碳排放計算結果
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white/90">
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="text-sm">起點：{calculation.origin}</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">終點：{calculation.destination}</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-sm">交通工具：{getTransportLabel(calculation.transportType)}</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-sm">預估時間：{calculation.duration} 分鐘</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-400/30">
              <div className="text-center">
                <p className="text-sm text-white/70 mb-2">總距離</p>
                <p className="text-3xl font-bold text-white mb-4">{calculation.distance} km</p>
                
                <p className="text-sm text-white/70 mb-2">碳排放量</p>
                <p className="text-2xl font-bold gradient-text">
                  {formatCarbonEmission(carbonEmission)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-white/5 rounded-lg">
            <p className="text-xs text-white/70 text-center">
              💡 小提示：選擇大眾運輸工具或綠色交通方式可以大幅減少碳排放量！
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
