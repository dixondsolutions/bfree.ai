/**
 * Simple Button Component for bFree.ai
 * Clean design with subtle hover effects
 */

'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'default' | 'lg' | 'xl'
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'default',
    loading = false,
    disabled = false,
    children, 
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading

    const baseClasses = cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      
      // Size variants
      {
        'h-8 px-3 text-xs': size === 'sm',
        'h-9 px-4 py-2': size === 'default',
        'h-10 px-6 text-base': size === 'lg',
        'h-12 px-8 text-lg': size === 'xl',
      },
      
      // Color variants
      {
        'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 hover:border-gray-300': 
          variant === 'default',
        'bg-green-600 text-white hover:bg-green-700 shadow-sm': 
          variant === 'primary',
        'bg-gray-100 text-gray-900 hover:bg-gray-200': 
          variant === 'secondary',
        'hover:bg-gray-100 hover:text-gray-900': 
          variant === 'ghost',
        'bg-red-600 text-white hover:bg-red-700 shadow-sm': 
          variant === 'destructive',
      },
      
      className
    )

    return (
      <button
        ref={ref}
        className={baseClasses}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        
        {!loading && children}
      </button>
    )
  }
)

AnimatedButton.displayName = 'AnimatedButton'

// Simplified AI Button (just green styling)
interface AIButtonProps extends Omit<AnimatedButtonProps, 'variant'> {
  thinking?: boolean
  processing?: boolean
}

export const AIButton = forwardRef<HTMLButtonElement, AIButtonProps>(
  ({ className, thinking = false, processing = false, children, ...props }, ref) => {
    const loading = thinking || processing
    
    return (
      <AnimatedButton
        ref={ref}
        variant="primary"
        loading={loading}
        className={cn(
          'bg-green-600 hover:bg-green-700',
          className
        )}
        {...props}
      >
        {children}
      </AnimatedButton>
    )
  }
)

AIButton.displayName = 'AIButton'

// Icon Button Component
interface IconButtonProps extends AnimatedButtonProps {
  icon: React.ReactNode
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, children, className, ...props }, ref) => (
    <AnimatedButton
      ref={ref}
      variant="ghost"
      size="sm"
      className={cn(
        'w-9 h-9 p-0',
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </AnimatedButton>
  )
)

IconButton.displayName = 'IconButton'

// Floating Action Button Component
interface FABProps extends Omit<AnimatedButtonProps, 'size'> {
  icon: React.ReactNode
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

export const FloatingActionButton = forwardRef<HTMLButtonElement, FABProps>(
  ({ 
    icon, 
    children, 
    className, 
    position = 'bottom-right',
    ...props 
  }, ref) => {
    const positionClasses = {
      'bottom-right': 'fixed bottom-6 right-6',
      'bottom-left': 'fixed bottom-6 left-6',
      'top-right': 'fixed top-6 right-6',
      'top-left': 'fixed top-6 left-6',
    }

    return (
      <motion.div
        className={positionClasses[position]}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={animations.transitions.springBouncy}
        variants={animations.float}
        whileHover="hover"
      >
        <AnimatedButton
          ref={ref}
          variant="primary"
          className={cn(
            'w-14 h-14 rounded-full shadow-elevation-4 hover:shadow-elevation-5',
            className
          )}
          {...props}
        >
          {icon}
          {children}
        </AnimatedButton>
      </motion.div>
    )
  }
)

FloatingActionButton.displayName = 'FloatingActionButton'

// Button Group Component
interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ children, className, orientation = 'horizontal' }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        'inline-flex',
        {
          'flex-row': orientation === 'horizontal',
          'flex-col': orientation === 'vertical',
        },
        '[&>button]:rounded-none',
        orientation === 'horizontal' 
          ? '[&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg'
          : '[&>button:first-child]:rounded-t-lg [&>button:last-child]:rounded-b-lg',
        '[&>button:not(:last-child)]:border-r-0',
        className
      )}
      initial="hidden"
      animate="visible"
      variants={animations.stagger}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={animations.staggerItem}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
)

ButtonGroup.displayName = 'ButtonGroup' 