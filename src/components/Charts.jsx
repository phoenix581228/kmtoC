
import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { calculateCarbonEmission, formatCarbonEmission, getTransportLabel } from '@/utils/carbonCalculator';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

export function Charts({ calculations }) {
  if (!calculations || calculations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <p className="text-white/70">暫無數據可顯示圖表</p>
      </motion.div>
    );
  }

  // 準備圖表數據
  const prepareBarChartData = () => {
    const transportData = {};
    calculations.forEach(calc => {
      const emission = calculateCarbonEmission(calc.distance, calc.transportType);
      if (!transportData[calc.transportType]) {
        transportData[calc.transportType] = {
          transport: getTransportLabel(calc.transportType),
          totalEmission: 0,
          count: 0
        };
      }
      transportData[calc.transportType].totalEmission += emission;
      transportData[calc.transportType].count += 1;
    });

    return Object.values(transportData).map(data => ({
      ...data,
      avgEmission: data.totalEmission / data.count
    }));
  };

  const preparePieChartData = () => {
    const transportData = {};
    calculations.forEach(calc => {
      const emission = calculateCarbonEmission(calc.distance, calc.transportType);
      if (!transportData[calc.transportType]) {
        transportData[calc.transportType] = {
          name: getTransportLabel(calc.transportType),
          value: 0
        };
      }
      transportData[calc.transportType].value += emission;
    });

    return Object.values(transportData);
  };

  const prepareTrendData = () => {
    const dailyData = {};
    calculations.forEach(calc => {
      const date = new Date(calc.timestamp).toLocaleDateString('zh-TW');
      const emission = calculateCarbonEmission(calc.distance, calc.transportType);
      
      if (!dailyData[date]) {
        dailyData[date] = { date, emission: 0, count: 0 };
      }
      dailyData[date].emission += emission;
      dailyData[date].count += 1;
    });

    return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const barData = prepareBarChartData();
  const pieData = preparePieChartData();
  const trendData = prepareTrendData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-white/20">
          <p className="text-white font-semibold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-white/90">
              {entry.name}: {typeof entry.value === 'number' ? formatCarbonEmission(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="glass-effect border-purple-400/30">
        <CardHeader>
          <CardTitle className="gradient-text">碳排放統計圖表</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bar" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/10">
              <TabsTrigger value="bar" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                長條圖
              </TabsTrigger>
              <TabsTrigger value="pie" className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" />
                圓餅圖
              </TabsTrigger>
              <TabsTrigger value="trend" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                趨勢圖
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bar" className="mt-6">
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-white mb-4">各交通工具平均碳排放量</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="transport" 
                      stroke="rgba(255,255,255,0.7)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.7)"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="avgEmission" 
                      fill="url(#barGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="pie" className="mt-6">
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-white mb-4">各交通工具碳排放佔比</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="trend" className="mt-6">
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-white mb-4">每日碳排放趨勢</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.7)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.7)"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="emission" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
