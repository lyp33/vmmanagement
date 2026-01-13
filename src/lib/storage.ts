// Unified storage interface that switches between file storage (dev) and KV (production)

import type {
  User,
  Project,
  ProjectAssignment,
  VMRecord,
  AuditLog,
  NotificationLog
} from './file-storage'

// Check if KV is available (production)
const isKVAvailable = () => {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
}

// Dynamic import based on environment
const getStorage = async () => {
  if (isKVAvailable()) {
    const { kvStorage } = await import('./kv-storage')
    return kvStorage
  } else {
    const { fileStorage } = await import('./file-storage')
    return fileStorage
  }
}

// Storage interface
export interface IStorage {
  // User operations
  findUserByEmail(email: string): Promise<User | null>
  findUserById(id: string): Promise<User | null>
  findAllUsers(): Promise<User[]>
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null>
  deleteUser(id: string): Promise<boolean>
  
  // Project operations
  findAllProjects(): Promise<Project[]>
  findProjectById(id: string): Promise<Project | null>
  createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>
  updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null>
  deleteProject(id: string): Promise<boolean>
  
  // ProjectAssignment operations
  findUserProjects(userId: string): Promise<Project[]>
  findUserProjectAssignments(userId: string): Promise<ProjectAssignment[]>
  createProjectAssignment(userId: string, projectId: string): Promise<ProjectAssignment>
  removeProjectAssignment(userId: string, projectId: string): Promise<boolean>
  
  // VMRecord operations
  findVMsByUserPermissions(userId: string, isAdmin: boolean): Promise<VMRecord[]>
  findVMById(id: string): Promise<VMRecord | null>
  findAllVMs(): Promise<VMRecord[]>
  createVMRecord(vmData: Omit<VMRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<VMRecord>
  updateVMRecord(id: string, updates: Partial<Omit<VMRecord, 'id' | 'createdAt'>>): Promise<VMRecord | null>
  deleteVMRecord(id: string): Promise<boolean>
  
  // AuditLog operations
  createAuditLog(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>
  findAuditLogs(limit?: number): Promise<AuditLog[]>
  
  // NotificationLog operations
  createNotificationLog(logData: Omit<NotificationLog, 'id' | 'createdAt'>): Promise<NotificationLog>
  
  // Initialize
  initializeDefaultData(): Promise<void>
}

// Wrapper class that delegates to the appropriate storage
class StorageWrapper implements IStorage {
  private async getImpl() {
    return await getStorage()
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const storage = await this.getImpl()
    return storage.findUserByEmail(email)
  }

  async findUserById(id: string): Promise<User | null> {
    const storage = await this.getImpl()
    return storage.findUserById(id)
  }

  async findAllUsers(): Promise<User[]> {
    const storage = await this.getImpl()
    return storage.findAllUsers()
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const storage = await this.getImpl()
    return storage.createUser(userData)
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const storage = await this.getImpl()
    return storage.updateUser(id, updates)
  }

  async deleteUser(id: string): Promise<boolean> {
    const storage = await this.getImpl()
    return storage.deleteUser(id)
  }

  async findAllProjects(): Promise<Project[]> {
    const storage = await this.getImpl()
    return storage.findAllProjects()
  }

  async findProjectById(id: string): Promise<Project | null> {
    const storage = await this.getImpl()
    return storage.findProjectById(id)
  }

  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const storage = await this.getImpl()
    return storage.createProject(projectData)
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    const storage = await this.getImpl()
    return storage.updateProject(id, updates)
  }

  async deleteProject(id: string): Promise<boolean> {
    const storage = await this.getImpl()
    return storage.deleteProject(id)
  }

  async findUserProjects(userId: string): Promise<Project[]> {
    const storage = await this.getImpl()
    return storage.findUserProjects(userId)
  }

  async findUserProjectAssignments(userId: string): Promise<ProjectAssignment[]> {
    const storage = await this.getImpl()
    return storage.findUserProjectAssignments(userId)
  }

  async createProjectAssignment(userId: string, projectId: string): Promise<ProjectAssignment> {
    const storage = await this.getImpl()
    return storage.createProjectAssignment(userId, projectId)
  }

  async removeProjectAssignment(userId: string, projectId: string): Promise<boolean> {
    const storage = await this.getImpl()
    return storage.removeProjectAssignment(userId, projectId)
  }

  async findVMsByUserPermissions(userId: string, isAdmin: boolean): Promise<VMRecord[]> {
    const storage = await this.getImpl()
    return storage.findVMsByUserPermissions(userId, isAdmin)
  }

  async findVMById(id: string): Promise<VMRecord | null> {
    const storage = await this.getImpl()
    return storage.findVMById(id)
  }

  async findAllVMs(): Promise<VMRecord[]> {
    const storage = await this.getImpl()
    return storage.findAllVMs()
  }

  async createVMRecord(vmData: Omit<VMRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<VMRecord> {
    const storage = await this.getImpl()
    return storage.createVMRecord(vmData)
  }

  async updateVMRecord(id: string, updates: Partial<Omit<VMRecord, 'id' | 'createdAt'>>): Promise<VMRecord | null> {
    const storage = await this.getImpl()
    return storage.updateVMRecord(id, updates)
  }

  async deleteVMRecord(id: string): Promise<boolean> {
    const storage = await this.getImpl()
    return storage.deleteVMRecord(id)
  }

  async createAuditLog(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const storage = await this.getImpl()
    return storage.createAuditLog(logData)
  }

  async findAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    const storage = await this.getImpl()
    return storage.findAuditLogs(limit)
  }

  async createNotificationLog(logData: Omit<NotificationLog, 'id' | 'createdAt'>): Promise<NotificationLog> {
    const storage = await this.getImpl()
    return storage.createNotificationLog(logData)
  }

  async initializeDefaultData(): Promise<void> {
    const storage = await this.getImpl()
    return storage.initializeDefaultData()
  }
}

// Export singleton
export const storage = new StorageWrapper()

// Export types
export type {
  User,
  Project,
  ProjectAssignment,
  VMRecord,
  AuditLog,
  NotificationLog
}

// Helper to check which storage is being used
export const getStorageType = (): 'kv' | 'file' => {
  return isKVAvailable() ? 'kv' : 'file'
}
