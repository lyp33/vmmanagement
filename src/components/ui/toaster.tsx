"use client"

import { useToast } from '@/providers/toast-provider'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => {
        const Icon = toast.variant === 'success' ? CheckCircle 
          : toast.variant === 'error' ? XCircle 
          : toast.variant === 'warning' ? AlertCircle 
          : Info

        const bgColor = toast.variant === 'success' ? 'bg-green-50 border-green-200' 
          : toast.variant === 'error' ? 'bg-red-50 border-red-200' 
          : toast.variant === 'warning' ? 'bg-yellow-50 border-yellow-200' 
          : 'bg-blue-50 border-blue-200'

        const iconColor = toast.variant === 'success' ? 'text-green-600' 
          : toast.variant === 'error' ? 'text-red-600' 
          : toast.variant === 'warning' ? 'text-yellow-600' 
          : 'text-blue-600'

        return (
          <div
            key={toast.id}
            className={`${bgColor} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right`}
          >
            <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              {toast.title && (
                <p className="font-semibold text-gray-900">{toast.title}</p>
              )}
              {toast.description && (
                <p className="text-sm text-gray-700 mt-1">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
