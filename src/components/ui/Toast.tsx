'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    }

    setToasts(prev => [...prev, newToast])

    // Auto remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const context = useContext(ToastContext)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !context || context.toasts.length === 0) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-100 flex flex-col space-y-2 max-w-sm w-full">
      {context.toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={context.removeToast}
        />
      ))}
    </div>,
    document.body
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { type, title, message, action } = toast

  const toastClasses = cn(
    'relative flex items-start p-4 rounded-lg shadow-lg',
    'transform transition-all duration-300 ease-in-out',
    'animate-slide-in-right',
    {
      'bg-success-50 border border-success-200': type === 'success',
      'bg-error-50 border border-error-200': type === 'error',
      'bg-warning-50 border border-warning-200': type === 'warning',
      'bg-info-50 border border-info-200': type === 'info',
    }
  )

  const iconClasses = cn(
    'flex-shrink-0 w-5 h-5 mt-0.5 mr-3',
    {
      'text-success-600': type === 'success',
      'text-error-600': type === 'error',
      'text-warning-600': type === 'warning',
      'text-info-600': type === 'info',
    }
  )

  const titleClasses = cn(
    'text-sm font-medium',
    {
      'text-success-900': type === 'success',
      'text-error-900': type === 'error',
      'text-warning-900': type === 'warning',
      'text-info-900': type === 'info',
    }
  )

  const messageClasses = cn(
    'text-sm mt-1',
    {
      'text-success-700': type === 'success',
      'text-error-700': type === 'error',
      'text-warning-700': type === 'warning',
      'text-info-700': type === 'info',
    }
  )

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  return (
    <div className={toastClasses}>
      {renderIcon()}
      
      <div className="flex-1">
        <div className={titleClasses}>
          {title}
        </div>
        {message && (
          <div className={messageClasses}>
            {message}
          </div>
        )}
        {action && (
          <div className="mt-2">
            <button
              onClick={action.onClick}
              className={cn(
                'text-sm font-medium underline hover:no-underline transition-all',
                {
                  'text-success-600 hover:text-success-700': type === 'success',
                  'text-error-600 hover:text-error-700': type === 'error',
                  'text-warning-600 hover:text-warning-700': type === 'warning',
                  'text-info-600 hover:text-info-700': type === 'info',
                }
              )}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className={cn(
          'ml-4 flex-shrink-0 text-neutral-400 hover:text-neutral-600',
          'transition-colors duration-200',
          'focus:outline-none focus:text-neutral-600'
        )}
        aria-label="Close notification"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// Custom hook for using toasts
export function useToast() {
  const context = useContext(ToastContext)
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  const toast = {
    success: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
      context.addToast({ type: 'success', title, message, ...options })
    },
    error: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
      context.addToast({ type: 'error', title, message, ...options })
    },
    warning: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
      context.addToast({ type: 'warning', title, message, ...options })
    },
    info: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
      context.addToast({ type: 'info', title, message, ...options })
    },
    custom: (toast: Omit<Toast, 'id'>) => {
      context.addToast(toast)
    },
  }

  return {
    toast,
    toasts: context.toasts,
    removeToast: context.removeToast,
    clearToasts: context.clearToasts,
  }
}