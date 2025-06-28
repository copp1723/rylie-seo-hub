'use client'

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'
import { AnalyticsVisualization, TrendDirection } from '@/lib/analytics/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface ChartVisualizationProps {
  visualization: AnalyticsVisualization
  className?: string
  height?: number
}

export function ChartVisualization({ 
  visualization, 
  className = '', 
  height = 300 
}: ChartVisualizationProps) {
  const { type, title, data, insights } = visualization

  // Get trend icon based on direction
  const getTrendIcon = (trend: TrendDirection) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'stable':
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  // Get significance icon based on level
  const getSignificanceIcon = (significance: string) => {
    switch (significance) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'medium':
        return <CheckCircle className="h-4 w-4 text-amber-500" />
      case 'low':
        return <HelpCircle className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  // Format percentage for display
  const formatPercentage = (value?: number) => {
    if (value === undefined) return null
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  // Type-specific chart options
  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  }

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  }

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
  }

  // Render chart based on type
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <Line
            data={data as ChartData<'line'>}
            options={lineOptions}
            height={height}
          />
        )
      
      case 'bar':
        return (
          <Bar
            data={data as ChartData<'bar'>}
            options={barOptions}
            height={height}
          />
        )
      
      case 'pie':
        return (
          <Pie
            data={data as ChartData<'pie'>}
            options={pieOptions}
            height={height}
          />
        )
      
      case 'metric':
        // For metric visualizations, render a simple card with the metric value
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.labels.map((label, index) => (
              <Card key={index} className="bg-white">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{data.datasets[0].data[index].toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      
      default:
        return <div className="text-red-500">Unsupported visualization type: {type}</div>
    }
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <span className="flex items-center gap-1">
                {getTrendIcon(insights.trend)}
                {insights.trend.charAt(0).toUpperCase() + insights.trend.slice(1)}
              </span>
              
              {insights.percentage !== undefined && (
                <Badge variant={insights.trend === 'up' ? 'success' : insights.trend === 'down' ? 'destructive' : 'outline'}>
                  {formatPercentage(insights.percentage)}
                </Badge>
              )}
              
              <span className="mx-2">•</span>
              
              <span className="flex items-center gap-1">
                {getSignificanceIcon(insights.significance)}
                Significance: {insights.significance.charAt(0).toUpperCase() + insights.significance.slice(1)}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Chart container */}
        <div className="h-[300px] w-full">
          {renderChart()}
        </div>
        
        {/* Recommendation */}
        {insights.recommendation && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800">
            <strong>Recommendation:</strong> {insights.recommendation}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
