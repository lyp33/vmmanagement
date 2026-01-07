import bcrypt from 'bcryptjs'

describe('Authentication System', () => {
  test('should hash and verify passwords correctly', async () => {
    const password = 'testpassword123'
    const hashedPassword = await bcrypt.hash(password, 10)
    
    expect(hashedPassword).toBeTruthy()
    expect(hashedPassword).not.toBe(password)
    
    const isValid = await bcrypt.compare(password, hashedPassword)
    expect(isValid).toBe(true)
    
    const isInvalid = await bcrypt.compare('wrongpassword', hashedPassword)
    expect(isInvalid).toBe(false)
  })

  test('should generate different hashes for same password', async () => {
    const password = 'testpassword123'
    const hash1 = await bcrypt.hash(password, 10)
    const hash2 = await bcrypt.hash(password, 10)
    
    expect(hash1).not.toBe(hash2)
    
    // But both should verify correctly
    expect(await bcrypt.compare(password, hash1)).toBe(true)
    expect(await bcrypt.compare(password, hash2)).toBe(true)
  })
})