"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Server, FolderOpen, FileText, Clock, Users, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface DashboardStats {
  totalVMs: number
  expiringSoon: number
  totalProjects: number
  totalUsers: number
}

interface AuditLog {
  id: string
  operation: string
  entityType: string
  timestamp: string
  userEmail: string
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  
  const [stats, setStats] = useState<DashboardStats>({
    totalVMs: 0,
    expiringSoon: 0,
    totalProjects: 0,
    totalUsers: 0
  })
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch VMs
        const vmsRes = await fetch('/api/vms-simple')
        const vmsData = await vmsRes.json()
        const vms = vmsData.vms || []
        
        // Calculate expiring soon (within 7 days)
        const now = new Date()
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        const expiringSoon = vms.filter((vm: any) => {
          const expiryDate = new Date(vm.currentExpiryDate)
          return expiryDate >= now && expiryDate <= sevenDaysFromNow
        }).length

        // Fetch Projects
        const projectsRes = await fetch('/api/projects-simple')
        const projectsData = await projectsRes.json()
        const projects = projectsData.projects || []

        // Fetch Users (admin only)
        let users = []
        if (isAdmin) {
          const usersRes = await fetch('/api/users-simple')
          const usersData = await usersRes.json()
          users = usersData.users || []
        }

        // Fetch Recent Activity (admin only)
        if (isAdmin) {
          const auditRes = await fetch('/api/audit-simple?limit=3')
          const auditData = await auditRes.json()
          setRecentActivity(auditData.logs || [])
        }

        setStats({
          totalVMs: vms.length,
          expiringSoon,
          totalProjects: projects.length,
          totalUsers: users.length
        })
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchDashboardData()
    }
  }, [session, isAdmin])

  const quickActions = [
    {
      title: "VMs",
      description: "View and manage virtual machine records",
      href: "/dashboard/vms",
      icon: Server,
      color: "bg-blue-500"
    },
    {
      title: "Projects",
      description: "Manage projects and user assignments",
      href: "/dashboard/projects", 
      icon: FolderOpen,
      color: "bg-green-500"
    },
    ...(isAdmin ? [{
      title: "Audit Logs",
      description: "View system action records",
      href: "/dashboard/audit",
      icon: FileText,
      color: "bg-purple-500"
    }] : [])
  ]

  const statsDisplay = [
    {
      title: "Expiring Soon",
      value: loading ? "..." : stats.expiringSoon.toString(),
      description: "Expiring within 7 days",
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      title: "Total VMs",
      value: loading ? "..." : stats.totalVMs.toString(),
      description: "Active virtual machines",
      icon: Server,
      color: "text-blue-600"
    },
    {
      title: "Projects",
      value: loading ? "..." : stats.totalProjects.toString(),
      description: "Active projects",
      icon: FolderOpen,
      color: "text-green-600"
    },
    ...(isAdmin ? [{
      title: "Users",
      value: loading ? "..." : stats.totalUsers.toString(),
      description: "System users",
      icon: Users,
      color: "text-purple-600"
    }] : [])
  ]

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOperationColor = (operation: string) => {
    if (operation.includes('CREATE')) return 'bg-green-500'
    if (operation.includes('UPDATE') || operation.includes('RENEW')) return 'bg-blue-500'
    if (operation.includes('DELETE')) return 'bg-red-500'
    return 'bg-yellow-500'
  }

  const getOperationText = (log: AuditLog) => {
    const { operation, entityType } = log
    if (operation === 'CREATE') return `Created ${entityType.toLowerCase()}`
    if (operation === 'UPDATE') return `Updated ${entityType.toLowerCase()}`
    if (operation === 'DELETE') return `Deleted ${entityType.toLowerCase()}`
    if (operation === 'RENEW') return `Renewed ${entityType.toLowerCase()}`
    return operation
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome Back, {session?.user?.name || session?.user?.email}
          </h1>
          <p className="mt-2 text-gray-600">
            This is your VM Expiry Management dashboard
            {isAdmin && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                Admin
              </span>
            )}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsDisplay.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </p>
                      <p className="text-sm font-medium text-gray-600">
                        {stat.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {stat.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{action.title}</CardTitle>
                        <CardDescription>{action.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href={action.href}>
                      <Button className="w-full">
                        Go to {action.title}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Recent system action records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-gray-500 py-4">Loading...</div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center space-x-3 text-sm">
                    <div className={`w-2 h-2 ${getOperationColor(log.operation)} rounded-full`}></div>
                    <span className="text-gray-600">{formatTimestamp(log.timestamp)}</span>
                    <span>{getOperationText(log)}</span>
                    <span className="text-gray-500">by {log.userEmail}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">No recent activity</div>
            )}
            {isAdmin && (
              <div className="mt-4">
                <Link href="/dashboard/audit">
                  <Button variant="outline" size="sm">
                    View Full Log
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}