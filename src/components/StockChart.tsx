import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';
import { StockHistoricalData, StockPrediction, TimePeriod, getHistoricalData, getPricePrediction } from '@/services/stockApi';

interface StockChartProps {
  symbol: string | null;
}

interface ChartDataPoint {
  date: string;
  price?: number;
  predictedPrice?: number;
  upperBound?: number;
  lowerBound?: number;
  type: 'historical' | 'prediction';
}

const StockChart: React.FC<StockChartProps> = ({ symbol }) => {
  const [period, setPeriod] = useState<TimePeriod>('1M');
  const [historicalData, setHistoricalData] = useState<StockHistoricalData[]>([]);
  const [predictionData, setPredictionData] = useState<StockPrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPrediction, setShowPrediction] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;
      
      setIsLoading(true);
      try {
        const data = await getHistoricalData(symbol, period);
        setHistoricalData(data);
        
        if (period !== '1D') {
          const predictions = await getPricePrediction(symbol, 30);
          setPredictionData(predictions);
        } else {
          setPredictionData([]);
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [symbol, period]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (period === '1D') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    if (period === '5Y' || period === '1Y') {
      return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  const chartData = (): ChartDataPoint[] => {
    const result: ChartDataPoint[] = [...historicalData.map(item => ({
      date: item.date,
      price: item.close,
      type: 'historical' as const
    }))];
    
    if (showPrediction && predictionData.length > 0) {
      result.push({
        date: historicalData[historicalData.length - 1].date,
        price: historicalData[historicalData.length - 1].close,
        predictedPrice: historicalData[historicalData.length - 1].close,
        type: 'prediction' as const
      });
      
      result.push(...predictionData.map(item => ({
        date: item.date,
        predictedPrice: item.predictedPrice,
        upperBound: item.upperBound,
        lowerBound: item.lowerBound,
        type: 'prediction' as const
      })));
    }
    
    return result;
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as ChartDataPoint;
      const isPrediction = dataPoint.type === 'prediction' && dataPoint.predictedPrice;
      
      return (
        <div className="bg-popover border border-border p-2 rounded-md shadow-md">
          <p className="text-sm font-medium">{formatDate(label)}</p>
          {isPrediction ? (
            <>
              <p className="text-sm text-primary">
                <span className="font-medium">Predicted: </span>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dataPoint.predictedPrice || 0)}
              </p>
              {dataPoint.upperBound && dataPoint.lowerBound && (
                <p className="text-xs text-muted-foreground">
                  Range: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dataPoint.lowerBound)} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dataPoint.upperBound)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm">
              <span className="font-medium">Price: </span>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dataPoint.price || 0)}
            </p>
          )}
        </div>
      );
    }
    
    return null;
  };
  
  const getDomain = () => {
    const data = chartData();
    if (data.length === 0) return [0, 100];
    
    let min = Infinity;
    let max = -Infinity;
    
    data.forEach(item => {
      if (item.price !== undefined && item.price < min) min = item.price;
      if (item.price !== undefined && item.price > max) max = item.price;
      if (item.predictedPrice !== undefined && item.predictedPrice < min) min = item.predictedPrice;
      if (item.predictedPrice !== undefined && item.predictedPrice > max) max = item.predictedPrice;
      if (item.lowerBound !== undefined && item.lowerBound < min) min = item.lowerBound;
      if (item.upperBound !== undefined && item.upperBound > max) max = item.upperBound;
    });
    
    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding];
  };
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle>{symbol ? `${symbol} Stock Chart` : 'Stock Chart'}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <ToggleGroup type="single" value={period} onValueChange={(value) => value && setPeriod(value as TimePeriod)}>
              <ToggleGroupItem value="1D" size="sm">1D</ToggleGroupItem>
              <ToggleGroupItem value="1W" size="sm">1W</ToggleGroupItem>
              <ToggleGroupItem value="1M" size="sm">1M</ToggleGroupItem>
              <ToggleGroupItem value="3M" size="sm">3M</ToggleGroupItem>
              <ToggleGroupItem value="6M" size="sm">6M</ToggleGroupItem>
              <ToggleGroupItem value="1Y" size="sm">1Y</ToggleGroupItem>
              <ToggleGroupItem value="5Y" size="sm">5Y</ToggleGroupItem>
            </ToggleGroup>
            
            {period !== '1D' && (
              <ToggleGroup 
                type="single" 
                value={showPrediction ? 'on' : 'off'} 
                onValueChange={(value) => setShowPrediction(value === 'on')}
              >
                <ToggleGroupItem value="on" size="sm">Prediction</ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : !symbol ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Search for a stock to view chart
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData()} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--finance-grid))" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate} 
                tick={{ fill: 'hsl(var(--finance-label))' }}
                axisLine={{ stroke: 'hsl(var(--finance-grid))' }}
              />
              <YAxis 
                domain={getDomain()}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                tick={{ fill: 'hsl(var(--finance-label))' }}
                axisLine={{ stroke: 'hsl(var(--finance-grid))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={true}
              />
              
              {showPrediction && predictionData.length > 0 && (
                <>
                  <Line
                    type="monotone"
                    dataKey="predictedPrice"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={true}
                  />
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="none"
                    fill="#10b981"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="none"
                    fill="#10b981"
                    fillOpacity={0.1}
                  />
                  <ReferenceLine
                    x={historicalData.length > 0 ? historicalData[historicalData.length - 1].date : ''}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{ value: 'Today', position: 'top', fill: '#f59e0b' }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default StockChart;
