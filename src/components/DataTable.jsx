
import React from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { calculateCarbonEmission, formatCarbonEmission, getTransportLabel } from '@/utils/carbonCalculator';
import { exportToCSV } from '@/utils/csvProcessor';

export function DataTable({ calculations, onClearData }) {
  const { toast } = useToast();

  const handleExport = () => {
    if (!calculations || calculations.length === 0) {
      toast({
        title: '無數據可匯出',
        description: '請先進行碳排放計算',
        variant: 'destructive'
      });
      return;
    }

    const exportData = calculations.map((calc, index) => ({
      '序號': index + 1,
      '起點': calc.origin,
      '終點': calc.destination,
      '交通工具': getTransportLabel(calc.transportType),
      '距離(公里)': calc.distance,
      '碳排放量(kg CO₂)': calculateCarbonEmission(calc.distance, calc.transportType).toFixed(3),
      '計算時間': new Date(calc.timestamp).toLocaleString('zh-TW')
    }));

    exportToCSV(exportData, `碳排放報告_${new Date().toLocaleDateString('zh-TW')}.csv`);
    
    toast({
      title: '匯出成功！',
      description: '碳排放報告已下載到您的電腦'
    });
  };

  const handleClearData = () => {
    onClearData();
    toast({
      title: '數據已清除',
      description: '所有計算記錄已被清除'
    });
  };

  if (!calculations || calculations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <p className="text-white/70">暫無計算記錄</p>
      </motion.div>
    );
  }

  const totalEmission = calculations.reduce((sum, calc) => 
    sum + calculateCarbonEmission(calc.distance, calc.transportType), 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="glass-effect border-orange-400/30">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="gradient-text">計算記錄</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="border-green-400 text-green-400 hover:bg-green-400 hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                匯出 CSV
              </Button>
              <Button
                onClick={handleClearData}
                variant="outline"
                size="sm"
                className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清除數據
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-400/30">
            <div className="flex justify-between items-center">
              <span className="text-white/90">總計算次數：{calculations.length} 次</span>
              <span className="text-lg font-bold gradient-text">
                總碳排放量：{formatCarbonEmission(totalEmission)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left p-3 text-white/90 font-semibold">起點</th>
                  <th className="text-left p-3 text-white/90 font-semibold">終點</th>
                  <th className="text-left p-3 text-white/90 font-semibold">交通工具</th>
                  <th className="text-right p-3 text-white/90 font-semibold">距離</th>
                  <th className="text-right p-3 text-white/90 font-semibold">碳排放量</th>
                  <th className="text-left p-3 text-white/90 font-semibold">時間</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((calc, index) => {
                  const emission = calculateCarbonEmission(calc.distance, calc.transportType);
                  return (
                    <motion.tr
                      key={calc.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-3 text-white/80">{calc.origin}</td>
                      <td className="p-3 text-white/80">{calc.destination}</td>
                      <td className="p-3 text-white/80">{getTransportLabel(calc.transportType)}</td>
                      <td className="p-3 text-right text-white/80">{calc.distance} km</td>
                      <td className="p-3 text-right font-semibold text-green-400">
                        {formatCarbonEmission(emission)}
                      </td>
                      <td className="p-3 text-white/80">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(calc.timestamp).toLocaleString('zh-TW', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
