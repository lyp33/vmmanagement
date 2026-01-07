"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { AdminDashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  FileText, 
  Filter, 
  Download, 
  Search,
  Calendar,
  User,
  Activity,
  RefreshCw
} from "lucide-react"

interface AuditLog {
  id: string
  operation: string
  entityType: string
  entityId: string
  userId: string
  userEmail: string
  changes?: Record<string, any>
  timestamp: string
  ipAddress?: string
}

interface AuditFilters {
  search: string
  operation: string
  entityType: string
  userId: string
  startDate: string
  endDate: string
}

export default function AuditPage() {
  const { data: session } = useSession()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    operation: 'all',
    entityType: 'all',
    userId: 'all',
    startDate: '',
    endDate: ''
  })
  const [users, setUsers] = useState<Array<{id: string, email: string}>>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)

  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs()
      fetchUsers()
    }
  }, [isAdmin, filters, currentPage])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.search) params.append('search', filters.search)
      if (filters.operation && filters.operation !== 'all') params.append('operation', filters.operation)
      if (filters.entityType && filters.entityType !== 'all') params.append('entityType', filters.entityType)
      if (filters.userId && filters.userId !== 'all') params.append('userId', filters.userId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      params.append('page', currentPage.toString())
      params.append('limit', pageSize.toString())

      const response = await fetch(`/api/audit-simple?${params}`)
      if (!response.ok) throw new Error('Failed to fetch audit logs')
      
      const data = await response.json()
      setAuditLogs(data.logs || [])
      setTotalCount(data.total || 0)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      setError('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users-simple')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleFilterChange = (field: keyof AuditFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      operation: 'all',
      entityType: 'all',
      userId: 'all',
      startDate: '',
      endDate: ''
    })
    setCurrentPage(1)
  }

  const exportAuditLogs = async () => {
    try {
      setError('')
      const params = new URLSearchParams()
      params.append('type', 'audit')
      params.append('format', 'csv')
      
      // Add current filters to export
      if (filters.operation) params.append('operation', filters.operation)
      if (filters.entityType) params.append('entityType', filters.entityType)
      if (filters.userId) params.append('userEmail', filters.userId) // Note: using userEmail for user filtering
      if (filters.startDate) params.append('dateFrom', filters.startDate)
      if (filters.endDate) params.append('dateTo', filters.endDate)

      const response = await fetch(`/api/export-simple?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'audit-export.csv'

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      console.error('Export error:', error)
      setError(error instanceof Error ? error.message : 'Export failed')
    }
  }

  const getOperationColor = (operation: string) => {
    switch (operation.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      case 'login':
        return 'bg-purple-100 text-purple-800'
      case 'renew':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatChanges = (changes?: Record<string, any>) => {
    if (!changes) return null
    
    return Object.entries(changes).map(([key, value]) => (
      <div key={key} className="text-xs">
        <span className="font-medium">{key}:</span> {JSON.stringify(value)}
      </div>
    ))
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  if (!isAdmin) {
    return null
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="mt-2 text-gray-600">
              View system operation records and change history
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={fetchAuditLogs} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportAuditLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filter Items</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search operation or entity..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="operation">Operation Type</Label>
                <Select
                  value={filters.operation}
                  onValueChange={(value) => handleFilterChange('operation', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Operation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Operations</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="LOGIN">Sign In</SelectItem>
                    <SelectItem value="RENEW">Renew</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="entityType">Entity Type</Label>
                <Select
                  value={filters.entityType}
                  onValueChange={(value) => handleFilterChange('entityType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="VMRecord">VM Record</SelectItem>
                    <SelectItem value="Project">Project</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="ProjectAssignment">Project Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userId">User</Label>
                <Select
                  value={filters.userId}
                  onValueChange={(value) => handleFilterChange('userId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Operation Records</span>
                <Badge variant="secondary">{totalCount}</Badge>
              </div>
              <div className="text-sm text-gray-500">
                Page {currentPage}, Total {totalPages} pages
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No audit records found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your filter criteria
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {new Date(log.timestamp).toLocaleString('en-US')}
                          </TableCell>
                          <TableCell>
                            <Badge className={getOperationColor(log.operation)}>
                              {log.operation}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.entityType}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{log.userEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {log.changes ? (
                              <div className="space-y-1">
                                {formatChanges(log.changes)}
                              </div>
                            ) : (
                              <span className="text-gray-400">No changes</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ipAddress || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} items, Total {totalCount} records
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}