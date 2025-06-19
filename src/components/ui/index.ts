// UI Components Index
// Centralized exports for better tree-shaking and easier imports

export { Button } from './Button'
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './Card'
export { Badge } from './Badge'
export { Input } from './Input'
export { Label } from './label'
export { Textarea } from './textarea'
export { Switch } from './switch'
export { Separator } from './separator'
export { Slider } from './slider'
export { Progress } from './progress'
export { ScrollArea, ScrollBar } from './scroll-area'
export { Checkbox } from './checkbox'
export { Alert, AlertTitle, AlertDescription } from './alert'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
export { 
  Modal, 
  ModalHeader, 
  ModalContent, 
  ModalFooter, 
  ConfirmDialog,
  useModal,
  useConfirmDialog 
} from './Modal'
export { 
  ToastProvider, 
  useToast,
  type Toast,
  type ToastType 
} from './Toast'
export { 
  LoadingSpinner,
  LoadingOverlay,
  LoadingButton,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  EmailProcessingLoader,
  AIAnalysisLoader,
  CalendarSyncLoader
} from './Loading'
export {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from './Select'
export {
  MonthlyCalendar,
  WeeklyCalendar,
  DailyCalendar,
  type CalendarEvent,
  type CalendarProps
} from './Calendar'

// Enhanced UI Components with Animation System
export * from './alert'
export * from './avatar'
export * from './Badge'
export * from './Button'
export * from './Calendar'
export * from './Card'
export * from './checkbox'
export * from './dialog'
export * from './dropdown-menu'
export * from './ErrorBoundary'
export * from './Input'
export * from './label'
export * from './Loading'
export * from './Modal'
export * from './progress'
export * from './scroll-area'
export * from './Select'
export * from './separator'
export * from './sheet'
export * from './sidebar'
export * from './skeleton'
export * from './slider'
export * from './sonner'
export * from './switch'
export * from './tabs'
export * from './textarea'
export * from './Toast'
export * from './tooltip'

// Enhanced Animated Components
export * from './AnimatedCard'
export * from './AnimatedButton'

// Animation System
export { animations } from '../../lib/animations'
export type { 
  AnimatedCardProps 
} from './AnimatedCard'
export type { 
  AnimatedButtonProps 
} from './AnimatedButton'