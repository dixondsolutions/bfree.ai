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