import {
  parseCSV,
  validateEmail,
  validateDate,
  validateIP,
  validateDomain,
  validateRow,
  validateCSVData,
  generateCSVTemplate,
  type CSVRow
} from '../csv-import';

describe('CSV Import Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
      expect(validateEmail('admin+tag@company.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user.example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('should validate correct date formats', () => {
      expect(validateDate('6/30/2026')).toBe(true);
      expect(validateDate('1/1/2026')).toBe(true);
      expect(validateDate('12/31/2025')).toBe(true);
      expect(validateDate('06/30/2026')).toBe(true); // With leading zeros
      expect(validateDate('01/01/2026')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(validateDate('2026-06-30')).toBe(false); // YYYY-MM-DD format
      expect(validateDate('2026/06/30')).toBe(false);
      expect(validateDate('30-06-2026')).toBe(false);
      expect(validateDate('30/06/2026')).toBe(false); // DD/MM/YYYY format
      expect(validateDate('invalid')).toBe(false);
      expect(validateDate('')).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(validateDate('2/30/2026')).toBe(false); // February 30th doesn't exist
      expect(validateDate('13/01/2026')).toBe(false); // Month 13 doesn't exist
      expect(validateDate('0/01/2026')).toBe(false); // Month 0 doesn't exist
    });

    it('should reject dates before 2000', () => {
      expect(validateDate('12/31/1999')).toBe(false);
      expect(validateDate('1/1/1990')).toBe(false);
    });
  });

  describe('validateIP', () => {
    it('should validate correct IP addresses', () => {
      expect(validateIP('192.168.1.100')).toBe(true);
      expect(validateIP('10.0.0.1')).toBe(true);
      expect(validateIP('172.16.0.1')).toBe(true);
      expect(validateIP('0.0.0.0')).toBe(true);
      expect(validateIP('255.255.255.255')).toBe(true);
    });

    it('should reject invalid IP addresses', () => {
      expect(validateIP('192.168.1.256')).toBe(false);
      expect(validateIP('192.168.1')).toBe(false);
      expect(validateIP('abc.def.ghi.jkl')).toBe(false);
      expect(validateIP('192.168.-1.1')).toBe(false);
      expect(validateIP('')).toBe(false);
    });
  });

  describe('validateDomain', () => {
    it('should validate correct domain names', () => {
      expect(validateDomain('vm001.example.com')).toBe(true);
      expect(validateDomain('server-01.local')).toBe(true);
      expect(validateDomain('test.domain.co.uk')).toBe(true);
    });

    it('should reject invalid domain names', () => {
      expect(validateDomain('vm')).toBe(false); // Too short
      expect(validateDomain('-invalid.com')).toBe(false);
      expect(validateDomain('.example.com')).toBe(false);
      expect(validateDomain('invalid-.com')).toBe(false);
      expect(validateDomain('')).toBe(false);
    });
  });

  describe('parseCSV', () => {
    it('should parse valid CSV content', () => {
      const csvContent = `email,vmAccount,vmInternalIP,vmDomain,currentExpiryDate,projectCode,lastExpiryDate
user@example.com,vm-001,192.168.1.100,vm001.example.com,6/30/2026,PROJECT-001,3/31/2026`;

      const rows = parseCSV(csvContent);
      
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        email: 'user@example.com',
        vmAccount: 'vm-001',
        vmInternalIP: '192.168.1.100',
        vmDomain: 'vm001.example.com',
        currentExpiryDate: '6/30/2026',
        projectCode: 'PROJECT-001',
        lastExpiryDate: '3/31/2026'
      });
    });

    it('should throw error for missing required columns', () => {
      const csvContent = `email,vmAccount
user@example.com,vm-001`;

      expect(() => parseCSV(csvContent)).toThrow('Missing required columns');
    });

    it('should throw error for empty CSV', () => {
      expect(() => parseCSV('')).toThrow('must contain header and at least one data row');
      expect(() => parseCSV('email,vmAccount')).toThrow('must contain header and at least one data row');
    });

    it('should skip empty lines', () => {
      const csvContent = `email,vmAccount,vmInternalIP,vmDomain,currentExpiryDate,projectCode
user@example.com,vm-001,192.168.1.100,vm001.example.com,6/30/2026,PROJECT-001

admin@example.com,vm-002,192.168.1.101,vm002.example.com,7/15/2026,PROJECT-002`;

      const rows = parseCSV(csvContent);
      expect(rows).toHaveLength(2);
    });
  });

  describe('validateRow', () => {
    const validRow: CSVRow = {
      email: 'user@example.com',
      vmAccount: 'vm-001',
      vmInternalIP: '192.168.1.100',
      vmDomain: 'vm001.example.com',
      currentExpiryDate: '6/30/2026',
      projectCode: 'PROJECT-001',
      lastExpiryDate: '3/31/2026'
    };

    it('should return no errors for valid row', () => {
      const errors = validateRow(validRow, 2, new Set());
      expect(errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidRow = { ...validRow, email: '' };
      const errors = validateRow(invalidRow, 2, new Set());
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('email');
      expect(errors[0].error).toContain('required');
    });

    it('should detect invalid email format', () => {
      const invalidRow = { ...validRow, email: 'invalid-email' };
      const errors = validateRow(invalidRow, 2, new Set());
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'email' && e.error.includes('Invalid'))).toBe(true);
    });

    it('should detect duplicate VM account', () => {
      const existingAccounts = new Set(['vm-001']);
      const errors = validateRow(validRow, 2, existingAccounts);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'vmAccount' && e.error.includes('duplicate'))).toBe(true);
    });

    it('should detect invalid IP address', () => {
      const invalidRow = { ...validRow, vmInternalIP: '192.168.1.256' };
      const errors = validateRow(invalidRow, 2, new Set());
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'vmInternalIP')).toBe(true);
    });

    it('should detect invalid date format', () => {
      const invalidRow = { ...validRow, currentExpiryDate: '2026-06-30' }; // Wrong format
      const errors = validateRow(invalidRow, 2, new Set());
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'currentExpiryDate')).toBe(true);
    });
  });

  describe('validateCSVData', () => {
    it('should validate all rows and return results', () => {
      const rows: CSVRow[] = [
        {
          email: 'user@example.com',
          vmAccount: 'vm-001',
          vmInternalIP: '192.168.1.100',
          vmDomain: 'vm001.example.com',
          currentExpiryDate: '6/30/2026',
          projectCode: 'PROJECT-001'
        },
        {
          email: 'invalid-email',
          vmAccount: 'vm-002',
          vmInternalIP: '192.168.1.256',
          vmDomain: 'vm002.example.com',
          currentExpiryDate: '7/15/2026',
          projectCode: 'PROJECT-002'
        }
      ];

      const result = validateCSVData(rows, []);
      
      expect(result.totalRows).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.successfulRecords).toHaveLength(1);
      expect(result.failedRecords).toHaveLength(1);
    });

    it('should detect duplicates within import file', () => {
      const rows: CSVRow[] = [
        {
          email: 'user1@example.com',
          vmAccount: 'vm-001',
          vmInternalIP: '192.168.1.100',
          vmDomain: 'vm001.example.com',
          currentExpiryDate: '6/30/2026',
          projectCode: 'PROJECT-001'
        },
        {
          email: 'user2@example.com',
          vmAccount: 'vm-001', // Duplicate
          vmInternalIP: '192.168.1.101',
          vmDomain: 'vm002.example.com',
          currentExpiryDate: '7/15/2026',
          projectCode: 'PROJECT-002'
        }
      ];

      const result = validateCSVData(rows, []);
      
      expect(result.failedCount).toBe(1);
      expect(result.errors.some(e => e.error.includes('Duplicate VM Account within import file'))).toBe(true);
    });
  });

  describe('generateCSVTemplate', () => {
    it('should generate valid CSV template', () => {
      const template = generateCSVTemplate();
      
      expect(template).toContain('email,vmAccount,vmInternalIP,vmDomain,currentExpiryDate,projectCode,lastExpiryDate');
      expect(template).toContain('user@example.com');
      expect(template).toContain('vm-account-001');
      
      // Should be parseable
      const rows = parseCSV(template);
      expect(rows).toHaveLength(1);
    });
  });
});
