"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Database, 
  Shield, 
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react'

interface ErrorStats {
  totalErrors: number
  errorsByCategory: Record<string, number>
  errorsByLevel: Record<string, number>
  recentErrors: Array<{
    id: string
    level: string
    category: string
    message: string
    timestamp: string
    context?: Record<string, any>
  }>
  trends: {
    hourly: number[]
    daily: number[]
  }
}

interface ErrorDashboardProps {
  className?: string
  timeRange?: 'hour' | 'day' | 'week'
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ErrorDashboard({ 
  className = '',
  timeRange = 'day',
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: ErrorDashboardProps) {
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchErrorStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // In a real implementation, this would call your error logging API
      // const response = await fetch(`/api/monitoring/errors?timeRange=${timeRange}`)
      // const data = await response.json()
      
      // Mock data for demonstration
      const mockStats: ErrorStats = {
        totalErrors: 42,
        errorsByCategory: {
          'AUTHENTICATION': 8,
          'VALIDATION': 15,
          'DATABASE': 12,
          'EXTERNAL_SERVICE': 4,
          'SYSTEM': 3
        },
        errorsByLevel: {
          'ERROR': 25,
          'WARN': 12,
          'INFO': 5
        },
        recentErrors: [
          {
            id: '1',
            level: 'ERROR',
            category: 'DATABASE',
            message: 'Connection timeout to database',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            context: { operation: 'VM_CREATE', userId: 'user123' }
          },
          {
            id: '2',
            level: 'WARN',
            category: 'VALIDATION',
            message: 'Invalid email format in VM creation',
            timestamp: new Date(Date.now() - 600000).toISOString(),
            context: { email: 'invalid-email', vmId: 'vm456' }
          },
          {
            id: '3',
            level: 'ERROR',
            category: 'AUTHENTICATION',
            message: 'Failed login attempt',
            timestamp: new Date(Date.now() - 900000).toISOString(),
            context: { email: 'user@example.com', ip: '192.168.1.1' }
          }
        ],
        trends: {
          hourly: [2, 1, 3, 5, 2, 1, 4, 6, 3, 2, 1, 0],
          daily: [15, 23, 18, 31, 25, 19, 42]
        }
      }
      
      setStats(mockStats)
      setLastRefresh(new Date())
    } catch (err) {
      setError('Failed to fetch error statistics')
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrorStats()
  }, [timeRange])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchErrorStats, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'ERROR': return 'destructive'
      case 'WARN': return 'default'
      case 'INFO': return 'secondary'
      default: return 'outline'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'AUTHENTICATION': return <Shield className="w-4 h-4" />
      case 'DATABASE': return <Database className="w-4 h-4" />
      case 'VALIDATION': return <AlertCircle className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  const exportErrorData = () => {
    if (!stats) return
    
    const data = {
      exportTime: new Date().toISOString(),
      timeRange,
      stats
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-stats-${timeRange}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading && !stats) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Error Monitoring</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchErrorStats}
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Error Monitoring</h2>
          <p className="text-gray-600">
            Last Updated: {lastRefresh.toLocaleTimeString('en-US')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchErrorStats}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportErrorData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalErrors}</div>
            <p className="text-xs text-gray-600">
              Past {timeRange === 'hour' ? 'hour' : timeRange === 'day' ? 'day' : 'week'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.errorsByLevel.ERROR || 0}
            </div>
            <p className="text-xs text-gray-600">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.errorsByLevel.WARN || 0}
            </div>
            <p className="text-xs text-gray-600">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.trends.daily.length > 1 ? 
                (stats.trends.daily[stats.trends.daily.length - 1] > stats.trends.daily[stats.trends.daily.length - 2] ? '↑' : '↓')
                : '→'
              }
            </div>
            <p className="text-xs text-gray-600">
              Compared to yesterday
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Classification</CardTitle>
            <CardDescription>Distribution by error type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.errorsByCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(category)}
                    <span className="text-sm font-medium">
                      {category === 'AUTHENTICATION' ? 'Authentication' :
                       category === 'VALIDATION' ? 'Validation' :
                       category === 'DATABASE' ? 'Database' :
                       category === 'EXTERNAL_SERVICE' ? 'External Service' :
                       category === 'SYSTEM' ? 'System' : category}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{count}</Badge>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / stats.totalErrors) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
            <CardDescription>Latest error records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.recentErrors.map((error) => (
                <div key={error.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={getLevelColor(error.level) as any}>
                      {error.level}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(error.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(error.category)}
                    <span className="text-sm font-medium">{error.category}</span>
                  </div>
                  <p className="text-sm text-gray-700">{error.message}</p>
                  {error.context && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500">详细Information</summary>
                      <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(error.context, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}