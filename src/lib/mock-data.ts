// Shared mock data store for simplified APIs
// In a real application, this would be replaced with a database

// Use global to persist data across HMR reloads in development
declare global {
  var mockDataStore: {
    users?: MockUser[]
    projects?: MockProject[]
    vms?: MockVM[]
  } | undefined
}

export interface MockUser {
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

export interface MockProject {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  _count: {
    vms: number
    userAssignments: number
  }
  vms?: Array<{
    id: string
    email: string
    vmAccount: string
    vmDomain: string
    currentExpiryDate: string
  }>
  userAssignments?: Array<{
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

export interface MockVM {
  id: string
  email: string
  vmAccount: string
  vmInternalIP: string
  vmDomain: string
  createdAt: string
  currentExpiryDate: string
  previousExpiryDate?: string
  project: {
    id: string
    name: string
  }
  createdBy: string
  updatedAt: string
}

// Initialize mock data storage with persistence across HMR
if (!global.mockDataStore) {
  global.mockDataStore = {
    users: [
      {
        id: 'admin1',
        email: 'admin@123.com',
        name: 'Administrator',
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: {
          projectAssignments: 0
        }
      }
    ],
    projects: [],
    vms: []
  }
}

// Mock data storage - always use global store
let mockUsers: MockUser[] = global.mockDataStore.users!

if (!global.mockDataStore.projects) {
  global.mockDataStore.projects = [
    {
      id: 'proj1',
      name: 'Project A',
      description: 'Partner A Development Project',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      _count: {
        vms: 2,
        userAssignments: 1
      },
      vms: [
        {
          id: 'vm1',
          email: 'user1@example.com',
          vmAccount: 'vm-user1',
          vmDomain: 'vm1.example.com',
          currentExpiryDate: '2024-04-01T00:00:00Z'
        },
        {
          id: 'vm2',
          email: 'user2@example.com',
          vmAccount: 'vm-user2',
          vmDomain: 'vm2.example.com',
          currentExpiryDate: '2024-05-01T00:00:00Z'
        }
      ],
      userAssignments: [
        {
          id: 'assign1',
          user: {
            id: 'user1',
            email: 'admin@example.com',
            name: 'System Administrator',
            role: 'ADMIN'
          },
          assignedAt: '2024-01-01T00:00:00Z'
        }
      ]
    },
    {
      id: 'proj2',
      name: 'Project B',
      description: 'Partner B Development Project',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      _count: {
        vms: 1,
        userAssignments: 2
      },
      vms: [
        {
          id: 'vm3',
          email: 'user3@example.com',
          vmAccount: 'vm-user3',
          vmDomain: 'vm3.example.com',
          currentExpiryDate: '2024-06-01T00:00:00Z'
        }
      ],
      userAssignments: [
        {
          id: 'assign2',
          user: {
            id: 'user1',
            email: 'admin@example.com',
            name: 'System Administrator',
            role: 'ADMIN'
          },
          assignedAt: '2024-01-02T00:00:00Z'
        },
        {
          id: 'assign3',
          user: {
            id: 'user2',
            email: 'user@example.com',
            name: 'Regular User',
            role: 'USER'
          },
          assignedAt: '2024-01-02T00:00:00Z'
        }
      ]
    }
  ]
}

let mockProjects: MockProject[] = global.mockDataStore.projects!

if (!global.mockDataStore.vms) {
  global.mockDataStore.vms = [
    {
      id: '1',
      email: 'user1@example.com',
      vmAccount: 'vm-user1',
      vmInternalIP: '192.168.1.10',
      vmDomain: 'vm1-updated.example.com',
      createdAt: '2024-01-01T00:00:00Z',
      currentExpiryDate: '2026-06-01T00:00:00Z',
      previousExpiryDate: '2023-12-01T00:00:00Z',
      project: {
        id: 'proj1',
        name: 'Project A'
      },
      createdBy: 'admin',
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      email: 'user2@example.com',
      vmAccount: 'vm-user2',
      vmInternalIP: '192.168.1.11',
      vmDomain: 'vm2.example.com',
      createdAt: '2024-01-02T00:00:00Z',
      currentExpiryDate: '2024-01-10T00:00:00Z',
      previousExpiryDate: '2023-10-10T00:00:00Z',
      project: {
        id: 'proj2',
        name: 'Project B'
      },
      createdBy: 'admin',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ]
}

let mockVMs: MockVM[] = global.mockDataStore.vms!

// Data access functions
export const mockData = {
  // Users
  getUsers: () => [...mockUsers],
  getUserById: (id: string) => mockUsers.find(u => u.id === id),
  createUser: (user: Omit<MockUser, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newUser: MockUser = {
      ...user,
      id: `user${mockUsers.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockUsers.push(newUser)
    return newUser
  },
  updateUser: (id: string, updates: Partial<MockUser>) => {
    const index = mockUsers.findIndex(u => u.id === id)
    if (index === -1) return null
    
    mockUsers[index] = {
      ...mockUsers[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    return mockUsers[index]
  },
  deleteUser: (id: string) => {
    const index = mockUsers.findIndex(u => u.id === id)
    if (index === -1) return false
    
    mockUsers.splice(index, 1)
    return true
  },

  // Projects
  getProjects: () => [...mockProjects],
  getProjectById: (id: string) => mockProjects.find(p => p.id === id),
  createProject: (project: Omit<MockProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProject: MockProject = {
      ...project,
      id: `proj${mockProjects.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vms: project.vms || [],
      userAssignments: project.userAssignments || []
    }
    mockProjects.push(newProject)
    return newProject
  },
  updateProject: (id: string, updates: Partial<MockProject>) => {
    const index = mockProjects.findIndex(p => p.id === id)
    if (index === -1) return null
    
    mockProjects[index] = {
      ...mockProjects[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    return mockProjects[index]
  },
  deleteProject: (id: string) => {
    const index = mockProjects.findIndex(p => p.id === id)
    if (index === -1) return false
    
    mockProjects.splice(index, 1)
    return true
  },
  assignUserToProject: (projectId: string, userId: string) => {
    const project = mockProjects.find(p => p.id === projectId)
    const user = mockUsers.find(u => u.id === userId)
    
    console.log('assignUserToProject called:', { 
      projectId, 
      userId, 
      projectFound: !!project,
      userFound: !!user,
      currentAssignments: project?.userAssignments?.map(a => ({ id: a.user.id, email: a.user.email }))
    })
    
    if (!project || !user) {
      console.log('Project or user not found')
      return null
    }
    
    // Check if user is already assigned
    if (project.userAssignments?.some(a => a.user.id === userId)) {
      console.log('User already assigned to project')
      return null // Already assigned
    }
    
    const newAssignment = {
      id: `assign${Date.now()}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      assignedAt: new Date().toISOString()
    }
    
    if (!project.userAssignments) {
      project.userAssignments = []
    }
    project.userAssignments.push(newAssignment)
    project._count.userAssignments = project.userAssignments.length
    project.updatedAt = new Date().toISOString()
    
    console.log('User assigned successfully:', newAssignment)
    
    return newAssignment
  },
  unassignUserFromProject: (projectId: string, assignmentId: string) => {
    const project = mockProjects.find(p => p.id === projectId)
    if (!project || !project.userAssignments) return false
    
    const index = project.userAssignments.findIndex(a => a.id === assignmentId)
    if (index === -1) return false
    
    project.userAssignments.splice(index, 1)
    project._count.userAssignments = project.userAssignments.length
    project.updatedAt = new Date().toISOString()
    
    return true
  },

  // VMs
  getVMs: () => [...mockVMs],
  getVMById: (id: string) => mockVMs.find(v => v.id === id),
  createVM: (vm: Omit<MockVM, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newVM: MockVM = {
      ...vm,
      id: String(mockVMs.length + 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockVMs.push(newVM)
    return newVM
  },
  updateVM: (id: string, updates: Partial<MockVM>) => {
    const index = mockVMs.findIndex(v => v.id === id)
    if (index === -1) return null
    
    mockVMs[index] = {
      ...mockVMs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    return mockVMs[index]
  },
  deleteVM: (id: string) => {
    const index = mockVMs.findIndex(v => v.id === id)
    if (index === -1) return false
    
    mockVMs.splice(index, 1)
    return true
  }
}