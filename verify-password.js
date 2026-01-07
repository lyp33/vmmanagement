const bcrypt = require('bcryptjs');
const { storage } = require('./src/lib/storage.ts');

async function verifyPassword() {
  try {
    // Get the test user
    const user = await storage.findUserByEmail('testuser@test.com');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  Password hash:', user.password);
    
    // Test password
    const testPassword = 'test123';
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    console.log('\n🔐 Password verification:');
    console.log('  Test password:', testPassword);
    console.log('  Is valid:', isValid ? '✅ YES' : '❌ NO');
    
    // Also test with wrong password
    const wrongPassword = 'wrong123';
    const isWrong = await bcrypt.compare(wrongPassword, user.password);
    console.log('  Wrong password test:', isWrong ? '❌ FAILED (should be false)' : '✅ PASSED');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyPassword();
