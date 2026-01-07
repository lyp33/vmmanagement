"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Plus } from "lucide-react"

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'USER'
  createdAt: string
  updatedAt: string
  _count: {
    projectAssignments: number
  }
}

export default function TestUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users-simple')
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'USER') => {
    if (!confirm(`确定要将此UserRole更改为 ${newRole === 'ADMIN' ? 'Admin' : 'User'} ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/users-simple/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user role')
      }

      await fetchUsers()
      setError('')
    } catch (error: any) {
      console.error('Error updating user role:', error)
      setError(error.message || '更新UserRoleFailed')
    }
  }

  const handleCreateUser = async () => {
    const email = prompt('Please enterEmail地址:')
    const name = prompt('Please enterUser姓名:')
    const password = prompt('Please enterPassword:')
    
    if (!email || !name || !password) return

    try {
      const response = await fetch('/api/users-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          password,
          role: 'USER'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create user')
      }

      await fetchUsers()
      setError('')
    } catch (error: any) {
      console.error('Error creating user:', error)
      setError(error.message || 'CreateUserFailed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users测试page面</h1>
            <p className="mt-2 text-gray-600">
              测试UserEdit功能（无需Sign In）
            </p>
          </div>
          <Button onClick={handleCreateUser}>
            <Plus className="w-4 h-4 mr-2" />
            CreateUser
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertDescription>
            <strong>Test Instructions：</strong> 这是一个测试page面，用于验证UserEdit功能。您可以更改UserRole和Create新User。
          </AlertDescription>
        </Alert>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>User List</span>
              <Badge variant="secondary">{users.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">NoUser</h3>
                <p className="mt-1 text-sm text-gray-500">开始Create您of第一个User</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>ProjectAssign</TableHead>
                      <TableHead>Create时间</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {user.name.charAt(0) || user.email.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}
                          >
                            {user.role === 'ADMIN' ? 'Admin' : 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span>{user._count.projectAssignments} 个Project</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {new Date(user.updatedAt).toLocaleDateString('zh-CN')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value: 'ADMIN' | 'USER') => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">User</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {!loading && users.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>UserStatistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{users.length}</p>
                  <p className="text-sm text-gray-600">总User数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {users.filter(u => u.role === 'ADMIN').length}
                  </p>
                  <p className="text-sm text-gray-600">Admin</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.role === 'USER').length}
                  </p>
                  <p className="text-sm text-gray-600">User</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}