"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Plus } from "lucide-react"
import { clientValidationUtils } from "@/lib/client-validation"

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

export default function NewVMPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard/vms')
      return
    }
    fetchProjects()
    
    // Set default expiry date to 3 months from now
    const defaultExpiry = clientValidationUtils.helpers.getDefaultExpiryDate()
    setFormData(prev => ({
      ...prev,
      currentExpiryDate: defaultExpiry
    }))
  }, [isAdmin, router])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects-simple')
      if (!response.ok) throw new Error('Failed to fetch projects')
      
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      setError('Failed to load project list')
    }
  }

  const validateForm = (): boolean => {
    const validation = clientValidationUtils.helpers.validateForm(formData, clientValidationUtils.schemas.createVM)
    
    if (!validation.success) {
      setFormErrors(validation.errors)
      return false
    }
    
    setFormErrors({})
    return true
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    // Sanitize input based on field type
    let sanitizedValue = value
    switch (field) {
      case 'email':
        sanitizedValue = clientValidationUtils.helpers.sanitizeInput.email(value)
        break
      case 'vmInternalIP':
        sanitizedValue = clientValidationUtils.helpers.sanitizeInput.ipAddress(value)
        break
      case 'vmDomain':
        sanitizedValue = clientValidationUtils.helpers.sanitizeInput.domain(value)
        break
      default:
        sanitizedValue = clientValidationUtils.helpers.sanitizeInput.string(value)
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }))
    
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

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/vms-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create VM')
      }

      const data = await response.json()
      router.push(`/dashboard/vms`)
    } catch (error: any) {
      console.error('Error creating VM:', error)
      const errorMessage = clientValidationUtils.helpers.formatErrorMessage(error)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return null
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
            <h1 className="text-3xl font-bold text-gray-900">Create New VM Record</h1>
            <p className="mt-2 text-gray-600">
              Create a new virtual machine record
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
              <Plus className="w-5 h-5" />
              <span>VM Information</span>
            </CardTitle>
            <CardDescription>
              Please fill in complete VM information, all fields are required
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                  {formErrors.vmStartDate && (
                    <p className="text-sm text-red-500">{formErrors.vmStartDate}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    The date when the VM was started/activated
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectId">Project *</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) => handleInputChange('projectId', value)}
                    disabled={loading}
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
                    disabled={loading}
                  />
                  {formErrors.currentExpiryDate && (
                    <p className="text-sm text-red-500">{formErrors.currentExpiryDate}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Default is set to 3 months from now, you can adjust as needed
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Input
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  placeholder="Optional notes or comments about this VM"
                  disabled={loading}
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
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create VM
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