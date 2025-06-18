'use client'

import { ReactNode } from 'react'
import { toast as sonnerToast, Toaster } from 'sonner'

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

interface ToastProviderProps {
  children: ReactNode
}

// ToastProvider now just wraps Toaster from Sonner
export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster 
        position="top-right"
        richColors
        closeButton
        duration={5000}
        toastOptions={{
          classNames: {
            toast: 'group',
            title: 'text-sm font-semibold',
            description: 'text-sm',
            actionButton: 'bg-primary text-primary-foreground',
            cancelButton: 'bg-muted text-muted-foreground',
            closeButton: 'bg-transparent',
          },
        }}
      />
    </>
  )
}

// Custom hook for using toasts - wraps Sonner's toast API
export function useToast() {
  const toast = {
    success: (title: string, message?: string, options?: { 
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }) => {
      sonnerToast.success(title, {
        description: message,
        duration: options?.duration,
        action: options?.action ? {
          label: options.action.label,
          onClick: options.action.onClick,
        } : undefined,
      })
    },
    error: (title: string, message?: string, options?: { 
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }) => {
      sonnerToast.error(title, {
        description: message,
        duration: options?.duration,
        action: options?.action ? {
          label: options.action.label,
          onClick: options.action.onClick,
        } : undefined,
      })
    },
    warning: (title: string, message?: string, options?: { 
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }) => {
      sonnerToast.warning(title, {
        description: message,
        duration: options?.duration,
        action: options?.action ? {
          label: options.action.label,
          onClick: options.action.onClick,
        } : undefined,
      })
    },
    info: (title: string, message?: string, options?: { 
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }) => {
      sonnerToast.info(title, {
        description: message,
        duration: options?.duration,
        action: options?.action ? {
          label: options.action.label,
          onClick: options.action.onClick,
        } : undefined,
      })
    },
    custom: (content: ReactNode, options?: { 
      duration?: number;
    }) => {
      sonnerToast(content, options)
    },
  }

  return {
    toast,
    dismiss: sonnerToast.dismiss,
    dismissAll: () => sonnerToast.dismiss(),
  }
}