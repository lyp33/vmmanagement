"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface TestResult {
  name: string
  status: 'OK' | 'ERROR'
  data?: any
  error?: string
}

export default function TestPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)

  const testAPIs = async () => {
    setLoading(true)
    const apis = [
      { name: 'VMs API', url: '/api/vms-simple' },
      { name: 'Projects API', url: '/api/projects-simple' },
      { name: 'Users API', url: '/api/users-simple' },
      { name: 'Audit API', url: '/api/audit-simple' },
      { name: 'Status API', url: '/api/status' }
    ]

    const testResults: TestResult[] = []

    for (const api of apis) {
      try {
        const response = await fetch(api.url)
        if (response.ok) {
          const data = await response.json()
          testResults.push({
            name: api.name,
            status: 'OK',
            data: data
          })
        } else {
          testResults.push({
            name: api.name,
            status: 'ERROR',
            error: `HTTP ${response.status}`
          })
        }
      } catch (error) {
        testResults.push({
          name: api.name,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    setResults(testResults)
    setLoading(false)
  }

  useEffect(() => {
    testAPIs()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">系统测试page面</h1>
          <p className="mt-2 text-gray-600">
            测试所有API端点of功能Status
          </p>
        </div>

        <div className="flex justify-between items-center">
          <Button onClick={testAPIs} disabled={loading}>
            {loading ? '测试中...' : '重新测试'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((result) => (
            <Card key={result.name} className={result.status === 'OK' ? 'border-green-200' : 'border-red-200'}>
              <CardHeader>
                <CardTitle className={`flex items-center space-x-2 ${result.status === 'OK' ? 'text-green-700' : 'text-red-700'}`}>
                  <span>{result.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${result.status === 'OK' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {result.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.status === 'OK' ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">数据预览:</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-red-600">ErrorInformation:</p>
                    <p className="text-xs text-red-500">{result.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}