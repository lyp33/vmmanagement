// CSV Import and Validation Library

export interface CSVRow {
  email: string;
  vmAccount: string;
  vmInternalIP: string;
  vmDomain: string;
  currentExpiryDate: string;
  projectCode: string;
  lastExpiryDate?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: ValidationError[];
  successfulRecords: CSVRow[];
  failedRecords: Array<{ row: number; data: CSVRow; errors: ValidationError[] }>;
}

/**
 * Parse CSV content to array of objects
 */
export function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain header and at least one data row');
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim());
  
  // Validate required columns
  const requiredColumns = ['email', 'vmAccount', 'vmInternalIP', 'vmDomain', 'currentExpiryDate', 'projectCode'];
  const missingColumns = requiredColumns.filter(col => !header.includes(col));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Parse data rows
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = line.split(',').map(v => v.trim());
    const row: any = {};
    
    header.forEach((col, index) => {
      row[col] = values[index] || '';
    });
    
    rows.push(row as CSVRow);
  }
  
  return rows;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date format (MM/DD/YYYY)
 */
export function validateDate(dateString: string): boolean {
  if (!dateString) return false;
  
  // Check for MM/DD/YYYY format
  const dateFormatRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (!dateFormatRegex.test(dateString)) {
    return false;
  }
  
  // Parse the date
  const parts = dateString.split('/');
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  // Create date object (month is 0-indexed in JavaScript)
  const date = new Date(year, month - 1, day);
  
  // Check if date is valid (handles invalid dates like 2/30/2026)
  if (isNaN(date.getTime()) || 
      date.getMonth() !== month - 1 || 
      date.getDate() !== day || 
      date.getFullYear() !== year) {
    return false;
  }
  
  // Check if date is not too far in the past (e.g., before 2000)
  const minDate = new Date(2000, 0, 1);
  if (date < minDate) {
    return false;
  }
  
  return true;
}

/**
 * Validate IP address format
 */
export function validateIP(ip: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  if (!ipRegex.test(ip)) {
    return false;
  }
  
  // Check each octet is 0-255
  const octets = ip.split('.');
  return octets.every(octet => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate domain format
 */
export function validateDomain(domain: string): boolean {
  if (!domain || domain.length < 3) return false;
  
  // Domain should not start or end with hyphen or dot
  if (domain.startsWith('-') || domain.endsWith('-') || 
      domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }
  
  // Check for consecutive special characters or invalid patterns
  if (domain.includes('--') || domain.includes('..') || domain.includes('-.') || domain.includes('.-')) {
    return false;
  }
  
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/;
  return domainRegex.test(domain);
}

/**
 * Validate a single CSV row
 */
export function validateRow(row: CSVRow, rowNumber: number, existingVMAccounts: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Required field validation
  if (!row.email || !row.email.trim()) {
    errors.push({
      row: rowNumber,
      field: 'email',
      value: row.email,
      error: 'Email is required'
    });
  } else if (!validateEmail(row.email)) {
    errors.push({
      row: rowNumber,
      field: 'email',
      value: row.email,
      error: 'Invalid email format'
    });
  }
  
  if (!row.vmAccount || !row.vmAccount.trim()) {
    errors.push({
      row: rowNumber,
      field: 'vmAccount',
      value: row.vmAccount,
      error: 'VM Account is required'
    });
  } else if (existingVMAccounts.has(row.vmAccount)) {
    errors.push({
      row: rowNumber,
      field: 'vmAccount',
      value: row.vmAccount,
      error: 'VM Account already exists (duplicate)'
    });
  }
  
  if (!row.vmInternalIP || !row.vmInternalIP.trim()) {
    errors.push({
      row: rowNumber,
      field: 'vmInternalIP',
      value: row.vmInternalIP,
      error: 'VM Internal IP is required'
    });
  } else if (!validateIP(row.vmInternalIP)) {
    errors.push({
      row: rowNumber,
      field: 'vmInternalIP',
      value: row.vmInternalIP,
      error: 'Invalid IP address format'
    });
  }
  
  if (!row.vmDomain || !row.vmDomain.trim()) {
    errors.push({
      row: rowNumber,
      field: 'vmDomain',
      value: row.vmDomain,
      error: 'VM Domain is required'
    });
  } else if (!validateDomain(row.vmDomain)) {
    errors.push({
      row: rowNumber,
      field: 'vmDomain',
      value: row.vmDomain,
      error: 'Invalid domain format'
    });
  }
  
  if (!row.currentExpiryDate || !row.currentExpiryDate.trim()) {
    errors.push({
      row: rowNumber,
      field: 'currentExpiryDate',
      value: row.currentExpiryDate,
      error: 'Current Expiry Date is required'
    });
  } else if (!validateDate(row.currentExpiryDate)) {
    errors.push({
      row: rowNumber,
      field: 'currentExpiryDate',
      value: row.currentExpiryDate,
      error: 'Invalid date format (use MM/DD/YYYY)'
    });
  }
  
  if (!row.projectCode || !row.projectCode.trim()) {
    errors.push({
      row: rowNumber,
      field: 'projectCode',
      value: row.projectCode,
      error: 'Project Code is required'
    });
  }
  
  // Optional field validation
  if (row.lastExpiryDate && row.lastExpiryDate.trim() && !validateDate(row.lastExpiryDate)) {
    errors.push({
      row: rowNumber,
      field: 'lastExpiryDate',
      value: row.lastExpiryDate,
      error: 'Invalid date format (use MM/DD/YYYY)'
    });
  }
  
  return errors;
}

/**
 * Validate all rows in CSV
 */
export function validateCSVData(rows: CSVRow[], existingVMAccounts: string[]): ImportResult {
  const existingAccountsSet = new Set(existingVMAccounts);
  const allErrors: ValidationError[] = [];
  const successfulRecords: CSVRow[] = [];
  const failedRecords: Array<{ row: number; data: CSVRow; errors: ValidationError[] }> = [];
  
  // Track VM accounts in this import to detect duplicates within the file
  const importedAccounts = new Set<string>();
  
  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because: +1 for 0-index, +1 for header row
    const rowErrors = validateRow(row, rowNumber, existingAccountsSet);
    
    // Check for duplicates within the import file
    if (row.vmAccount && importedAccounts.has(row.vmAccount)) {
      rowErrors.push({
        row: rowNumber,
        field: 'vmAccount',
        value: row.vmAccount,
        error: 'Duplicate VM Account within import file'
      });
    }
    
    if (rowErrors.length > 0) {
      allErrors.push(...rowErrors);
      failedRecords.push({
        row: rowNumber,
        data: row,
        errors: rowErrors
      });
    } else {
      successfulRecords.push(row);
      importedAccounts.add(row.vmAccount);
      existingAccountsSet.add(row.vmAccount); // Add to set to catch duplicates in subsequent rows
    }
  });
  
  return {
    success: allErrors.length === 0,
    totalRows: rows.length,
    successCount: successfulRecords.length,
    failedCount: failedRecords.length,
    errors: allErrors,
    successfulRecords,
    failedRecords
  };
}

/**
 * Generate CSV template
 */
export function generateCSVTemplate(): string {
  const headers = [
    'email',
    'vmAccount',
    'vmInternalIP',
    'vmDomain',
    'currentExpiryDate',
    'projectCode',
    'lastExpiryDate'
  ];
  
  const exampleRow = [
    'user@example.com',
    'vm-account-001',
    '192.168.1.100',
    'vm001.example.com',
    '6/30/2026',
    'PROJECT-001',
    '3/31/2026'
  ];
  
  return `${headers.join(',')}\n${exampleRow.join(',')}`;
}
