import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { parseCSV, validateCSVData, ImportResult } from '@/lib/csv-import';
import { safeCreateAuditLog } from '@/lib/audit-helper';

/**
 * Convert MM/DD/YYYY to ISO date string
 */
function convertToISODate(dateString: string): string {
  const parts = dateString.split('/');
  const month = parts[0].padStart(2, '0');
  const day = parts[1].padStart(2, '0');
  const year = parts[2];
  return `${year}-${month}-${day}`;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can import VMs
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can import VM records' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // Read file content
    const csvContent = await file.text();
    
    // Parse CSV
    let rows;
    try {
      rows = parseCSV(csvContent);
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Failed to parse CSV file',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file contains no data rows' },
        { status: 400 }
      );
    }

    // Get existing VM accounts for uniqueness check
    const existingVMs = await storage.findAllVMs();
    const existingVMAccounts = existingVMs.map(vm => vm.vmAccount);

    // Validate all rows
    const validationResult = validateCSVData(rows, existingVMAccounts);

    // Get all projects for project code validation
    const allProjects = await storage.findAllProjects();
    const projectMap = new Map(allProjects.map(p => [p.name, p.id]));

    // Import successful records
    const importedVMs: any[] = [];
    const importErrors: Array<{ vmAccount: string; error: string }> = [];

    for (const record of validationResult.successfulRecords) {
      try {
        // Find project by code
        const projectId = projectMap.get(record.projectCode);
        
        if (!projectId) {
          importErrors.push({
            vmAccount: record.vmAccount,
            error: `Project '${record.projectCode}' not found`
          });
          continue;
        }

        // Create VM record
        const vmData = {
          email: record.email.trim(),
          vmAccount: record.vmAccount.trim(),
          vmInternalIP: record.vmInternalIP.trim(),
          vmDomain: record.vmDomain.trim(),
          vmStartDate: new Date().toISOString(), // Set to current date
          currentExpiryDate: new Date(convertToISODate(record.currentExpiryDate)).toISOString(),
          lastExpiryDate: record.lastExpiryDate 
            ? new Date(convertToISODate(record.lastExpiryDate)).toISOString() 
            : undefined,
          projectId,
          createdBy: session.user.id
        };

        const createdVM = await storage.createVMRecord(vmData);
        importedVMs.push(createdVM);

        // Log audit entry for each VM creation
        await safeCreateAuditLog({
          operation: 'CREATE_VM',
          entityType: 'VMRecord',
          entityId: createdVM.id,
          userId: session.user.id,
          userEmail: session.user.email,
          changes: {
            source: 'CSV_IMPORT',
            fileName: file.name,
            vmAccount: record.vmAccount,
            email: record.email,
            vmDomain: record.vmDomain,
            projectCode: record.projectCode
          }
        });
      } catch (error) {
        importErrors.push({
          vmAccount: record.vmAccount,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log batch import operation summary
    await safeCreateAuditLog({
      operation: 'BATCH_IMPORT_VM',
      entityType: 'VMRecord',
      entityId: `import_${Date.now()}`,
      userId: session.user.id,
      userEmail: session.user.email,
      changes: {
        fileName: file.name,
        totalRows: validationResult.totalRows,
        successCount: importedVMs.length,
        failedCount: validationResult.failedCount + importErrors.length,
        validationErrors: validationResult.errors.length,
        importErrors: importErrors.length,
        importedVMAccounts: importedVMs.map(vm => vm.vmAccount)
      }
    });

    // Prepare response
    const response: ImportResult & { 
      importedVMs: any[];
      importErrors: any[];
    } = {
      ...validationResult,
      successCount: importedVMs.length,
      failedCount: validationResult.failedCount + importErrors.length,
      importedVMs,
      importErrors
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import VM records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to download CSV template
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { generateCSVTemplate } = await import('@/lib/csv-import');
    const template = generateCSVTemplate();

    return new NextResponse(template, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="vm-import-template.csv"'
      }
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
