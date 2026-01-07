"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { AdminDashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Send,
  Settings,
  AlertCircle,
  Calendar
} from "lucide-react"

interface EmailConfig {
  emailConfigured: boolean
  cronSecret: boolean
  cronSchedule: string
  notificationDaysBeforeExpiry: number
  fromEmail: string
  features: {
    autoNotifications: boolean
    manualTesting: boolean
    emailPreview: boolean
  }
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [config, setConfig] = useState<EmailConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [testEmail, setTestEmail] = useState('')
  const [testingEmail, setTestingEmail] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState('')

  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    if (isAdmin) {
      fetchConfig()
    }
  }, [isAdmin])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications/config')
      if (!response.ok) throw new Error('Failed to fetch configuration')
      
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Error fetching config:', error)
      setError('Failed to load email configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!testEmail.trim()) {
      setError('Please enter an email address')
      return
    }

    if (!/\S+@\S+\.\S+/.test(testEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setTestingEmail(true)
    setError('')
    setTestResult(null)

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      })

      const data = await response.json()

      if (data.success) {
        setTestResult({
          success: true,
          message: `Test email sent successfully to ${testEmail}. Message ID: ${data.messageId || 'N/A'}`
        })
        setTestEmail('')
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to send test email'
        })
      }
    } catch (error: any) {
      console.error('Error testing email:', error)
      setTestResult({
        success: false,
        message: error.message || 'Failed to send test email'
      })
    } finally {
      setTestingEmail(false)
    }
  }

  if (!isAdmin) {
    return (
      <AdminDashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Admin access required.
          </AlertDescription>
        </Alert>
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage email notifications and system configuration
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading configuration...</p>
          </div>
        ) : config ? (
          <>
            {/* Email Configuration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Email Configuration Status</span>
                </CardTitle>
                <CardDescription>
                  Current email notification system configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {config.emailConfigured ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">Email Service</p>
                          <p className="text-sm text-gray-600">Resend API</p>
                        </div>
                      </div>
                      <Badge className={config.emailConfigured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {config.emailConfigured ? 'Configured' : 'Not Configured'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {config.cronSecret ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">Cron Secret</p>
                          <p className="text-sm text-gray-600">Security Token</p>
                        </div>
                      </div>
                      <Badge className={config.cronSecret ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {config.cronSecret ? 'Configured' : 'Not Configured'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {config.features.autoNotifications ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-orange-600" />
                        )}
                        <div>
                          <p className="font-medium">Auto Notifications</p>
                          <p className="text-sm text-gray-600">Scheduled Emails</p>
                        </div>
                      </div>
                      <Badge className={config.features.autoNotifications ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                        {config.features.autoNotifications ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Settings className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">From Email</p>
                          <p className="text-sm text-gray-600">{config.fromEmail}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!config.emailConfigured && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Email not configured:</strong> To enable email notifications, add <code className="bg-gray-100 px-1 py-0.5 rounded">RESEND_API_KEY</code> to your environment variables. 
                        Get your API key from <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">resend.com</a>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notification Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Notification Schedule</span>
                </CardTitle>
                <CardDescription>
                  Automated notification timing and frequency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <p className="font-medium text-blue-900">Cron Schedule</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{config.cronSchedule}</p>
                      <p className="text-sm text-blue-700 mt-1">Daily at 9:00 AM UTC</p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-purple-600" />
                        <p className="font-medium text-purple-900">Notification Trigger</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{config.notificationDaysBeforeExpiry} days</p>
                      <p className="text-sm text-purple-700 mt-1">Before VM expiry</p>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription>
                      The system automatically checks for VMs expiring in {config.notificationDaysBeforeExpiry} days and sends email notifications to project members. 
                      The cron job runs daily at 9:00 AM UTC (configured in <code className="bg-gray-100 px-1 py-0.5 rounded">vercel.json</code>).
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            {/* Test Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="w-5 h-5" />
                  <span>Test Email Notification</span>
                </CardTitle>
                <CardDescription>
                  Send a test expiry notification to verify email configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTestEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testEmail">Recipient Email Address</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      disabled={testingEmail || !config.emailConfigured}
                    />
                    <p className="text-sm text-gray-500">
                      A sample VM expiry notification will be sent to this email address
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={testingEmail || !config.emailConfigured}
                  >
                    {testingEmail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Test Email
                      </>
                    )}
                  </Button>

                  {!config.emailConfigured && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Email testing is disabled because RESEND_API_KEY is not configured. Please add it to your environment variables to enable this feature.
                      </AlertDescription>
                    </Alert>
                  )}

                  {testResult && (
                    <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                        {testResult.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Email Template Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Email Template Preview</span>
                </CardTitle>
                <CardDescription>
                  Sample notification email that will be sent to users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 bg-gray-50">
                  <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl">
                    <div className="bg-gray-100 p-4 rounded-lg mb-4">
                      <h2 className="text-xl font-bold text-gray-900">🚨 VM Expiry Alert</h2>
                      <p className="text-sm text-gray-600 mt-1">This is an automated notification from the VM Expiry Management System.</p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                      <p className="text-yellow-800">
                        <strong>⚠️ Action Required:</strong> Your VM will expire in 7 days. Please take necessary action to renew or backup your data.
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h3 className="font-semibold text-gray-700 mb-3">VM Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-semibold">Project:</span> Sample Project</div>
                        <div><span className="font-semibold">VM Account:</span> vm-prod-001</div>
                        <div><span className="font-semibold">VM Domain:</span> vm-prod-001.example.com</div>
                        <div><span className="font-semibold">Internal IP:</span> 192.168.1.100</div>
                        <div><span className="font-semibold">Expiry Date:</span> <strong>January 15, 2026, 09:00 AM UTC</strong></div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-2">Please contact your system administrator if you need to:</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
                      <li>Extend the VM expiry date</li>
                      <li>Backup important data before expiry</li>
                      <li>Transfer resources to another VM</li>
                    </ul>

                    <div className="border-t pt-4 mt-4">
                      <p className="text-xs text-gray-500">
                        This is an automated message from the VM Expiry Management System. Please do not reply to this email.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        If you believe this notification was sent in error, please contact your system administrator.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Configuration Guide</span>
                </CardTitle>
                <CardDescription>
                  How to configure email notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Required Environment Variables:</h3>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm space-y-1">
                      <div><span className="text-blue-400">RESEND_API_KEY</span>=re_your_api_key_here</div>
                      <div><span className="text-blue-400">CRON_SECRET</span>=your_secure_random_string</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Setup Steps:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>Sign up for a free account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">resend.com</a></li>
                      <li>Generate an API key from your Resend dashboard</li>
                      <li>Add <code className="bg-gray-100 px-1 py-0.5 rounded">RESEND_API_KEY</code> to your Vercel environment variables</li>
                      <li>Generate a secure random string for <code className="bg-gray-100 px-1 py-0.5 rounded">CRON_SECRET</code></li>
                      <li>Redeploy your application to apply the changes</li>
                      <li>Use the test email feature above to verify configuration</li>
                    </ol>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>Note:</strong> The cron job endpoint is protected by <code className="bg-gray-100 px-1 py-0.5 rounded">CRON_SECRET</code>. 
                      Make sure to configure this in Vercel's cron job settings as well.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AdminDashboardLayout>
  )
}
