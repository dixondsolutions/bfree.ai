'use client'

import { ReactNode, useEffect, useState, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when the modal should close */
  onClose: () => void
  /** Size of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Whether clicking outside closes the modal */
  closeOnOverlayClick?: boolean
  /** Whether pressing escape closes the modal */
  closeOnEscape?: boolean
  /** Additional classes for the modal container */
  className?: string
  /** The modal content */
  children: ReactNode
}

interface ModalContextValue {
  onClose: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function Modal({
  isOpen,
  onClose,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  children,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, closeOnEscape])

  if (!mounted || !isOpen) return null

  const overlayClasses = cn(
    'fixed inset-0 z-50 flex items-center justify-center',
    'bg-black/50 backdrop-blur-sm',
    'animate-fade-in'
  )

  const modalClasses = cn(
    'relative bg-white rounded-lg shadow-xl',
    'max-h-[90vh] overflow-hidden',
    'animate-scale-in',
    {
      'w-full max-w-sm': size === 'sm',
      'w-full max-w-md': size === 'md',
      'w-full max-w-lg': size === 'lg',
      'w-full max-w-4xl': size === 'xl',
      'w-full h-full max-w-none': size === 'full',
    },
    className
  )

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div className={overlayClasses} onClick={handleOverlayClick}>
      <div className={modalClasses}>
        <ModalContext.Provider value={{ onClose }}>
          {children}
        </ModalContext.Provider>
      </div>
    </div>,
    document.body
  )
}

// Modal Header Component
export interface ModalHeaderProps {
  /** The title of the modal */
  title?: string
  /** Whether to show the close button */
  showCloseButton?: boolean
  /** Additional classes */
  className?: string
  /** Custom content */
  children?: ReactNode
}

export function ModalHeader({
  title,
  showCloseButton = true,
  className,
  children,
}: ModalHeaderProps) {
  const context = useContext(ModalContext)

  return (
    <div className={cn(
      'flex items-center justify-between px-6 py-4 border-b border-neutral-200',
      className
    )}>
      <div className="flex-1">
        {title && (
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        )}
        {children}
      </div>
      
      {showCloseButton && context && (
        <button
          onClick={context.onClose}
          className={cn(
            'ml-4 text-neutral-400 hover:text-neutral-600',
            'transition-colors duration-200',
            'focus:outline-none focus:text-neutral-600'
          )}
          aria-label="Close modal"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
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
    <div className={cn('px-6 py-4 overflow-y-auto', className)}>
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
    <div className={cn(
      'flex items-center justify-end space-x-3 px-6 py-4',
      'border-t border-neutral-200 bg-neutral-50',
      className
    )}>
      {children}
    </div>
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
  confirmVariant?: 'primary' | 'secondary' | 'outline' | 'ghost'
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
  confirmVariant = 'primary',
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    if (!loading) onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title={title} showCloseButton={!loading} />
      
      <ModalContent>
        <p className="text-neutral-600">{message}</p>
      </ModalContent>
      
      <ModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={destructive ? 'outline' : confirmVariant}
          onClick={handleConfirm}
          disabled={loading}
          className={destructive ? 'border-error-300 text-error-600 hover:bg-error-50' : undefined}
        >
          {loading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading...
            </div>
          ) : (
            confirmText
          )}
        </Button>
      </ModalFooter>
    </Modal>
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