"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Edit } from "lucide-react"

interface VMRecord {
  id: string
  email: string
  vmAccount: string
  vmInternalIP: string
  vmDomain: string
  vmStartDate: string
  currentExpiryDate: string
  comment?: string
  project: {
    id: string
    name: string
  }
}

interface Project {
  id: string
  name: string
}

interface FormData {
  email: string
  vmAccount: string
  vmInternalIP: string
  vmDomain: string
  vmStartDate: string
  projectId: string
  currentExpiryDate: string
  comment: string
}

interface FormErrors {
  email?: string
  vmAccount?: string
  vmInternalIP?: string
  vmDomain?: string
  vmStartDate?: string
  projectId?: string
  currentExpiryDate?: string
}

export default function EditVMPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [vm, setVM] = useState<VMRecord | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<FormData>({
    email: '',
    vmAccount: '',
    vmInternalIP: '',
    vmDomain: '',
    vmStartDate: '',
    projectId: '',
    currentExpiryDate: '',
    comment: ''
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const isAdmin = session?.user?.role === 'ADMIN'
  const vmId = params.id as string

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard/vms')
      return
    }
    if (vmId) {
      fetchVM()
      fetchProjects()
    }
  }, [isAdmin, vmId, router])

  const fetchVM = async () => {
    try {
      const response = await fetch(`/api/vms-simple/${vmId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('VM record not found')
        } else if (response.status === 403) {
          setError('You do not have permission to edit this VM record')
        } else {
          throw new Error('Failed to fetch VM')
        }
        return
      }
      
      const data = await response.json()
      const vmData = data
      setVM(vmData)
      
      // Populate form data
      setFormData({
        email: vmData.email,
        vmAccount: vmData.vmAccount,
        vmInternalIP: vmData.vmInternalIP,
        vmDomain: vmData.vmDomain,
        vmStartDate: vmData.vmStartDate ? vmData.vmStartDate.split('T')[0] : '', // Convert to YYYY-MM-DD format
        projectId: vmData.project.id,
        currentExpiryDate: vmData.currentExpiryDate.split('T')[0], // Convert to YYYY-MM-DD format
        comment: vmData.comment || ''
      })
    } catch (error) {
      console.error('Error fetching VM:', error)
      setError('Failed to load VM record')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects-simple')
      if (!response.ok) throw new Error('Failed to fetch projects')
      
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!formData.email) {
      errors.email = 'Email address is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!formData.vmAccount) {
      errors.vmAccount = 'VM Account is required'
    }

    if (!formData.vmInternalIP) {
      errors.vmInternalIP = 'Internal IP is required'
    } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(formData.vmInternalIP)) {
      errors.vmInternalIP = 'Please enter a valid IP address'
    }

    if (!formData.vmDomain) {
      errors.vmDomain = 'Domain is required'
    }

    if (!formData.vmStartDate) {
      errors.vmStartDate = 'VM Start Date is required'
    }

    if (!formData.projectId) {
      errors.projectId = 'Please select a project'
    }

    if (!formData.currentExpiryDate) {
      errors.currentExpiryDate = 'Expiry date is required'
    } else {
      const expiryDate = new Date(formData.currentExpiryDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (expiryDate <= today) {
        errors.currentExpiryDate = 'Expiry date must be in the future'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/vms-simple/${vmId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update VM')
      }

      router.push(`/dashboard/vms/${vmId}`)
    } catch (error: any) {
      console.error('Error updating VM:', error)
      setError(error.message || 'Failed to update VM record')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  if (loading) {
    return (
      <DashboardLayout requireAdmin={true}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error && !vm) {
    return (
      <DashboardLayout requireAdmin={true}>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requireAdmin={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit VM Record</h1>
            <p className="mt-2 text-gray-600">
              {vm?.vmAccount} - {vm?.vmDomain}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Edit className="w-5 h-5" />
              <span>VM Information</span>
            </CardTitle>
            <CardDescription>
              Modify VM record information. All fields are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="user@example.com"
                    className={formErrors.email ? "border-red-500" : ""}
                    disabled={saving}
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-500">{formErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vmAccount">VM Account *</Label>
                  <Input
                    id="vmAccount"
                    value={formData.vmAccount}
                    onChange={(e) => handleInputChange('vmAccount', e.target.value)}
                    placeholder="vm-account-001"
                    className={formErrors.vmAccount ? "border-red-500" : ""}
                    disabled={saving}
                  />
                  {formErrors.vmAccount && (
                    <p className="text-sm text-red-500">{formErrors.vmAccount}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vmInternalIP">Internal IP *</Label>
                  <Input
                    id="vmInternalIP"
                    value={formData.vmInternalIP}
                    onChange={(e) => handleInputChange('vmInternalIP', e.target.value)}
                    placeholder="192.168.1.100"
                    className={formErrors.vmInternalIP ? "border-red-500" : ""}
                    disabled={saving}
                  />
                  {formErrors.vmInternalIP && (
                    <p className="text-sm text-red-500">{formErrors.vmInternalIP}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vmDomain">Domain *</Label>
                  <Input
                    id="vmDomain"
                    value={formData.vmDomain}
                    onChange={(e) => handleInputChange('vmDomain', e.target.value)}
                    placeholder="vm001.example.com"
                    className={formErrors.vmDomain ? "border-red-500" : ""}
                    disabled={saving}
                  />
                  {formErrors.vmDomain && (
                    <p className="text-sm text-red-500">{formErrors.vmDomain}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vmStartDate">VM Start Date *</Label>
                  <Input
                    id="vmStartDate"
                    type="date"
                    value={formData.vmStartDate}
                    onChange={(e) => handleInputChange('vmStartDate', e.target.value)}
                    className={formErrors.vmStartDate ? "border-red-500" : ""}
                    disabled={saving}
                  />
                  {formErrors.vmStartDate && (
                    <p className="text-sm text-red-500">{formErrors.vmStartDate}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    The date when the VM was started/activated
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectId">Associated Project *</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) => handleInputChange('projectId', value)}
                    disabled={saving}
                  >
                    <SelectTrigger className={formErrors.projectId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.projectId && (
                    <p className="text-sm text-red-500">{formErrors.projectId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentExpiryDate">Expiry Date *</Label>
                  <Input
                    id="currentExpiryDate"
                    type="date"
                    value={formData.currentExpiryDate}
                    onChange={(e) => handleInputChange('currentExpiryDate', e.target.value)}
                    className={formErrors.currentExpiryDate ? "border-red-500" : ""}
                    disabled={saving}
                  />
                  {formErrors.currentExpiryDate && (
                    <p className="text-sm text-red-500">{formErrors.currentExpiryDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Input
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  placeholder="Optional notes or comments about this VM"
                  disabled={saving}
                />
                <p className="text-xs text-gray-500">
                  Optional field for additional information or notes
                </p>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}