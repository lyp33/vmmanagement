import { storage, VMRecord, Project } from '@/lib/storage'

// 根据用户权限过滤VM数据
export async function filterVMsByUserPermissions(
  userId: string, 
  isAdmin: boolean,
  vms?: VMRecord[]
): Promise<VMRecord[]> {
  if (isAdmin) {
    return vms || await storage.findVMsByUserPermissions(userId, true)
  }

  return await storage.findVMsByUserPermissions(userId, false)
}

// 根据用户权限过滤项目数据
export async function filterProjectsByUserPermissions(
  userId: string,
  isAdmin: boolean,
  projects?: Project[]
): Promise<Project[]> {
  if (isAdmin) {
    return projects || await storage.findAllProjects()
  }

  return await storage.findUserProjects(userId)
}

// 检查用户是否可以访问特定VM
export async function canUserAccessVM(
  userId: string,
  isAdmin: boolean,
  vmId: string
): Promise<boolean> {
  if (isAdmin) return true

  const userVMs = await storage.findVMsByUserPermissions(userId, false)
  return userVMs.some(vm => vm.id === vmId)
}

// 检查用户是否可以访问特定项目
export async function canUserAccessProject(
  userId: string,
  isAdmin: boolean,
  projectId: string
): Promise<boolean> {
  if (isAdmin) return true

  const userProjects = await storage.findUserProjects(userId)
  return userProjects.some(project => project.id === projectId)
}

// 获取用户可访问的项目ID列表
export async function getUserProjectIds(
  userId: string,
  isAdmin: boolean
): Promise<string[]> {
  if (isAdmin) {
    const allProjects = await storage.findAllProjects()
    return allProjects.map(p => p.id)
  }

  const userProjects = await storage.findUserProjects(userId)
  return userProjects.map(p => p.id)
}
