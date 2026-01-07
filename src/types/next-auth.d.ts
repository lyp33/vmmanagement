import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'ADMIN' | 'USER'
    }
  }

  interface User {
    role: 'ADMIN' | 'USER'
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: 'ADMIN' | 'USER'
  }
}