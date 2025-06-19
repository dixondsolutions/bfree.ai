/**
 * Enhanced Animated Button Component
 * Features sophisticated animations, multiple variants, and loading states
 */

'use client'

import React, { forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { animations } from '@/lib/animations'
import { Loader2, Sparkles } from 'lucide-react'

export interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'variants'> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive' | 'ai'
  size?: 'sm' | 'default' | 'lg' | 'xl'
  loading?: boolean
  aiGlow?: boolean
  sparkle?: boolean
  disabled?: boolean
  children: React.ReactNode
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'default',
    loading = false,
    aiGlow = false,
    sparkle = false,
    disabled = false,
    children, 
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading

    const baseClasses = cn(
      // Base button styling
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
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
        // Default
        'bg-background text-foreground hover:bg-accent hover:text-accent-foreground border border-border': 
          variant === 'default',
        
        // Primary
        'bg-primary text-primary-foreground hover:bg-primary/90 shadow-elevation-2': 
          variant === 'primary',
        
        // Secondary
        'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-elevation-1': 
          variant === 'secondary',
        
        // Ghost
        'hover:bg-accent hover:text-accent-foreground': 
          variant === 'ghost',
        
        // Destructive
        'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-elevation-2': 
          variant === 'destructive',
        
        // AI-themed
        'bg-gradient-to-r from-primary via-ai-neural to-ai-electric text-white shadow-glow-primary': 
          variant === 'ai',
      },
      
      // Special effects
      {
        'hover-glow-ai': aiGlow,
        'relative overflow-hidden': sparkle,
      },
      
      className
    )

    // Animation variants
    const buttonAnimation = {
      initial: 'rest',
      whileHover: isDisabled ? 'rest' : 'hover',
      whileTap: isDisabled ? 'rest' : 'tap',
      variants: {
        rest: {
          scale: 1,
          boxShadow: variant === 'primary' || variant === 'destructive' || variant === 'ai'
            ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
            : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
        },
        hover: {
          scale: 1.02,
          boxShadow: variant === 'primary' || variant === 'destructive' || variant === 'ai'
            ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)'
            : '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          y: -1,
          transition: animations.transitions.fast,
        },
        tap: {
          scale: 0.98,
          y: 0,
          transition: { duration: 0.1 },
        },
      },
    }

    // Loading animation
    const loadingAnimation = loading ? {
      animate: 'loading',
      variants: {
        loading: {
          opacity: 0.7,
          transition: animations.transitions.fast,
        },
      },
    } : {}

    return (
      <motion.button
        ref={ref}
        className={baseClasses}
        disabled={isDisabled}
        {...buttonAnimation}
        {...loadingAnimation}
        {...props}
      >
        {/* Sparkle Effect */}
        {sparkle && !isDisabled && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={animations.transitions.fast}
          >
            <Sparkles className="absolute top-1 right-1 w-3 h-3 text-white/60" />
            <motion.div
              className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/30 rounded-full"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            />
          </motion.div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            transition={{
              opacity: animations.transitions.fast,
              rotate: {
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              },
            }}
          >
            <Loader2 className="w-4 h-4" />
          </motion.div>
        )}

        {/* Button Content */}
        <motion.span
          className={cn('flex items-center gap-2', {
            'opacity-0': loading,
          })}
          animate={loading ? { opacity: 0 } : { opacity: 1 }}
          transition={animations.transitions.fast}
        >
          {children}
        </motion.span>
      </motion.button>
    )
  }
)

AnimatedButton.displayName = 'AnimatedButton'

// Specialized AI Button Component
interface AIButtonProps extends Omit<AnimatedButtonProps, 'variant' | 'aiGlow'> {
  thinking?: boolean
  processing?: boolean
}

export const AIButton = forwardRef<HTMLButtonElement, AIButtonProps>(
  ({ className, thinking = false, processing = false, children, ...props }, ref) => {
    const status = thinking ? 'thinking' : processing ? 'processing' : 'idle'
    
    const aiAnimation = status !== 'idle' ? {
      animate: status,
      variants: animations.ai,
    } : {}

    return (
      <AnimatedButton
        ref={ref}
        variant="ai"
        aiGlow
        sparkle
        className={cn(
          'relative',
          {
            'ai-thinking': thinking,
          },
          className
        )}
        {...aiAnimation}
        {...props}
      >
        {/* Neural network effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: '-100%' }}
          animate={status === 'processing' ? { x: '100%' } : { x: '-100%' }}
          transition={{
            duration: 1.5,
            repeat: status === 'processing' ? Infinity : 0,
            ease: 'linear',
          }}
        />
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