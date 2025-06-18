import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton as ShadcnSkeleton } from '@/components/ui/skeleton'

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Color variant */
  variant?: 'primary' | 'neutral' | 'white'
  /** Additional classes */
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'primary',
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }

  const variantClasses = {
    primary: 'text-primary-600',
    neutral: 'text-neutral-600',
    white: 'text-white',
  }

  return (
    <svg
      className={cn(
        'animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  show: boolean
  /** Loading message */
  message?: string
  /** Size of the spinner */
  spinnerSize?: 'sm' | 'md' | 'lg'
  /** Additional classes for the container */
  className?: string
  /** Custom content instead of spinner */
  children?: ReactNode
}

export function LoadingOverlay({
  show,
  message = 'Loading...',
  spinnerSize = 'lg',
  className,
  children,
}: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className={cn(
      'absolute inset-0 bg-white/80 backdrop-blur-sm',
      'flex items-center justify-center z-50',
      'animate-fade-in',
      className
    )}>
      <div className="flex flex-col items-center space-y-3">
        {children || <LoadingSpinner size={spinnerSize} />}
        {message && (
          <p className="text-sm text-neutral-600 font-medium">{message}</p>
        )}
      </div>
    </div>
  )
}

export interface LoadingButtonProps {
  /** Whether the button is in loading state */
  loading: boolean
  /** Loading text (optional) */
  loadingText?: string
  /** Size of the loading spinner */
  spinnerSize?: 'xs' | 'sm' | 'md'
  /** Button content when not loading */
  children: ReactNode
  /** Additional classes */
  className?: string
}

export function LoadingButton({
  loading,
  loadingText,
  spinnerSize = 'sm',
  children,
  className,
}: LoadingButtonProps) {
  return (
    <span className={cn('flex items-center justify-center', className)}>
      {loading && (
        <LoadingSpinner 
          size={spinnerSize} 
          variant="white"
          className="mr-2" 
        />
      )}
      {loading && loadingText ? loadingText : children}
    </span>
  )
}

export interface SkeletonProps {
  /** Width of the skeleton */
  width?: string | number
  /** Height of the skeleton */
  height?: string | number
  /** Whether it's a circular skeleton */
  circle?: boolean
  /** Number of lines for text skeleton */
  lines?: number
  /** Additional classes */
  className?: string
}

export function Skeleton({
  width,
  height = '1rem',
  circle = false,
  lines = 1,
  className,
}: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <ShadcnSkeleton
            key={index}
            className={cn(
              circle && 'rounded-full',
              index === lines - 1 && 'w-3/4',
              className
            )}
            style={index === lines - 1 ? { ...style, width: '75%' } : style}
          />
        ))}
      </div>
    )
  }

  return (
    <ShadcnSkeleton 
      className={cn(circle && 'rounded-full', className)} 
      style={style} 
    />
  )
}

export interface SkeletonCardProps {
  /** Whether to show avatar */
  showAvatar?: boolean
  /** Number of text lines */
  lines?: number
  /** Additional classes */
  className?: string
}

export function SkeletonCard({
  showAvatar = false,
  lines = 3,
  className,
}: SkeletonCardProps) {
  return (
    <div className={cn('p-4 border border-neutral-200 rounded-lg', className)}>
      <div className="flex items-start space-x-3">
        {showAvatar && (
          <Skeleton circle width={40} height={40} />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton height="1.25rem" width="60%" />
          <Skeleton lines={lines} height="1rem" />
        </div>
      </div>
    </div>
  )
}

export interface SkeletonTableProps {
  /** Number of rows */
  rows?: number
  /** Number of columns */
  columns?: number
  /** Additional classes */
  className?: string
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} height="1.5rem" width="80%" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={`row-${rowIndex}`}
          className="grid gap-3 py-2"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              height="1rem"
              width={colIndex === 0 ? '100%' : '70%'}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export interface ProgressProps {
  /** Progress value (0-100) */
  value: number
  /** Maximum value */
  max?: number
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'error'
  /** Whether to show percentage text */
  showValue?: boolean
  /** Custom label */
  label?: string
  /** Additional classes */
  className?: string
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showValue = false,
  label,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const variantClasses = {
    primary: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    error: 'bg-error-600',
  }

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-sm font-medium text-neutral-700">{label}</span>
          )}
          {showValue && (
            <span className="text-sm text-neutral-500">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      
      <div className={cn(
        'w-full bg-neutral-200 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Loading states for specific use cases
export function EmailProcessingLoader() {
  return (
    <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <LoadingSpinner size="sm" variant="primary" />
      <div>
        <p className="text-sm font-medium text-blue-900">Processing emails...</p>
        <p className="text-xs text-blue-700">Analyzing content for scheduling opportunities</p>
      </div>
    </div>
  )
}

export function AIAnalysisLoader() {
  return (
    <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <LoadingSpinner size="sm" variant="primary" />
      <div>
        <p className="text-sm font-medium text-purple-900">AI Analysis in progress...</p>
        <p className="text-xs text-purple-700">Generating intelligent scheduling suggestions</p>
      </div>
    </div>
  )
}

export function CalendarSyncLoader() {
  return (
    <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
      <LoadingSpinner size="sm" variant="primary" />
      <div>
        <p className="text-sm font-medium text-green-900">Syncing calendar...</p>
        <p className="text-xs text-green-700">Fetching events and availability</p>
      </div>
    </div>
  )
}