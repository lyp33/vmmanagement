import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { storage } from "@/lib/storage"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('🔐 Authorization attempt:', { email: credentials?.email });
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null
        }

        try {
          console.log('🔍 Looking up user:', credentials.email);
          const user = await storage.findUserByEmail(credentials.email)

          if (!user) {
            console.log('❌ User not found:', credentials.email);
            return null
          }
          
          if (!user.password) {
            console.log('❌ User has no password:', credentials.email);
            return null
          }

          console.log('✅ User found:', { email: user.email, role: user.role });
          
          // Verify password
          console.log('🔐 Verifying password...');
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          
          console.log('🔐 Password valid:', isPasswordValid);
          
          if (!isPasswordValid) {
            console.log('❌ Invalid password for:', credentials.email);
            return null
          }

          console.log('✅ Authentication successful:', { email: user.email, role: user.role });
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error("❌ Authentication error:", error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as 'ADMIN' | 'USER'
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
  },
  events: {
    async signOut({ token }) {
      // Log signout event
      console.log(`User ${token?.email} signed out at ${new Date().toISOString()}`)
    },
    async signIn({ user }) {
      // Log signin event
      console.log(`User ${user.email} signed in at ${new Date().toISOString()}`)
    },
  },
}