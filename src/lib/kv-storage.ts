import { kv } from '@vercel/kv'
import { createId } from '@paralleldrive/cuid2'

// Data type definitions
export interface User {
  id: string
  email: string
  name: string
  password?: string
  role: 'ADMIN' | 'USER'
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectAssignment {
  id: string
  userId: string
  projectId: string
  assignedAt: string
}

export interface VMRecord {
  id: string
  email: string
  vmAccount: string
  vmInternalIP: string
  vmDomain: string
  vmStartDate: string  // VM开启时间
  createdAt: string
  lastExpiryDate?: string
  currentExpiryDate: string
  projectId: string
  createdBy: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  operation: string
  entityType: string
  entityId: string
  userId: string
  userEmail: string
  changes?: any
  timestamp: string
  ipAddress?: string
}

export interface NotificationLog {
  id: string
  vmId: string
  recipientEmail: string
  status: 'PENDING' | 'SENT' | 'FAILED'
  sentAt?: string
  errorMessage?: string
  retryCount: number
  createdAt: string
}

// KV Keys
const KEYS = {
  USERS: 'users',
  PROJECTS: 'projects',
  PROJECT_ASSIGNMENTS: 'project_assignments',
  VM_RECORDS: 'vm_records',
  AUDIT_LOGS: 'audit_logs',
  NOTIFICATION_LOGS: 'notification_logs',
  USER_BY_EMAIL: (email: string) => `user:email:${email}`,
  USER_BY_ID: (id: string) => `user:id:${id}`,
  PROJECT_BY_ID: (id: string) => `project:id:${id}`,
  VM_BY_ID: (id: string) => `vm:id:${id}`,
}

class KVStorage {
  // User operations
  async findUserByEmail(email: string): Promise<User | null> {
    return await kv.get<User>(KEYS.USER_BY_EMAIL(email))
  }

  async findUserById(id: string): Promise<User | null> {
    return await kv.get<User>(KEYS.USER_BY_ID(id))
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date().toISOString()
    const user: User = {
      id: createId(),
      ...userData,
      createdAt: now,
      updatedAt: now
    }

    // Store user by ID and email
    await kv.set(KEYS.USER_BY_ID(user.id), user)
    await kv.set(KEYS.USER_BY_EMAIL(user.email), user)
    
    // Add to users list
    await kv.sadd(KEYS.USERS, user.id)

    return user
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const user = await this.findUserById(id)
    if (!user) return null

    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await kv.set(KEYS.USER_BY_ID(id), updatedUser)
    await kv.set(KEYS.USER_BY_EMAIL(updatedUser.email), updatedUser)

    return updatedUser
  }

  async findAllUsers(): Promise<User[]> {
    const userIds = await kv.smembers(KEYS.USERS)
    const users: User[] = []
    
    for (const id of userIds) {
      const user = await this.findUserById(id as string)
      if (user) users.push(user)
    }
    
    return users
  }

  // Project operations
  async findAllProjects(): Promise<Project[]> {
    const projectIds = await kv.smembers(KEYS.PROJECTS)
    const projects: Project[] = []
    
    for (const id of projectIds) {
      const project = await this.findProjectById(id as string)
      if (project) projects.push(project)
    }
    
    return projects
  }

  async findProjectById(id: string): Promise<Project | null> {
    return await kv.get<Project>(KEYS.PROJECT_BY_ID(id))
  }

  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const now = new Date().toISOString()
    const project: Project = {
      id: createId(),
      ...projectData,
      createdAt: now,
      updatedAt: now
    }

    await kv.set(KEYS.PROJECT_BY_ID(project.id), project)
    await kv.sadd(KEYS.PROJECTS, project.id)

    return project
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    const project = await this.findProjectById(id)
    if (!project) return null

    const updatedProject: Project = {
      ...project,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await kv.set(KEYS.PROJECT_BY_ID(id), updatedProject)
    return updatedProject
  }

  async deleteProject(id: string): Promise<boolean> {
    const project = await this.findProjectById(id)
    if (!project) return false

    await kv.del(KEYS.PROJECT_BY_ID(id))
    await kv.srem(KEYS.PROJECTS, id)
    return true
  }

  // ProjectAssignment operations
  async findUserProjects(userId: string): Promise<Project[]> {
    const assignments = await kv.get<ProjectAssignment[]>(`user:${userId}:projects`) || []
    const projects: Project[] = []
    
    for (const assignment of assignments) {
      const project = await this.findProjectById(assignment.projectId)
      if (project) projects.push(project)
    }
    
    return projects
  }

  async findUserProjectAssignments(userId: string): Promise<ProjectAssignment[]> {
    return await kv.get<ProjectAssignment[]>(`user:${userId}:projects`) || []
  }

  async createProjectAssignment(userId: string, projectId: string): Promise<ProjectAssignment> {
    const assignment: ProjectAssignment = {
      id: createId(),
      userId,
      projectId,
      assignedAt: new Date().toISOString()
    }

    // Get existing assignments
    const assignments = await kv.get<ProjectAssignment[]>(`user:${userId}:projects`) || []
    assignments.push(assignment)
    
    await kv.set(`user:${userId}:projects`, assignments)
    await kv.sadd(KEYS.PROJECT_ASSIGNMENTS, assignment.id)

    return assignment
  }

  async removeProjectAssignment(userId: string, projectId: string): Promise<boolean> {
    const assignments = await kv.get<ProjectAssignment[]>(`user:${userId}:projects`) || []
    const filtered = assignments.filter(a => a.projectId !== projectId)
    
    if (filtered.length === assignments.length) return false
    
    await kv.set(`user:${userId}:projects`, filtered)
    return true
  }

