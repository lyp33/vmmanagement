"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Plus, 
  Search, 
  FolderOpen, 
  Edit, 
  Users, 
  Server,
  Calendar,
  MoreHorizontal
} from "lucide-react"
import Link from "next/link"

interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  _count: {
    vms: number
    userAssignments: number
  }
}

interface NewProjectForm {
  name: string
  description: string
}

export default function ProjectsPage() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [newProjectForm, setNewProjectForm] = useState<NewProjectForm>({
    name: '',
    description: ''
  })
  const [creating, setCreating] = useState(false)

  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects-simple')
      if (!response.ok) throw new Error('Failed to fetch projects')
      
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProjectForm.name.trim()) {
      setError('Project name is required')
      return
    }

    setCreating(true)
    setError('')

    try {
      const response = await fetch('/api/projects-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectForm.name.trim(),
          description: newProjectForm.description.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create project')
      }

      await fetchProjects()
      setShowNewProjectDialog(false)
      setNewProjectForm({ name: '', description: '' })
    } catch (error: any) {
      console.error('Error creating project:', error)
      setError(error.message || 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  const handleExport = async (type: 'vm' | 'project' | 'audit', format: 'json' | 'csv') => {
    try {
      setError('')
      const params = new URLSearchParams()
      params.append('type', type)
      params.append('format', format)

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
      setError(error instanceof Error ? error.message : 'Export failed')
    }
  }

  const filteredProjects = (projects || []).filter(project =>
    project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project?.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-2 text-gray-600">
              Manage projects and user assignments
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Export buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('project', 'csv')}
              disabled={loading}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('project', 'json')}
              disabled={loading}
            >
              Export JSON
            </Button>
            {isAdmin && (
              <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Create a new project to organize VM resources
                    </DialogDescription>
                  </DialogHeader>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      value={newProjectForm.name}
                      onChange={(e) => setNewProjectForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter project name"
                      disabled={creating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectDescription">Project Description</Label>
                    <Input
                      id="projectDescription"
                      value={newProjectForm.description}
                      onChange={(e) => setNewProjectForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter project description (optional)"
                      disabled={creating}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewProjectDialog(false)}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : 'Create Project'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search project name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'No matching projects found' : 'No Projects'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms' : 'Start by creating your first project'}
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-blue-500">
                        <FolderOpen className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        {project.description && (
                          <CardDescription className="mt-1">
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Server className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{project?._count?.vms || 0} VM</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{project?._count?.userAssignments || 0} User</span>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Created on {new Date(project.createdAt).toLocaleDateString('en-US')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Link href={`/dashboard/projects/${project.id}`}>
                      <Button size="sm" className="flex-1">
                        View Details
                      </Button>
                    </Link>
                    {isAdmin && (
                      <Link href={`/dashboard/projects/${project.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {!loading && projects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{projects.length}</p>
                  <p className="text-sm text-gray-600">Total Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {(projects || []).reduce((sum, p) => sum + (p?._count?.vms || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600">Total VMs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {projects.reduce((sum, p) => sum + p._count.userAssignments, 0)}
                  </p>
                  <p className="text-sm text-gray-600">User Assignments</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {(projects || []).length > 0 ? Math.round((projects || []).reduce((sum, p) => sum + (p?._count?.vms || 0), 0) / projects.length) : 0}
                  </p>
                  <p className="text-sm text-gray-600">Average VMs/Project</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}