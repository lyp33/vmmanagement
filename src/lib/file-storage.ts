import { promises as fs } from 'fs'
import path from 'path'
import { createId } from '@paralleldrive/cuid2'

// 数据类型定义
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
  comment?: string  // 备注信息
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

// 数据存储结构
interface DatabaseData {
  users: User[]
  projects: Project[]
  projectAssignments: ProjectAssignment[]
  vmRecords: VMRecord[]
  auditLogs: AuditLog[]
  notificationLogs: NotificationLog[]
}

class FileStorage {
  private dataPath: string
  private data: DatabaseData | null = null

  constructor() {
    // 在开发环境中使用本地文件，在生产环境中使用临时目录
    this.dataPath = process.env.NODE_ENV === 'production' 
      ? '/tmp/vm-data.json' 
      : path.join(process.cwd(), 'data', 'vm-data.json')
  }

  private async ensureDataDir() {
    const dir = path.dirname(this.dataPath)
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
    }
  }

  private async loadData(): Promise<DatabaseData> {
    if (this.data) return this.data

    try {
      await this.ensureDataDir()
      const fileContent = await fs.readFile(this.dataPath, 'utf-8')
      this.data = JSON.parse(fileContent)
    } catch (error) {
      // 如果文件不存在或解析失败，创建默认数据
      this.data = {
        users: [],
        projects: [],
        projectAssignments: [],
        vmRecords: [],
        auditLogs: [],
        notificationLogs: []
      }
      await this.saveData()
    }

    return this.data!
  }

  private async saveData(): Promise<void> {
    if (!this.data) return
    
    await this.ensureDataDir()
    await fs.writeFile(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  // User 操作
  async findUserByEmail(email: string): Promise<User | null> {
    const data = await this.loadData()
    return data.users.find(user => user.email === email) || null
  }

  async findUserById(id: string): Promise<User | null> {
    const data = await this.loadData()
    return data.users.find(user => user.id === id) || null
  }

  async findAllUsers(): Promise<User[]> {
    const data = await this.loadData()
    return data.users
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const data = await this.loadData()
    const now = new Date().toISOString()
    const user: User = {
      id: createId(),
      ...userData,
      createdAt: now,
      updatedAt: now
    }
    data.users.push(user)
    await this.saveData()
    return user
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const data = await this.loadData()
    const userIndex = data.users.findIndex(user => user.id === id)
    if (userIndex === -1) return null

    data.users[userIndex] = {
      ...data.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    await this.saveData()
    return data.users[userIndex]
  }

  // Project 操作
  async findAllProjects(): Promise<Project[]> {
    const data = await this.loadData()
    return data.projects
  }

  async findProjectById(id: string): Promise<Project | null> {
    const data = await this.loadData()
    return data.projects.find(project => project.id === id) || null
  }

  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const data = await this.loadData()
    const now = new Date().toISOString()
    const project: Project = {
      id: createId(),
      ...projectData,
      createdAt: now,
      updatedAt: now
    }
    data.projects.push(project)
    await this.saveData()
    return project
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    const data = await this.loadData()
    const projectIndex = data.projects.findIndex(p => p.id === id)
    
    if (projectIndex === -1) return null

    const updatedProject: Project = {
      ...data.projects[projectIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    data.projects[projectIndex] = updatedProject
    await this.saveData()
    return updatedProject
  }

  async deleteProject(id: string): Promise<boolean> {
    const data = await this.loadData()
    const projectIndex = data.projects.findIndex(p => p.id === id)
    
    if (projectIndex === -1) return false

    data.projects.splice(projectIndex, 1)
    
    // Also remove all project assignments
    data.projectAssignments = data.projectAssignments.filter(pa => pa.projectId !== id)
    
    await this.saveData()
    return true
  }

  // ProjectAssignment 操作
  async findUserProjects(userId: string): Promise<Project[]> {
    const data = await this.loadData()
    const assignments = data.projectAssignments.filter(pa => pa.userId === userId)
    const projectIds = assignments.map(pa => pa.projectId)
    return data.projects.filter(project => projectIds.includes(project.id))
  }

  async findUserProjectAssignments(userId: string): Promise<ProjectAssignment[]> {
    const data = await this.loadData()
    return data.projectAssignments.filter(pa => pa.userId === userId)
  }

  async createProjectAssignment(userId: string, projectId: string): Promise<ProjectAssignment> {
    const data = await this.loadData()
    const assignment: ProjectAssignment = {
      id: createId(),
      userId,
      projectId,
      assignedAt: new Date().toISOString()
    }
    data.projectAssignments.push(assignment)
    await this.saveData()
    return assignment
  }

  async removeProjectAssignment(userId: string, projectId: string): Promise<boolean> {
    const data = await this.loadData()
    const initialLength = data.projectAssignments.length
    
    data.projectAssignments = data.projectAssignments.filter(
      pa => !(pa.userId === userId && pa.projectId === projectId)
    )
    
    if (data.projectAssignments.length === initialLength) {
      return false // No assignment was found
    }
    
    await this.saveData()
    return true
  }

  // VMRecord 操作
  async findVMsByUserPermissions(userId: string, isAdmin: boolean): Promise<VMRecord[]> {
    const data = await this.loadData()
    
    if (isAdmin) {
      return data.vmRecords
    }

    // 普通用户只能看到自己项目的VM
    const userProjects = await this.findUserProjects(userId)
    const projectIds = userProjects.map(p => p.id)
    return data.vmRecords.filter(vm => projectIds.includes(vm.projectId))
  }

  async findVMById(id: string): Promise<VMRecord | null> {
    const data = await this.loadData()
    return data.vmRecords.find(vm => vm.id === id) || null
  }

  async findAllVMs(): Promise<VMRecord[]> {
    const data = await this.loadData()
    return data.vmRecords
  }

  async createVMRecord(vmData: Omit<VMRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<VMRecord> {
    const data = await this.loadData()
    const now = new Date().toISOString()
    const vm: VMRecord = {
      id: createId(),
      ...vmData,
      createdAt: now,
      updatedAt: now
    }
    data.vmRecords.push(vm)
    await this.saveData()
    return vm
  }

  async updateVMRecord(id: string, updates: Partial<Omit<VMRecord, 'id' | 'createdAt'>>): Promise<VMRecord | null> {
    const data = await this.loadData()
    const vmIndex = data.vmRecords.findIndex(vm => vm.id === id)
    if (vmIndex === -1) return null

    data.vmRecords[vmIndex] = {
      ...data.vmRecords[vmIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    await this.saveData()
    return data.vmRecords[vmIndex]
  }

  async deleteVMRecord(id: string): Promise<boolean> {
    const data = await this.loadData()
    const vmIndex = data.vmRecords.findIndex(vm => vm.id === id)
    if (vmIndex === -1) return false

    data.vmRecords.splice(vmIndex, 1)
    await this.saveData()
    return true
  }

  // AuditLog 操作
  async createAuditLog(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const data = await this.loadData()
    const log: AuditLog = {
      id: createId(),
      ...logData,
      timestamp: new Date().toISOString()
    }
    data.auditLogs.push(log)
    await this.saveData()
    return log
  }

  async findAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      const data = await this.loadData()
      if (!data.auditLogs || data.auditLogs.length === 0) {
        return []
      }
      const sorted = data.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      return sorted.slice(0, limit)
    } catch (error) {
      console.error('Error fetching audit logs from file storage:', error)
      return []
    }
  }

  // NotificationLog 操作
  async createNotificationLog(logData: Omit<NotificationLog, 'id' | 'createdAt'>): Promise<NotificationLog> {
    const data = await this.loadData()
    const log: NotificationLog = {
      id: createId(),
      ...logData,
      createdAt: new Date().toISOString()
    }
    data.notificationLogs.push(log)
    await this.saveData()
    return log
  }

  // Initialize default data
  async initializeDefaultData(): Promise<void> {
    const data = await this.loadData()
    
    // If no users exist, create default admin
    if (data.users.length === 0) {
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
  }
}

// 单例实例
export const fileStorage = new FileStorage()