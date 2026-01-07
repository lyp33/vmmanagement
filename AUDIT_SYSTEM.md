# Audit Logging System

The VM Expiry Management system includes a comprehensive audit logging system that automatically tracks all data modifications and provides admin access to view audit logs.

## Features

### Automatic Logging
The audit system automatically logs the following operations:
- VM creation, updates, and deletion
- Project creation, updates, and deletion
- User-to-project assignments and unassignments
- Batch VM operations
- VM renewals
- Notification events

### Audit Service

The `AuditService` class provides methods for:
- Logging operations with user context
- Retrieving audit logs with filtering
- Specialized logging methods for different entity types

#### Key Methods

```typescript
// Generic operation logging
AuditService.logOperation(operation, userId?, userEmail?)

// Specialized VM logging
AuditService.logVMCreation(vmId, vmData, userId?, userEmail?)
AuditService.logVMUpdate(vmId, oldData, newData, userId?, userEmail?)
AuditService.logVMDeletion(vmId, vmData, userId?, userEmail?)
AuditService.logBatchVMUpdate(vmIds, changes, userId?, userEmail?)

// Project logging
AuditService.logProjectCreation(projectId, projectData, userId?, userEmail?)
AuditService.logProjectUpdate(projectId, oldData, newData, userId?, userEmail?)
AuditService.logProjectDeletion(projectId, projectData, userId?, userEmail?)

// Assignment logging
AuditService.logProjectAssignment(userId, projectId, assignmentData, operatorUserId?, operatorUserEmail?)

// Retrieve logs with filtering
AuditService.getAuditLogs(filters)
```

### API Endpoints

#### GET /api/audit
Retrieve audit logs (Admin only)

**Query Parameters:**
- `startDate`: Filter logs after this date (ISO format)
- `endDate`: Filter logs before this date (ISO format)
- `operation`: Filter by operation type (CREATE, UPDATE, DELETE, etc.)
- `entityType`: Filter by entity type (VM, PROJECT, etc.)
- `userId`: Filter by specific user ID
- `userEmail`: Filter by user email (partial match)
- `page`: Page number for pagination (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `sortBy`: Sort by field (timestamp, operation, entityType, userEmail)
- `sortOrder`: Sort order (asc, desc)

**Response:**
```json
{
  "data": [
    {
      "id": "audit-log-id",
      "operation": "CREATE",
      "entityType": "VM",
      "entityId": "vm-123",
      "userId": "user-123",
      "userEmail": "user@example.com",
      "user": {
        "name": "User Name",
        "email": "user@example.com",
        "role": "USER"
      },
      "changes": {
        "created": {
          "email": "vm@example.com",
          "vmAccount": "account123"
        }
      },
      "timestamp": "2024-01-04T10:00:00Z",
      "ipAddress": "192.168.1.1"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  },
  "summary": {
    "totalLogs": 100,
    "dateRange": {
      "earliest": "2024-01-01T00:00:00Z",
      "latest": "2024-01-04T10:00:00Z"
    },
    "operationTypes": ["CREATE", "UPDATE", "DELETE"],
    "entityTypes": ["VM", "PROJECT"],
    "uniqueUsers": ["user1@example.com", "user2@example.com"]
  }
}
```

### Permission Requirements

- **Admin Users**: Full access to all audit logs
- **Regular Users**: No access to audit logs (403 Forbidden)

### Data Stored

Each audit log entry contains:
- **operation**: Type of operation (CREATE, UPDATE, DELETE, BATCH_UPDATE, etc.)
- **entityType**: Type of entity affected (VM, PROJECT, PROJECT_ASSIGNMENT)
- **entityId**: ID of the affected entity
- **userId**: ID of the user who performed the operation
- **userEmail**: Email of the user who performed the operation
- **changes**: JSON object containing the changes made
- **timestamp**: When the operation occurred
- **ipAddress**: IP address of the request (when available)

### Integration

The audit system is automatically integrated into all existing API endpoints:
- `/api/vms/*` - VM operations
- `/api/projects/*` - Project operations
- `/api/vms/batch-update` - Batch operations

No additional configuration is required. The system will:
1. Automatically detect the current user from the session
2. Log operations with appropriate context
3. Handle errors gracefully without breaking the main operation

### Error Handling

The audit system is designed to be non-intrusive:
- Audit logging failures will not break the main operation
- Errors are logged to the console for debugging
- The system falls back to 'system' user if no session is available

### Maintenance

The audit system includes a cleanup method for old logs:
```typescript
AuditService.cleanupOldLogs(daysToKeep = 365)
```

This can be called periodically to maintain database performance.