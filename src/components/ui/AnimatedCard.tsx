/**
 * Simple Card Component for bFree.ai
 * Clean, professional design with subtle hover effects
 */

'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive'
  children: React.ReactNode
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    className, 
    variant = 'default', 
    children, 
    ...props 
  }, ref) => {
    const baseClasses = cn(
      'rounded-lg border bg-white text-card-foreground shadow-sm transition-all duration-200',
      {
        'hover:shadow-md cursor-pointer hover:border-gray-300': variant === 'interactive',
      },
      className
    )

    return (
      <div
        ref={ref}
        className={baseClasses}
        {...props}
      >
        {children}
      </div>
    )
  }
)

AnimatedCard.displayName = 'AnimatedCard'

// Card Header Component
interface AnimatedCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const AnimatedCardHeader = forwardRef<HTMLDivElement, AnimatedCardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    >
      {children}
    </div>
  )
)

AnimatedCardHeader.displayName = 'AnimatedCardHeader'

// Card Title Component
interface AnimatedCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

export const AnimatedCardTitle = forwardRef<HTMLHeadingElement, AnimatedCardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-2xl font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
)

AnimatedCardTitle.displayName = 'AnimatedCardTitle'

// Card Description Component  
interface AnimatedCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export const AnimatedCardDescription = forwardRef<HTMLParagraphElement, AnimatedCardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    >
      {children}
    </p>
  )
)

AnimatedCardDescription.displayName = 'AnimatedCardDescription'

// Card Content Component
interface AnimatedCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const AnimatedCardContent = forwardRef<HTMLDivElement, AnimatedCardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-6 pt-0', className)}
      {...props}
    >
      {children}
    </div>
  )
)

AnimatedCardContent.displayName = 'AnimatedCardContent'

// Simplified AI Card (just a clean card with green accent)
interface AICardProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: 'idle' | 'thinking' | 'processing'
}

export const AICard = forwardRef<HTMLDivElement, AICardProps>(
  ({ className, status = 'idle', ...props }, ref) => {
    return (
      <AnimatedCard
        ref={ref}
        variant="interactive"
        className={cn(
          'border-gray-200 bg-white',
          {
            'border-green-200 bg-green-50/30': status !== 'idle',
          },
          className
        )}
        {...props}
      />
    )
  }
)

AICard.displayName = 'AICard' 