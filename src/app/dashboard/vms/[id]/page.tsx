"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Server, 
  Mail, 
  Globe, 
  Network,
  User,
  Clock,
  History,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"

interface VMRecord {
  id: string
  email: string
  vmAccount: string
  vmInternalIP: string
  vmDomain: string
  createdAt: string
  lastExpiryDate?: string
  currentExpiryDate: string
  project: {
    id: string
    name: string
    description?: string
  }
  createdBy: string
  updatedAt: string
}

interface AuditLog {
  id: string
  operation: string
  changes?: Record<string, any>
  timestamp: string
  userEmail: string
}

export default function VMDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [vm, setVM] = useState<VMRecord | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isAdmin = session?.user?.role === 'ADMIN'
  const vmId = params.id as string

  useEffect(() => {
    if (vmId) {
      fetchVM()
      fetchAuditLogs()
    }
  }, [vmId])

  const fetchVM = async () => {
    try {
      const response = await fetch(`/api/vms-simple/${vmId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('VM record not found')
        } else if (response.status === 403) {
          setError('You do not have permission to view this VM record')
        } else {
          throw new Error('Failed to fetch VM')
        }
        return
      }
      
      const data = await response.json()
      setVM(data)
    } catch (error) {
      console.error('Error fetching VM:', error)
      setError('Failed to load VM record')
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    if (!isAdmin) return

    try {
      const response = await fetch(`/api/audit-simple?entityType=VMRecord&entityId=${vmId}`)
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    }
  }

  const handleRenewal = async () => {
    try {
      const response = await fetch(`/api/vms/${vmId}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Renewal failed')
      
      await fetchVM()
      setError('')
    } catch (error) {
      console.error('Renewal error:', error)
      setError('Renewal failed')
    }
  }

  const getExpiryStatus = (expiryDate: string) => {
    const now = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Expired', color: 'bg-red-500 text-white', days: Math.abs(daysUntilExpiry) }
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring', label: 'Expiring Soon', color: 'bg-yellow-500 text-white', days: daysUntilExpiry }
    } else {
      return { status: 'active', label: 'Active', color: 'bg-green-500 text-white', days: daysUntilExpiry }
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  if (!vm) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">VM record not found</h3>
        </div>
      </DashboardLayout>
    )
  }

  const expiryInfo = getExpiryStatus(vm.currentExpiryDate)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">VM Details</h1>
              <p className="mt-2 text-gray-600">
                {vm.vmAccount} - {vm.vmDomain}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <>
                <Button onClick={handleRenewal}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Renew
                </Button>
                <Link href={`/dashboard/vms/${vm.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="w-5 h-5" />
                  <span>Basic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email Address</p>
                      <p className="text-sm text-gray-900">{vm.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">VM Account</p>
                      <p className="text-sm text-gray-900">{vm.vmAccount}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Network className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Internal IP</p>
                      <p className="text-sm text-gray-900">{vm.vmInternalIP}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Domain</p>
                      <p className="text-sm text-gray-900">{vm.vmDomain}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle>Associated Project</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{vm.project.name}</h3>
                    {vm.project.description && (
                      <p className="text-sm text-gray-600 mt-1">{vm.project.description}</p>
                    )}
                  </div>
                  <Link href={`/dashboard/projects/${vm.project.id}`}>
                    <Button variant="outline" size="sm">
                      View Project
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            {isAdmin && auditLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="w-5 h-5" />
                    <span>Operation History</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auditLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-start space-x-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-gray-900">{log.operation}</p>
                          <p className="text-gray-500">
                            {log.userEmail} • {new Date(log.timestamp).toLocaleString('en-US')}
                          </p>
                          {log.changes && (
                            <div className="mt-1 text-xs text-gray-600">
                              {Object.entries(log.changes).map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  {key}: {JSON.stringify(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {auditLogs.length > 5 && (
                      <Link href={`/dashboard/audit?entityId=${vm.id}`}>
                        <Button variant="outline" size="sm">
                          View Full History
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Expiry Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Expiry Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Badge className={expiryInfo.color}>
                    {expiryInfo.label}
                  </Badge>
                  <p className="text-2xl font-bold mt-2">
                    {expiryInfo.days} days
                  </p>
                  <p className="text-sm text-gray-600">
                    {expiryInfo.status === 'expired' ? 'Expired' : 'Remaining'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current Expiry Date</span>
                    <span className="font-medium">
                      {new Date(vm.currentExpiryDate).toLocaleDateString('en-US')}
                    </span>
                  </div>
                  
                  {vm.lastExpiryDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Previous Expiry Date</span>
                      <span className="font-medium">
                        {new Date(vm.lastExpiryDate).toLocaleDateString('en-US')}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Created At</span>
                    <span className="font-medium">
                      {new Date(vm.createdAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Updated</span>
                    <span className="font-medium">
                      {new Date(vm.updatedAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={handleRenewal} className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Renew 3 Months
                  </Button>
                  <Link href={`/dashboard/vms/${vm.id}/edit`}>
                    <Button variant="outline" className="w-full">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Information
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}