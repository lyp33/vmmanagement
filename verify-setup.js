// Simple verification script for the project setup
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying VM到期管理系统 setup...\n');

const checks = [
  {
    name: 'Next.js configuration',
    check: () => fs.existsSync('next.config.ts'),
  },
  {
    name: 'TypeScript configuration',
    check: () => fs.existsSync('tsconfig.json'),
  },
  {
    name: 'Tailwind CSS configuration',
    check: () => fs.existsSync('postcss.config.mjs') && 
                 fs.readFileSync('postcss.config.mjs', 'utf8').includes('@tailwindcss/postcss'),
  },
  {
    name: 'shadcn/ui configuration',
    check: () => fs.existsSync('components.json'),
  },
  {
    name: 'Prisma schema',
    check: () => fs.existsSync('prisma/schema.prisma'),
  },
  {
    name: 'Prisma configuration',
    check: () => fs.existsSync('prisma.config.ts'),
  },
  {
    name: 'NextAuth configuration',
    check: () => fs.existsSync('src/lib/auth.ts'),
  },
  {
    name: 'Prisma client setup',
    check: () => fs.existsSync('src/lib/prisma.ts'),
  },
  {
    name: 'Environment configuration',
    check: () => fs.existsSync('.env.example') && fs.existsSync('.env.local'),
  },
  {
    name: 'API routes structure',
    check: () => fs.existsSync('src/app/api/auth/[...nextauth]/route.ts'),
  },
  {
    name: 'UI components',
    check: () => fs.existsSync('src/components/ui/button.tsx'),
  },
];

let passed = 0;
let failed = 0;

checks.forEach(({ name, check }) => {
  try {
    if (check()) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} (Error: ${error.message})`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n🎉 All setup checks passed! The project is ready for development.');
  console.log('\nNext steps:');
  console.log('1. Configure your PostgreSQL database');
  console.log('2. Update .env.local with your database URL and API keys');
  console.log('3. Run: npx prisma migrate dev');
  console.log('4. Run: npm run dev');
} else {
  console.log('\n⚠️  Some setup checks failed. Please review the configuration.');
}