"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useToast } from "@/providers/toast-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ArrowLeft, 
  Edit, 
  FolderOpen, 
  Server, 
  Users, 
  Calendar,
  Plus,
  UserPlus,
  Trash2,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"

interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  vms: Array<{
    id: string
    email: string
    vmAccount: string
    vmDomain: string
    currentExpiryDate: string
  }>
  userAssignments: Array<{
    id: string
    user: {
      id: string
      email: string
      name: string
      role: string
    }
    assignedAt: string
  }>
}

interface User {
  id: string
  email: string
  name: string
  role: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assigning, setAssigning] = useState(false)

  const isAdmin = session?.user?.role === 'ADMIN'
  const projectId = params.id as string

  useEffect(() => {
    if (projectId) {
      fetchProject()
      if (isAdmin) {
        fetchAvailableUsers()
      }
    }
  }, [projectId, isAdmin])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects-simple/${projectId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Project不存在')
        } else if (response.status === 403) {
          setError('您No权限View此Project')
        } else {
          throw new Error('Failed to fetch project')
        }
        return
      }
      
      const data = await response.json()
      setProject(data.project)
    } catch (error) {
      console.error('Error fetching project:', error)
      setError('加载ProjectFailed')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users-simple')
      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleAssignUser = async () => {
    if (!selectedUserId) return

    setAssigning(true)
    setError('')

    try {
      const response = await fetch(`/api/projects-simple/${projectId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign user')
      }

      await fetchProject()
      setShowAssignDialog(false)
      setSelectedUserId('')
      
      toast({
        title: 'Success',
        description: 'User assigned to project successfully',
        variant: 'success'
      })
    } catch (error: any) {
      console.error('Error assigning user:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign user',
        variant: 'error'
      })
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassignUser = async (userId: string) => {
    if (!confirm('确定要Cancel此UserofProjectAssign?')) return

    try {
      const response = await fetch(`/api/projects-simple/${projectId}/assign`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unassign user')
      }

      await fetchProject()
      
      toast({
        title: 'Success',
        description: 'User unassigned from project successfully',
        variant: 'success'
      })
    } catch (error: any) {
      console.error('Error unassigning user:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to unassign user',
        variant: 'error'
      })
    }
  }

  const getExpiryStatus = (expiryDate: string) => {
    const now = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Expired', color: 'bg-red-500 text-white' }
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring', label: 'Expiring Soon', color: 'bg-yellow-500 text-white' }
    } else {
      return { status: 'active', label: 'Active', color: 'bg-green-500 text-white' }
    }
  }

  const unassignedUsers = availableUsers.filter(user => 
    !project?.userAssignments.some(assignment => assignment.user.id === user.id)
  )

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

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Project不存在</h3>
        </div>
      </DashboardLayout>
    )
  }

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
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="mt-2 text-gray-600">{project.description}</p>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    AssignUser
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>AssignUser到Project</DialogTitle>
                    <DialogDescription>
                      选择要Assign到此ProjectofUser
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Select
                        value={selectedUserId}
                        onValueChange={setSelectedUserId}
                        disabled={assigning}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select User" />
                        </SelectTrigger>
                        <SelectContent>
                          {unassignedUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email} ({user.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAssignDialog(false)}
                        disabled={assigning}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAssignUser}
                        disabled={!selectedUserId || assigning}
                      >
                        {assigning ? 'Assign中...' : 'AssignUser'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Link href={`/dashboard/projects/${project.id}/edit`}>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project VMs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Server className="w-5 h-5" />
                    <span>ProjectVM</span>
                    <Badge variant="secondary">{project?.vms?.length || 0}</Badge>
                  </div>
                  {isAdmin && (
                    <Link href={`/dashboard/vms/new?projectId=${project.id}`}>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        AddVM
                      </Button>
                    </Link>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!project?.vms?.length ? (
                  <div className="text-center py-8">
                    <Server className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No VMs</h3>
                    <p className="mt-1 text-sm text-gray-500">此Project还NoVMrecords</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>VM Account</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {project?.vms?.map((vm) => {
                          const expiryInfo = getExpiryStatus(vm.currentExpiryDate)
                          return (
                            <TableRow key={vm.id}>
                              <TableCell className="font-medium">{vm.email}</TableCell>
                              <TableCell>{vm.vmAccount}</TableCell>
                              <TableCell>{vm.vmDomain}</TableCell>
                              <TableCell>
                                {new Date(vm.currentExpiryDate).toLocaleDateString('zh-CN')}
                              </TableCell>
                              <TableCell>
                                <Badge className={expiryInfo.color}>
                                  {expiryInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Link href={`/dashboard/vms/${vm.id}`}>
                                  <Button variant="ghost" size="sm">
                                    View
                                  </Button>
                                </Link>
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

            {/* Assigned Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>AssignUser</span>
                  <Badge variant="secondary">{project.userAssignments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.userAssignments.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Users</h3>
                    <p className="mt-1 text-sm text-gray-500">此Project还NoAssignUser</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {project.userAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {assignment.user.name?.charAt(0) || assignment.user.email.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{assignment.user.name || assignment.user.email}</p>
                            <p className="text-sm text-gray-500">
                              {assignment.user.email} • {assignment.user.role}
                            </p>
                            <p className="text-xs text-gray-400">
                              Assign于 {new Date(assignment.assignedAt).toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnassignUser(assignment.user.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FolderOpen className="w-5 h-5" />
                  <span>ProjectInformation</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">VM Count</span>
                    <span className="font-medium">{project?.vms?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">AssignUser</span>
                    <span className="font-medium">{project.userAssignments.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Create时间</span>
                    <span className="font-medium">
                      {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Updated</span>
                    <span className="font-medium">
                      {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>VMStatusStatistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Active</span>
                    <span className="font-medium text-green-600">
                      {project?.vms?.filter(vm => getExpiryStatus(vm.currentExpiryDate).status === 'active').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Expiring Soon</span>
                    <span className="font-medium text-yellow-600">
                      {project?.vms?.filter(vm => getExpiryStatus(vm.currentExpiryDate).status === 'expiring').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Expired</span>
                    <span className="font-medium text-red-600">
                      {project?.vms?.filter(vm => getExpiryStatus(vm.currentExpiryDate).status === 'expired').length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}