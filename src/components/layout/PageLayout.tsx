import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  className?: string
  maxWidth?: 'default' | 'wide' | 'full'
  padding?: 'default' | 'tight' | 'loose'
}

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

interface PageContentProps {
  children: ReactNode
  className?: string
}

// Main Page Layout Component
export function PageLayout({ 
  children, 
  className,
  maxWidth = 'default',
  padding = 'default'
}: PageLayoutProps) {
  const maxWidthClasses = {
    default: 'max-w-7xl',
    wide: 'max-w-[1400px]',
    full: 'max-w-none'
  }

  const paddingClasses = {
    tight: 'p-4',
    default: 'p-6',
    loose: 'p-8'
  }

  return (
    <div className={cn(
      "w-full mx-auto space-y-6",
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  )
}

// Standardized Page Header
export function PageHeader({ 
  title, 
  description, 
  children, 
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

// Standardized Page Content Area
export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {children}
    </div>
  )
}

// Grid Layout for Cards/Metrics
interface PageGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PageGrid({ 
  children, 
  columns = 4, 
  gap = 'md',
  className 
}: PageGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  }

  return (
    <div className={cn(
      "grid",
      gridClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}

// Section with consistent styling
interface PageSectionProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  headerActions?: ReactNode
}

export function PageSection({ 
  title, 
  description, 
  children, 
  className,
  headerActions 
}: PageSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description || headerActions) && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg font-semibold text-foreground">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
} 