"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Redirecting to dashboard...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">VM Expiry Management System</CardTitle>
          <CardDescription>
            跟踪Partner虚拟机使用情况并自动发送到期提醒
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>✅ Next.js 14 with TypeScript</p>
            <p>✅ Tailwind CSS & shadcn/ui</p>
            <p>✅ Prisma ORM with PostgreSQL</p>
            <p>✅ NextAuth.js Authentication</p>
            <p>✅ Environment Configuration</p>
          </div>
          <Link href="/auth/signin">
            <Button className="w-full">
              Sign In系统
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
