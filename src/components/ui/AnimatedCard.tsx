/**
 * Enhanced Animated Card Component
 * Combines our AI-themed design system with sophisticated Framer Motion animations
 */

'use client'

import React, { forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { animations } from '@/lib/animations'

interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  variant?: 'default' | 'glass' | 'elevated' | 'interactive'
  glow?: boolean
  aiThemed?: boolean
  staggerDelay?: number
  children: React.ReactNode
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    className, 
    variant = 'default', 
    glow = false, 
    aiThemed = false,
    staggerDelay,
    children, 
    ...props 
  }, ref) => {
    const baseClasses = cn(
      // Base card styling
      'rounded-xl border transition-colors',
      
      // Variant styling
      {
        // Default card
        'bg-card text-card-foreground shadow-elevation-2': variant === 'default',
        
        // Glass morphism card
        'glass-card': variant === 'glass',
        
        // Elevated card with enhanced shadows
        'bg-card text-card-foreground shadow-elevation-3 hover:shadow-elevation-4': 
          variant === 'elevated',
        
        // Interactive card with hover effects
        'bg-card text-card-foreground shadow-elevation-2 hover:shadow-elevation-3 cursor-pointer': 
          variant === 'interactive',
      },
      
      // Glow effects
      {
        'hover-glow': glow,
        'hover-glow-ai': aiThemed && glow,
      },
      
      className
    )

    // Animation variants based on props
    const cardAnimation = React.useMemo(() => {
      if (variant === 'interactive') {
        return {
          initial: 'rest',
          whileHover: 'hover',
          whileTap: 'tap',
          variants: animations.card,
        }
      }
      
      return {
        initial: 'hidden',
        animate: 'visible',
        exit: 'exit',
        variants: staggerDelay 
          ? animations.createDelayedAnimation(staggerDelay, animations.scale)
          : animations.scale,
      }
    }, [variant, staggerDelay])

    // AI-themed enhancements
    const aiEnhancement = aiThemed ? {
      style: {
        background: variant === 'glass' 
          ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)'
          : undefined,
      }
    } : {}

    return (
      <motion.div
        ref={ref}
        className={baseClasses}
        {...cardAnimation}
        {...aiEnhancement}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

AnimatedCard.displayName = 'AnimatedCard'

// Card Header Component
interface AnimatedCardHeaderProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
}

export const AnimatedCardHeader = forwardRef<HTMLDivElement, AnimatedCardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={animations.transitions.normal}
      {...props}
    >
      {children}
    </motion.div>
  )
)

AnimatedCardHeader.displayName = 'AnimatedCardHeader'

// Card Title Component
interface AnimatedCardTitleProps extends HTMLMotionProps<'h3'> {
  gradient?: boolean
  aiThemed?: boolean
  children: React.ReactNode
}

export const AnimatedCardTitle = forwardRef<HTMLHeadingElement, AnimatedCardTitleProps>(
  ({ className, gradient = false, aiThemed = false, children, ...props }, ref) => (
    <motion.h3
      ref={ref}
      className={cn(
        'text-2xl font-semibold leading-none tracking-tight',
        {
          'gradient-text-primary': gradient && !aiThemed,
          'gradient-text-ai': gradient && aiThemed,
        },
        className
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...animations.transitions.springSmooth, delay: 0.1 }}
      {...props}
    >
      {children}
    </motion.h3>
  )
)

AnimatedCardTitle.displayName = 'AnimatedCardTitle'

// Card Description Component
interface AnimatedCardDescriptionProps extends HTMLMotionProps<'p'> {
  children: React.ReactNode
}

export const AnimatedCardDescription = forwardRef<HTMLParagraphElement, AnimatedCardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <motion.p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...animations.transitions.springSmooth, delay: 0.2 }}
      {...props}
    >
      {children}
    </motion.p>
  )
)

AnimatedCardDescription.displayName = 'AnimatedCardDescription'

// Card Content Component
interface AnimatedCardContentProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  stagger?: boolean
}

export const AnimatedCardContent = forwardRef<HTMLDivElement, AnimatedCardContentProps>(
  ({ className, children, stagger = false, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn('p-6 pt-0', className)}
      initial={stagger ? 'hidden' : { opacity: 0, y: 10 }}
      animate={stagger ? 'visible' : { opacity: 1, y: 0 }}
      variants={stagger ? animations.stagger : undefined}
      transition={stagger ? undefined : { ...animations.transitions.springSmooth, delay: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  )
)

AnimatedCardContent.displayName = 'AnimatedCardContent'

// Card Footer Component
interface AnimatedCardFooterProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
}

export const AnimatedCardFooter = forwardRef<HTMLDivElement, AnimatedCardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...animations.transitions.springSmooth, delay: 0.4 }}
      {...props}
    >
      {children}
    </motion.div>
  )
)

AnimatedCardFooter.displayName = 'AnimatedCardFooter'

// Specialized AI Card Component
interface AICardProps extends Omit<AnimatedCardProps, 'aiThemed'> {
  status?: 'thinking' | 'processing' | 'complete' | 'idle'
  showParticles?: boolean
}

export const AICard = forwardRef<HTMLDivElement, AICardProps>(
  ({ className, status = 'idle', showParticles = false, ...props }, ref) => {
    const statusAnimation = status !== 'idle' ? {
      animate: status,
      variants: animations.ai,
    } : {}

    return (
      <div className="relative">
        {/* Floating particles for AI effect */}
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-primary/30 rounded-full"
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${30 + i * 20}%`,
                }}
                variants={animations.particle}
                animate="floating"
                transition={{
                  ...animations.particle.floating.transition,
                  delay: i * 0.5,
                }}
              />
            ))}
          </div>
        )}
        
        <AnimatedCard
          ref={ref}
          variant="glass"
          glow
          aiThemed
          className={cn(
            'relative overflow-hidden',
            {
              'ai-thinking': status === 'thinking',
            },
            className
          )}
          {...statusAnimation}
          {...props}
        />
      </div>
    )
  }
)

AICard.displayName = 'AICard'

// Status Card Component for Tasks
interface StatusCardProps extends AnimatedCardProps {
  status: 'pending' | 'in-progress' | 'done' | 'blocked'
}

export const StatusCard = forwardRef<HTMLDivElement, StatusCardProps>(
  ({ className, status, ...props }, ref) => (
    <AnimatedCard
      ref={ref}
      variant="interactive"
      className={cn(
        'transition-all duration-300',
        className
      )}
      animate={status}
      variants={animations.taskStatus}
      {...props}
    />
  )
)

StatusCard.displayName = 'StatusCard' 