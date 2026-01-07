"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Server, FolderOpen, FileText, Clock, Users, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

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

  const stats = [
    {
      title: "Expiring Soon",
      value: "5",
      description: "Expiring within 7 days",
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      title: "Total VMs",
      value: "24",
      description: "Active virtual machines",
      icon: Server,
      color: "text-blue-600"
    },
    {
      title: "Projects",
      value: "8",
      description: "Active projects",
      icon: FolderOpen,
      color: "text-green-600"
    },
    ...(isAdmin ? [{
      title: "Users",
      value: "12",
      description: "System users",
      icon: Users,
      color: "text-purple-600"
    }] : [])
  ]

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
          {stats.map((stat, index) => {
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
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">2024-01-04 10:30</span>
                <span>VM vm-001 renewed successfully</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">2024-01-04 09:15</span>
                <span>Created new project "Test Project A"</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">2024-01-04 08:45</span>
                <span>Sent expiry reminder emails (5 VMs)</span>
              </div>
            </div>
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