  // VMRecord operations
  async findVMsByUserPermissions(userId: string, isAdmin: boolean): Promise<VMRecord[]> {
    const vmIds = await kv.smembers(KEYS.VM_RECORDS)
    const vms: VMRecord[] = []
    
    for (const id of vmIds) {
      const vm = await this.findVMById(id as string)
      if (!vm) continue
      
      if (isAdmin) {
        vms.push(vm)
      } else {
        // Check if user has access to this VM's project
        const userProjects = await this.findUserProjects(userId)
        if (userProjects.some(p => p.id === vm.projectId)) {
          vms.push(vm)
        }
      }
    }
    
    return vms
  }

  async findVMById(id: string): Promise<VMRecord | null> {
    return await kv.get<VMRecord>(KEYS.VM_BY_ID(id))
  }

  async findAllVMs(): Promise<VMRecord[]> {
    const vmIds = await kv.smembers(KEYS.VM_RECORDS)
    const vms: VMRecord[] = []
    
    for (const id of vmIds) {
      const vm = await this.findVMById(id as string)
      if (vm) vms.push(vm)
    }
    
    return vms
  }

  async createVMRecord(vmData: Omit<VMRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<VMRecord> {
    const now = new Date().toISOString()
    const vm: VMRecord = {
      id: createId(),
      ...vmData,
      createdAt: now,
      updatedAt: now
    }

    await kv.set(KEYS.VM_BY_ID(vm.id), vm)
    await kv.sadd(KEYS.VM_RECORDS, vm.id)

    return vm
  }

  async updateVMRecord(id: string, updates: Partial<Omit<VMRecord, 'id' | 'createdAt'>>): Promise<VMRecord | null> {
    const vm = await this.findVMById(id)
    if (!vm) return null

    const updatedVM: VMRecord = {
      ...vm,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await kv.set(KEYS.VM_BY_ID(id), updatedVM)
    return updatedVM
  }

  async deleteVMRecord(id: string): Promise<boolean> {
    const vm = await this.findVMById(id)
    if (!vm) return false

    await kv.del(KEYS.VM_BY_ID(id))
    await kv.srem(KEYS.VM_RECORDS, id)
    return true
  }

  // AuditLog operations
  async createAuditLog(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const log: AuditLog = {
      id: createId(),
      ...logData,
      timestamp: new Date().toISOString()
    }

    await kv.lpush(KEYS.AUDIT_LOGS, JSON.stringify(log))
    
    // Keep only last 10000 logs
    await kv.ltrim(KEYS.AUDIT_LOGS, 0, 9999)

    return log
  }

  async findAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      const logs = await kv.lrange(KEYS.AUDIT_LOGS, 0, limit - 1)
      if (!logs || logs.length === 0) {
        return []
      }
      // KV may return objects or strings, handle both cases
      return logs.map(log => {
        if (typeof log === 'string') {
          return JSON.parse(log)
        }
        return log as AuditLog
      })
    } catch (error) {
      console.error('Error fetching audit logs from KV:', error)
      return []
    }
  }

  // NotificationLog operations
  async createNotificationLog(logData: Omit<NotificationLog, 'id' | 'createdAt'>): Promise<NotificationLog> {
    const log: NotificationLog = {
      id: createId(),
      ...logData,
      createdAt: new Date().toISOString()
    }

    await kv.lpush(KEYS.NOTIFICATION_LOGS, JSON.stringify(log))
    
    // Keep only last 5000 logs
    await kv.ltrim(KEYS.NOTIFICATION_LOGS, 0, 4999)

    return log
  }

  async findNotificationLogs(limit: number = 100): Promise<NotificationLog[]> {
    const logs = await kv.lrange(KEYS.NOTIFICATION_LOGS, 0, limit - 1)
    return logs.map(log => JSON.parse(log as string))
  }

  // Initialize default data
  async initializeDefaultData(): Promise<void> {
    // Check if admin already exists
    const existingAdmin = await this.findUserByEmail('admin@123.com')
    if (existingAdmin) {
      console.log('Default admin already exists')
      return
    }

    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash('123456789', 10)
    
    await this.createUser({
      email: 'admin@123.com',
      name: 'Administrator',
      password: hashedPassword,
      role: 'ADMIN'
    })

    console.log('Default admin user created: admin@123.com / 123456789')
  }

  // Utility: Clear all data (for testing)
  async clearAllData(): Promise<void> {
    const userIds = await kv.smembers(KEYS.USERS)
    const projectIds = await kv.smembers(KEYS.PROJECTS)
    const vmIds = await kv.smembers(KEYS.VM_RECORDS)

    // Delete all users
    for (const id of userIds) {
      const user = await this.findUserById(id as string)
      if (user) {
        await kv.del(KEYS.USER_BY_ID(id as string))
        await kv.del(KEYS.USER_BY_EMAIL(user.email))
      }
    }

    // Delete all projects
    for (const id of projectIds) {
      await kv.del(KEYS.PROJECT_BY_ID(id as string))
    }

    // Delete all VMs
    for (const id of vmIds) {
      await kv.del(KEYS.VM_BY_ID(id as string))
    }

    // Clear sets
    await kv.del(KEYS.USERS)
    await kv.del(KEYS.PROJECTS)
    await kv.del(KEYS.VM_RECORDS)
    await kv.del(KEYS.PROJECT_ASSIGNMENTS)
    await kv.del(KEYS.AUDIT_LOGS)
    await kv.del(KEYS.NOTIFICATION_LOGS)

    console.log('All data cleared from KV')
  }
}

// Singleton instance
export const kvStorage = new KVStorage()
