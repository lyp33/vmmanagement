"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useToast } from "@/providers/toast-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  vmStartDate: string
  createdAt: string
  lastExpiryDate?: string
  currentExpiryDate: string
  comment?: string
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
  const { toast } = useToast()
  const [vm, setVM] = useState<VMRecord | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [renewing, setRenewing] = useState(false)
  const [showRenewDialog, setShowRenewDialog] = useState(false)
  const [renewalMonths, setRenewalMonths] = useState(3)
  const [specificExpiryDate, setSpecificExpiryDate] = useState('')

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
    if (!vm) return
    
    setRenewing(true)
    setError('')
    
    try {
      let newExpiryDate: Date
      
      // Priority 1: Use specific expiry date if provided
      if (specificExpiryDate) {
        newExpiryDate = new Date(specificExpiryDate)
        
        // Validate that the new date is after current expiry date
        const currentExpiry = new Date(vm.currentExpiryDate)
        if (newExpiryDate <= currentExpiry) {
          toast({
            title: 'Invalid Date',
            description: 'New expiry date must be after the current expiry date',
            variant: 'error'
          })
          setRenewing(false)
          return
        }
      } else {
        // Priority 2: Use renewal months to calculate from current expiry date
        const currentExpiry = new Date(vm.currentExpiryDate)
        newExpiryDate = new Date(currentExpiry)
        newExpiryDate.setMonth(newExpiryDate.getMonth() + renewalMonths)
      }
      
      const response = await fetch(`/api/vms-simple/${vmId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastExpiryDate: vm.currentExpiryDate,
          currentExpiryDate: newExpiryDate.toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Renewal failed')
      }
      
      // Refresh VM data and audit logs
      await Promise.all([fetchVM(), fetchAuditLogs()])
      
      // Close dialog and reset form
      setShowRenewDialog(false)
      setSpecificExpiryDate('')
      setRenewalMonths(3)
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'VM renewed successfully',
        variant: 'success'
      })
    } catch (error) {
      console.error('Renewal error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Renewal failed',
        variant: 'error'
      })
    } finally {
      setRenewing(false)
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
                <Button onClick={() => setShowRenewDialog(true)}>
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
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">VM Start Date</p>
                      <p className="text-sm text-gray-900">
                        {vm.vmStartDate ? new Date(vm.vmStartDate).toLocaleDateString('en-US') : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {vm.comment && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-500 mb-1">Comment</p>
                    <p className="text-sm text-gray-900">{vm.comment}</p>
                  </div>
                )}
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
                  <Button onClick={() => setShowRenewDialog(true)} className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Renew VM
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

        {/* Renew Dialog */}
        <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renew VM</DialogTitle>
              <DialogDescription>
                Extend the expiry date for {vm.vmAccount}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="specificExpiryDate">Specific Expiry Date (Optional)</Label>
                <Input
                  id="specificExpiryDate"
                  type="date"
                  value={specificExpiryDate}
                  onChange={(e) => setSpecificExpiryDate(e.target.value)}
                  disabled={renewing}
                  min={new Date(vm.currentExpiryDate).toISOString().split('T')[0]}
                />
                <p className="text-sm text-gray-500">
                  If specified, this date will be used as the new expiry date
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewalMonths">Or Extend by Months</Label>
                <Select
                  value={renewalMonths.toString()}
                  onValueChange={(value) => setRenewalMonths(parseInt(value))}
                  disabled={renewing || !!specificExpiryDate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Month</SelectItem>
                    <SelectItem value="2">2 Months</SelectItem>
                    <SelectItem value="3">3 Months (Default)</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">12 Months</SelectItem>
                    <SelectItem value="24">24 Months</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {specificExpiryDate 
                    ? 'Disabled when specific date is set' 
                    : `The expiry date will be extended by ${renewalMonths} month(s) from the current expiry date`}
                </p>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Current Expiry:</strong> {new Date(vm.currentExpiryDate).toLocaleDateString('en-US')}
                  <br />
                  <strong>New Expiry:</strong> {
                    specificExpiryDate 
                      ? new Date(specificExpiryDate).toLocaleDateString('en-US')
                      : (() => {
                          const newDate = new Date(vm.currentExpiryDate)
                          newDate.setMonth(newDate.getMonth() + renewalMonths)
                          return newDate.toLocaleDateString('en-US')
                        })()
                  }
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRenewDialog(false)
                  setSpecificExpiryDate('')
                  setRenewalMonths(3)
                }}
                disabled={renewing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRenewal}
                disabled={renewing}
              >
                {renewing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Renewing...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Confirm Renewal
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}