// UI Components Index
// Centralized exports for better tree-shaking and easier imports

export { Button } from './Button'
export { Card, CardContent, CardHeader } from './Card'
export { Badge } from './Badge'
export { Input } from './Input'
export { Textarea } from './textarea'
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
  Progress,
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