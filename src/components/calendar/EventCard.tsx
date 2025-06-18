import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Event } from '@/lib/database/utils'

interface EventCardProps {
  event: Event & {
    calendars?: {
      name: string
      provider: string
    } | null
  }
}

export function EventCard({ event }: EventCardProps) {
  const startTime = new Date(event.start_time)
  const endTime = new Date(event.end_time)
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      case 'rejected':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              {event.title}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {formatTime(startTime)} - {formatTime(endTime)}
            </p>
            {event.description && (
              <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                {event.description}
              </p>
            )}
            {event.location && (
              <p className="text-sm text-gray-500 mb-2">
                📍 {event.location}
              </p>
            )}
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusColor(event.status)} >
                {event.status}
              </Badge>
              {event.ai_generated && (
                <Badge variant="default" >
                  AI Generated
                </Badge>
              )}
              {event.calendars && (
                <Badge variant="default" >
                  {event.calendars.name}
                </Badge>
              )}
            </div>
          </div>
          {event.confidence_score && (
            <div className="text-xs text-gray-500 ml-4">
              {Math.round(event.confidence_score * 100)}% confident
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}