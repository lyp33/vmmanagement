"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Edit, Trash2 } from "lucide-react"

interface Project {
  id: string
  name: string
  description?: string
  _count: {
    vms: number
    userAssignments: number
  }
}

interface FormData {
  name: string
  description: string
}

interface FormErrors {
  name?: string
  description?: string
}

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: ''
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const isAdmin = session?.user?.role === 'ADMIN'
  const projectId = params.id as string

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard/projects')
      return
    }
    if (projectId) {
      fetchProject()
    }
  }, [isAdmin, projectId, router])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects-simple/${projectId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Project不存在')
        } else if (response.status === 403) {
          setError('您No权限Edit此Project')
        } else {
          throw new Error('Failed to fetch project')
        }
        return
      }
      
      const data = await response.json()
      const projectData = data.project
      setProject(projectData)
      
      // Populate form data
      setFormData({
        name: projectData.name,
        description: projectData.description || ''
      })
    } catch (error) {
      console.error('Error fetching project:', error)
      setError('加载ProjectFailed')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!formData.name.trim()) {
      errors.name = 'ProjectName是Required field'
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
      const response = await fetch(`/api/projects-simple/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update project')
      }

      router.push(`/dashboard/projects/${projectId}`)
    } catch (error: any) {
      console.error('Error updating project:', error)
      setError(error.message || '更新ProjectFailed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!project) return

    const confirmMessage = project._count.vms > 0 
      ? `此Project包含 ${project._count.vms} 个VMrecords，无法Delete。请先移除所有VMrecords。`
      : `确定要DeleteProject "${project.name}" ?此Actions无法撤销。`

    if (project._count.vms > 0) {
      alert(confirmMessage)
      return
    }

    if (!confirm(confirmMessage)) return

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/projects-simple/${projectId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete project')
      }

      router.push('/dashboard/projects')
    } catch (error: any) {
      console.error('Error deleting project:', error)
      setError(error.message || 'DeleteProjectFailed')
    } finally {
      setDeleting(false)
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

  if (error && !project) {
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
            <h1 className="text-3xl font-bold text-gray-900">EditProject</h1>
            <p className="mt-2 text-gray-600">
              {project?.name}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Edit className="w-5 h-5" />
                  <span>ProjectInformation</span>
                </CardTitle>
                <CardDescription>
                  修改Projectof基本Information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">ProjectName *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="输入ProjectName"
                      className={formErrors.name ? "border-red-500" : ""}
                      disabled={saving}
                    />
                    {formErrors.name && (
                      <p className="text-sm text-red-500">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">ProjectDescription</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="输入ProjectDescription（可选）"
                      disabled={saving}
                    />
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
                          Save中...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save更改
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Stats */}
            {project && (
              <Card>
                <CardHeader>
                  <CardTitle>ProjectStatistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">VM Count</span>
                      <span className="font-medium">{project._count.vms}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">AssignUser</span>
                      <span className="font-medium">{project._count.userAssignments}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">危险Actions</CardTitle>
                <CardDescription>
                  这些Actions无法撤销，请谨慎Actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="w-full"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Delete中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      DeleteProject
                    </>
                  )}
                </Button>
                {project && project._count.vms > 0 && (
                  <p className="text-xs text-red-500 mt-2">
                    此Project包含VMrecords，无法Delete
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}