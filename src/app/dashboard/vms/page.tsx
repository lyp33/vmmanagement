"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImportDialog } from "@/components/vms/import-dialog"
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Calendar, 
  Server,
  Upload
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
  project: {
    id: string
    name: string
  }
  createdBy: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
}

export default function VMsPage() {
  const { data: session } = useSession()
  const [vms, setVms] = useState<VMRecord[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVMs, setSelectedVMs] = useState<string[]>([])
  const [filters, setFilters] = useState({
    search: '',
    project: 'all',
    expiryStatus: 'all'
  })
  const [error, setError] = useState('')
  const [showBatchRenewDialog, setShowBatchRenewDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [renewalMonths, setRenewalMonths] = useState(3)
  const [batchRenewing, setBatchRenewing] = useState(false)

  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    fetchVMs()
    fetchProjects()
  }, [filters])

  const fetchVMs = async () => {
    try {
      setLoading(true)
      setError('') // Clear previous errors
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.project && filters.project !== 'all') params.append('projectId', filters.project)
      if (filters.expiryStatus && filters.expiryStatus !== 'all') params.append('expiryStatus', filters.expiryStatus)

      const response = await fetch(`/api/vms-simple?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('VM API Response:', data) // Debug log
      
      // Ensure data structure is correct
      if (data && typeof data === 'object') {
        setVms(data.vms || [])
      } else {
        console.error('Invalid data structure:', data)
        setVms([])
        setError('Invalid data received from server')
      }
    } catch (error) {
      console.error('Error fetching VMs:', error)
      setError(`Failed to load VM records: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setVms([]) // Ensure vms is always an array
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects-simple')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Projects API Response:', data) // Debug log
      
      // Ensure data structure is correct
      if (data && typeof data === 'object') {
        setProjects(data.projects || [])
      } else {
        console.error('Invalid projects data structure:', data)
        setProjects([])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      setProjects([]) // Ensure projects is always an array
    }
  }

  const getExpiryStatus = (expiryDate: string) => {
    const now = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Expired', color: 'bg-red-500', days: Math.abs(daysUntilExpiry) }
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring', label: 'Expiring Soon', color: 'bg-yellow-500', days: daysUntilExpiry }
    } else {
      return { status: 'active', label: 'Active', color: 'bg-green-500', days: daysUntilExpiry }
    }
  }

  const handleSelectVM = (vmId: string, checked: boolean) => {
    if (checked) {
      setSelectedVMs(prev => [...prev, vmId])
    } else {
      setSelectedVMs(prev => prev.filter(id => id !== vmId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVMs(vms.map(vm => vm.id))
    } else {
      setSelectedVMs([])
    }
  }

  const handleBatchRenewal = async () => {
    if (selectedVMs.length === 0) return

    setBatchRenewing(true)
    setError('')

    try {
      const response = await fetch('/api/vms/batch-renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vmIds: selectedVMs,
          renewalPeriodMonths: renewalMonths
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Batch renewal failed')
      }
      
      const result = await response.json()
      
      // Show success message
      if (result.results.successful > 0) {
        setError(`Successfully renewed ${result.results.successful} VM(s)${result.results.failed > 0 ? `, ${result.results.failed} failed` : ''}`)
      }
      
      await fetchVMs()
      setSelectedVMs([])
      setShowBatchRenewDialog(false)
      setRenewalMonths(3) // Reset to default
    } catch (error) {
      console.error('Batch renewal error:', error)
      setError(error instanceof Error ? error.message : 'Batch renewal failed')
    } finally {
      setBatchRenewing(false)
    }
  }

  const handleDeleteVM = async (vmId: string) => {
    try {
      setError('')
      const response = await fetch(`/api/vms-simple/${vmId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Delete failed')
      }

      // Refresh VM list
      await fetchVMs()
    } catch (error) {
      console.error('Delete error:', error)
      setError(error instanceof Error ? error.message : 'DeleteFailed')
    }
  }

  const handleExport = async (type: 'vm' | 'project' | 'audit', format: 'json' | 'csv') => {
    try {
      setError('')
      const params = new URLSearchParams()
      params.append('type', type)
      params.append('format', format)
      
      // Add current filters to export
      if (filters.project && filters.project !== 'all') params.append('projectId', filters.project)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`/api/export-simple?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `export.${format}`

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
      setError(error instanceof Error ? error.message : 'ExportFailed')
    }
  }

  const filteredVMs = vms.filter(vm => {
    const matchesSearch = !filters.search || 
      vm.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      vm.vmAccount.toLowerCase().includes(filters.search.toLowerCase()) ||
      vm.vmDomain.toLowerCase().includes(filters.search.toLowerCase())
    
    const matchesProject = filters.project === 'all' || vm.project.id === filters.project
    
    const matchesExpiryStatus = filters.expiryStatus === 'all' || 
      getExpiryStatus(vm.currentExpiryDate).status === filters.expiryStatus

    return matchesSearch && matchesProject && matchesExpiryStatus
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">VMs</h1>
            <p className="mt-2 text-gray-600">
              Manage virtual machine records and expiry dates
            </p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Email, Account or Domain..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={filters.project}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, project: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expiryStatus">Expiry Status</Label>
                <Select
                  value={filters.expiryStatus}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, expiryStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ search: '', project: 'all', expiryStatus: 'all' })}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batch Actions */}
        {selectedVMs.length > 0 && isAdmin && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Selected {selectedVMs.length} VM(s)
                </span>
                <div className="space-x-2">
                  <Button onClick={() => setShowBatchRenewDialog(true)}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Batch Renew
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedVMs([])}>
                    Cancel Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Batch Renewal Dialog */}
        <Dialog open={showBatchRenewDialog} onOpenChange={setShowBatchRenewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Batch Renew VMs</DialogTitle>
              <DialogDescription>
                Renew {selectedVMs.length} selected VM(s) by extending their expiry dates
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="renewalMonths">Renewal Period (Months)</Label>
                <Select
                  value={renewalMonths.toString()}
                  onValueChange={(value) => setRenewalMonths(parseInt(value))}
                  disabled={batchRenewing}
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
                  The expiry date will be extended by {renewalMonths} month(s) from the current expiry date
                </p>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Selected VMs:</strong> {selectedVMs.length} VM(s) will be renewed
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowBatchRenewDialog(false)}
                disabled={batchRenewing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBatchRenewal}
                disabled={batchRenewing}
              >
                {batchRenewing ? (
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

        {/* VM List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5" />
                <span>VM List</span>
                <Badge variant="secondary">{filteredVMs.length}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                {/* Export buttons */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('vm', 'csv')}
                  disabled={loading}
                >
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('vm', 'json')}
                  disabled={loading}
                >
                  Export JSON
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImportDialog(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import CSV
                    </Button>
                    <Link href="/dashboard/vms/new">
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Create VM
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : filteredVMs.length === 0 ? (
              <div className="text-center py-8">
                <Server className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No VM records found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.search || (filters.project !== 'all') || (filters.expiryStatus !== 'all')
                    ? 'Try adjusting the filter items' 
                    : 'Start by creating your first VM record'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedVMs.length === filteredVMs.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead>VM Account</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>VM Start Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-center">Remaining Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVMs.map((vm) => {
                      const expiryInfo = getExpiryStatus(vm.currentExpiryDate)
                      return (
                        <TableRow key={vm.id}>
                          {isAdmin && (
                            <TableCell>
                              <Checkbox
                                checked={selectedVMs.includes(vm.id)}
                                onCheckedChange={(checked) => handleSelectVM(vm.id, checked as boolean)}
                              />
                            </TableCell>
                          )}
                          <TableCell>{vm.vmAccount}</TableCell>
                          <TableCell>{vm.vmDomain}</TableCell>
                          <TableCell className="font-medium">{vm.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{vm.project.name}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {vm.vmStartDate ? new Date(vm.vmStartDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            }) : '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(vm.currentExpiryDate).toLocaleDateString('en-US')}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${
                              expiryInfo.days < 0 
                                ? 'text-red-600' 
                                : expiryInfo.days <= 7 
                                ? 'text-yellow-600' 
                                : 'text-green-600'
                            }`}>
                              {expiryInfo.days < 0 ? `${Math.abs(expiryInfo.days)} (Overdue)` : expiryInfo.days}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${expiryInfo.color}`}></div>
                              <span className="text-sm">{expiryInfo.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Link href={`/dashboard/vms/${vm.id}`}>
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </Link>
                              {isAdmin && (
                                <>
                                  <Link href={`/dashboard/vms/${vm.id}/edit`}>
                                    <Button variant="ghost" size="sm">
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Confirm Delete</DialogTitle>
                                        <DialogDescription>
                                          Are you sure you want to delete VM "{vm.vmDomain}"? This action cannot be undone.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="flex justify-end space-x-2 mt-4">
                                        <Button variant="outline" onClick={() => {}}>
                                          Cancel
                                        </Button>
                                        <Button 
                                          variant="destructive" 
                                          onClick={() => handleDeleteVM(vm.id)}
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import Dialog */}
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={() => {
          fetchVMs();
          setShowImportDialog(false);
        }}
      />
    </DashboardLayout>
  )
}