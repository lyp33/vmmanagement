"use client"

import { useEffect } from "react"
import { signOut } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignOutPage() {
  useEffect(() => {
    // Automatically sign out when this page loads
    signOut({ 
      callbackUrl: "/auth/signin",
      redirect: true 
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Signing Out</CardTitle>
          <CardDescription>
            You are being signed out of the VM Management System...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Please wait while we securely sign you out.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}