const { storage } = require('./src/lib/storage.ts');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Create user
    const user = await storage.createUser({
      email: 'testuser@test.com',
      name: 'Test User',
      password: hashedPassword,
      role: 'USER'
    });
    
    console.log('Test user created successfully:');
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();
