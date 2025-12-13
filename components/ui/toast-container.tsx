'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Toast } from '@/hooks/use-toast-notification'

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-400" />
}

const bgMap = {
  success: 'from-green-900/20 to-green-900/5 border-green-700/30',
  error: 'from-red-900/20 to-red-900/5 border-red-700/30',
  info: 'from-blue-900/20 to-blue-900/5 border-blue-700/30',
  warning: 'from-yellow-900/20 to-yellow-900/5 border-yellow-700/30'
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 400, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`p-4 rounded-lg border bg-gradient-to-br ${bgMap[toast.type]} backdrop-blur-sm pointer-events-auto flex gap-3 items-start max-w-sm`}
          >
            <div className="flex-shrink-0 mt-0.5">{iconMap[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick()
                    onDismiss(toast.id)
                  }}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
