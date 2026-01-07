import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware'
import { AuditService } from '@/lib/audit'
import { z } from 'zod'

// 批量更新请求验证schema
const batchUpdateSchema = z.object({
  vmIds: z.array(z.string()).min(1, 'At least one VM ID is required'),
  currentExpiryDate: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, 'Invalid expiry date format')
})



// POST /api/vms/batch-update - 批量更新VM到期时间
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let validatedData: any = null

  try {
    const body = await request.json()
    validatedData = batchUpdateSchema.parse(body)

    // 验证到期时间必须是未来时间
    const expiryDate = new Date(validatedData.currentExpiryDate)
    if (expiryDate <= new Date()) {
      return NextResponse.json({ error: 'Expiry date must be in the future' }, { status: 400 })
    }

    // 获取要更新的VM记录，并检查权限
    const vmsToUpdate = await prisma.vMRecord.findMany({
      where: { id: { in: validatedData.vmIds } },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    })

    if (vmsToUpdate.length === 0) {
      return NextResponse.json({ error: 'No VMs found with the provided IDs' }, { status: 404 })
    }

    if (vmsToUpdate.length !== validatedData.vmIds.length) {
      return NextResponse.json({ error: 'Some VM IDs were not found' }, { status: 404 })
    }

    // 检查用户权限：普通用户只能更新自己项目的VM
    if (user.role !== 'ADMIN') {
      const userProjects = await prisma.projectAssignment.findMany({
        where: { userId: user.id },
        select: { projectId: true }
      })
      const userProjectIds = userProjects.map((p: any) => p.projectId)

      const unauthorizedVMs = vmsToUpdate.filter(vm => !userProjectIds.includes(vm.projectId))
      if (unauthorizedVMs.length > 0) {
        return NextResponse.json(
          { 
            error: 'Access denied to some VMs',
            unauthorizedVMs: unauthorizedVMs.map(vm => ({ id: vm.id, project: vm.project.name }))
          },
          { status: 403 }
        )
      }
    }

    // 使用事务进行批量更新，确保原子性
    const result = await prisma.$transaction(async (tx) => {
      const updatedVMs = []
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      try {
        // 批量更新所有VM记录
        for (const vm of vmsToUpdate) {
          // 保存旧的到期时间作为lastExpiryDate
          const updatedVM = await tx.vMRecord.update({
            where: { id: vm.id },
            data: {
              lastExpiryDate: vm.currentExpiryDate,
              currentExpiryDate: expiryDate,
              updatedAt: new Date()
            },
            include: {
              project: {
                select: { id: true, name: true }
              },
              creator: {
                select: { id: true, name: true, email: true }
              }
            }
          })

          updatedVMs.push(updatedVM)

          // 为每个VM记录单独的审计日志条目
          await tx.auditLog.create({
            data: {
              operation: 'BATCH_UPDATE',
              entityType: 'VM',
              entityId: vm.id,
              userId: user.id,
              userEmail: user.email,
              changes: JSON.stringify({
                operation: 'expiry_date_update',
                batchId: batchId,
                oldExpiryDate: vm.currentExpiryDate,
                newExpiryDate: expiryDate,
                lastExpiryDate: vm.currentExpiryDate
              }),
              timestamp: new Date()
            }
          })
        }

        // 记录批量操作的元数据
        await tx.auditLog.create({
          data: {
            operation: 'BATCH_OPERATION',
            entityType: 'VM_BATCH',
            entityId: batchId,
            userId: user.id,
            userEmail: user.email,
            changes: JSON.stringify({
              operation: 'batch_expiry_update',
              batchId: batchId,
              vmCount: vmsToUpdate.length,
              vmIds: validatedData.vmIds,
              newExpiryDate: expiryDate,
              timestamp: new Date()
            }),
            timestamp: new Date()
          }
        })

        return { updatedVMs, batchId }
      } catch (error) {
        // 事务会自动回滚，记录错误信息
        console.error('Batch update transaction failed:', error)
        throw new Error(`Batch update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }, {
      // 设置事务超时时间
      timeout: 30000, // 30秒
      // 设置隔离级别
      isolationLevel: 'Serializable'
    })

    // 记录批量更新的审计日志（已在事务中处理）
    // 不需要额外的审计日志记录，因为已在事务中为每个VM单独记录

    return NextResponse.json({
      message: `Successfully updated ${result.updatedVMs.length} VMs`,
      updatedVMs: result.updatedVMs,
      batchId: result.batchId,
      summary: {
        totalUpdated: result.updatedVMs.length,
        newExpiryDate: expiryDate.toISOString(),
        updatedAt: new Date().toISOString(),
        batchId: result.batchId
      }
    })

  } catch (error) {
    console.error('Error in batch update:', error)
    
    // 记录批量操作失败的审计日志
    try {
      await AuditService.logBatchOperationFailure(
        'batch_expiry_update',
        validatedData?.vmIds || [],
        error instanceof Error ? error.message : 'Unknown error',
        user?.id,
        user?.email
      )
    } catch (auditError) {
      console.error('Failed to log batch update failure:', auditError)
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    
    // 检查是否是事务超时或数据库错误
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        return NextResponse.json(
          { error: 'Batch update timed out. Please try with fewer VMs or try again later.' },
          { status: 408 }
        )
      }
      
      if (error.message.includes('Batch update failed:')) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}