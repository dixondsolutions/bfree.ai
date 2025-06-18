'use client'

import { ReactNode, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from './Button'
import { cn } from '@/lib/utils'

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when the modal should close */
  onClose: () => void
  /** Size of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Additional classes for the modal container */
  className?: string
  /** The modal content */
  children: ReactNode
}

export function Modal({
  isOpen,
  onClose,
  size = 'md',
  className,
  children,
}: ModalProps) {
  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-full sm:h-full',
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(sizeClasses[size], className)}>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// Modal Header Component for backward compatibility
export interface ModalHeaderProps {
  /** The title of the modal */
  title?: string
  /** Whether to show the close button (handled automatically by shadcn/ui) */
  showCloseButton?: boolean
  /** Additional classes */
  className?: string
  /** Custom content */
  children?: ReactNode
}

export function ModalHeader({
  title,
  className,
  children,
}: ModalHeaderProps) {
  return (
    <DialogHeader className={className}>
      {title && <DialogTitle>{title}</DialogTitle>}
      {children}
    </DialogHeader>
  )
}

// Modal Content Component
export interface ModalContentProps {
  /** Additional classes */
  className?: string
  /** The content */
  children: ReactNode
}

export function ModalContent({ className, children }: ModalContentProps) {
  return (
    <div className={cn('py-4', className)}>
      {children}
    </div>
  )
}

// Modal Footer Component
export interface ModalFooterProps {
  /** Additional classes */
  className?: string
  /** The footer content */
  children: ReactNode
}

export function ModalFooter({ className, children }: ModalFooterProps) {
  return (
    <DialogFooter className={className}>
      {children}
    </DialogFooter>
  )
}

// Confirm Dialog Component
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when the dialog should close */
  onClose: () => void
  /** Callback when confirm is clicked */
  onConfirm: () => void
  /** The title of the dialog */
  title: string
  /** The message to display */
  message: string
  /** The confirm button text */
  confirmText?: string
  /** The cancel button text */
  cancelText?: string
  /** The variant of the confirm button */
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  /** Whether the confirm action is destructive */
  destructive?: boolean
  /** Whether the confirm button is loading */
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'default',
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    if (!loading) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={destructive ? 'destructive' : confirmVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Custom hook for modal state management
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(prev => !prev)

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}

// Custom hook for confirm dialog
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<Partial<ConfirmDialogProps>>({})

  const confirm = (dialogConfig: Partial<ConfirmDialogProps>) => {
    setConfig(dialogConfig)
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setConfig({})
  }

  return {
    isOpen,
    confirm,
    close,
    config,
  }
}