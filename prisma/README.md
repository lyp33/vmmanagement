# Database Setup

This directory contains the Prisma schema, migrations, and seed data for the VM Expiry Management System.

## Schema Overview

The database includes the following models:

- **User**: System users with roles (ADMIN/USER)
- **Project**: Projects for organizing VM resources
- **ProjectAssignment**: Many-to-many relationship between users and projects
- **VMRecord**: Virtual machine records with expiry tracking
- **AuditLog**: Operation audit trail
- **NotificationLog**: Email notification tracking

## Setup Instructions

### 1. Generate Prisma Client
```bash
npm run db:generate
```

### 2. Run Migrations
```bash
npm run db:migrate
```

### 3. Seed Database
```bash
npm run db:seed
```

## Seed Data

The seed script creates:

- **Admin User**: admin@vmmanagement.com (password: admin123)
- **Regular User**: user@vmmanagement.com (password: user123)
- **3 Sample Projects**: Web Development, Data Analytics, Mobile App Development
- **3 Sample VM Records**: One expiring in 7 days (for testing notifications)
- **Project Assignments**: Regular user assigned to 2 projects
- **Sample Audit Logs**: Initial operation records

## Migration Files

- `20240104000000_init/migration.sql`: Initial database schema creation
- `migration_lock.toml`: Migration provider lock file

## Environment Variables

Make sure to set the following in your `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/vm_expiry_management?schema=public"
```

## Development Commands

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Create and apply migrations
- `npm run db:seed` - Seed database with test data