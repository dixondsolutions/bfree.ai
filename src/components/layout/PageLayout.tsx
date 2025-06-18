import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  className?: string
  maxWidth?: 'default' | 'wide' | 'full'
  padding?: 'default' | 'tight' | 'loose'
  density?: 'compact' | 'default' | 'spacious'
}

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
  compact?: boolean
}

interface PageContentProps {
  children: ReactNode
  className?: string
}

// Main Page Layout Component - Desktop First
export function PageLayout({ 
  children, 
  className,
  maxWidth = 'wide',
  padding = 'default',
  density = 'default'
}: PageLayoutProps) {
  const maxWidthClasses = {
    default: 'max-w-7xl',
    wide: 'max-w-[1600px]', // Increased for better desktop utilization
    full: 'max-w-none'
  }

  const paddingClasses = {
    tight: 'px-4 py-3 md:px-6 md:py-4',
    default: 'px-6 py-4 md:px-8 md:py-6', // Desktop-first padding
    loose: 'px-8 py-6 md:px-12 md:py-8'
  }

  const densityClasses = {
    compact: 'space-y-3',
    default: 'space-y-4',
    spacious: 'space-y-6'
  }

  return (
    <div className={cn(
      "w-full mx-auto",
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      densityClasses[density],
      className
    )}>
      {children}
    </div>
  )
}

// Standardized Page Header - Desktop Optimized
export function PageHeader({ 
  title, 
  description, 
  children, 
  className,
  compact = false
}: PageHeaderProps) {
  return (
    <div className={cn("", className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <h1 className={cn(
            "font-bold tracking-tight text-foreground leading-tight",
            compact ? "text-2xl" : "text-3xl xl:text-4xl"
          )}>
            {title}
          </h1>
          {description && (
            <p className={cn(
              "text-muted-foreground max-w-4xl leading-relaxed",
              compact ? "text-sm mt-1" : "text-base mt-2"
            )}>
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3 flex-shrink-0">
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

// Enhanced Grid Layout for Desktop-First Design
interface PageGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  responsive?: boolean
}

export function PageGrid({ 
  children, 
  columns = 4, 
  gap = 'md',
  className,
  responsive = true
}: PageGridProps) {
  // Desktop-first responsive grid classes
  const gridClasses = {
    1: 'grid-cols-1',
    2: responsive ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-2',
    3: responsive ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' : 'grid-cols-3',
    4: responsive ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4' : 'grid-cols-4',
    5: responsive ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid-cols-5',
    6: responsive ? 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' : 'grid-cols-6'
  }

  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
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

// Section with enhanced desktop layout
interface PageSectionProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  headerActions?: ReactNode
  layout?: 'default' | 'sidebar' | 'split'
  compact?: boolean
}

export function PageSection({ 
  title, 
  description, 
  children, 
  className,
  headerActions,
  layout = 'default',
  compact = false
}: PageSectionProps) {
  const sectionContent = (
    <>
      {(title || description || headerActions) && (
        <div className={cn(
          "flex items-start justify-between gap-4",
          compact ? "mb-3" : "mb-4"
        )}>
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className={cn(
                "font-semibold text-foreground leading-tight",
                compact ? "text-lg" : "text-xl"
              )}>
                {title}
              </h2>
            )}
            {description && (
              <p className={cn(
                "text-muted-foreground",
                compact ? "text-sm mt-0.5" : "text-sm mt-1"
              )}>
                {description}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      )}
      {children}
    </>
  )

  if (layout === 'sidebar') {
    return (
      <div className={cn("lg:grid lg:grid-cols-4 lg:gap-8", className)}>
        <div className="lg:col-span-1 mb-4 lg:mb-0">
          {title && (
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
          {headerActions && (
            <div className="mt-4">
              {headerActions}
            </div>
          )}
        </div>
        <div className="lg:col-span-3">
          {children}
        </div>
      </div>
    )
  }

  if (layout === 'split') {
    return (
      <div className={cn("lg:grid lg:grid-cols-2 lg:gap-8", className)}>
        <div>
          {title && (
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mb-4">
              {description}
            </p>
          )}
        </div>
        <div>
          {headerActions && (
            <div className="flex justify-end mb-4">
              {headerActions}
            </div>
          )}
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {sectionContent}
    </div>
  )
}

// New: Dashboard-specific layouts
export function DashboardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "grid gap-4 lg:gap-6",
      "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
      className
    )}>
      {children}
    </div>
  )
}

export function DashboardSection({ 
  title, 
  children, 
  className,
  actions
}: { 
  title: string
  children: ReactNode
  className?: string
  actions?: ReactNode 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
} 