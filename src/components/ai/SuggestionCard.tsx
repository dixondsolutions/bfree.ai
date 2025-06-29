import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { AiSuggestion } from '@/lib/database/utils'

interface SuggestionCardProps {
  suggestion: AiSuggestion
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

export function SuggestionCard({ suggestion, onApprove, onReject }: SuggestionCardProps) {
  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return { variant: 'secondary' as const, label: 'High Confidence' }
    if (score >= 0.6) return { variant: 'secondary' as const, label: 'Medium Confidence' }
    return { variant: 'destructive' as const, label: 'Low Confidence' }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { variant: 'secondary' as const, label: 'Approved' }
      case 'rejected':
        return { variant: 'destructive' as const, label: 'Rejected' }
      case 'processed':
        return { variant: 'default' as const, label: 'Processed' }
      default:
        return { variant: 'default' as const, label: 'Pending' }
    }
  }

  const confidenceBadge = getConfidenceBadge(suggestion.confidence_score)
  const statusBadge = getStatusBadge(suggestion.status)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {suggestion.title}
            </h3>
            <div className="flex items-center space-x-2">
              <Badge variant={confidenceBadge.variant} >
                {confidenceBadge.label}
              </Badge>
              <Badge variant={statusBadge.variant} >
                {statusBadge.label}
              </Badge>
              <Badge variant="default" >
                {suggestion.suggestion_type}
              </Badge>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {Math.round(suggestion.confidence_score * 100)}% confident
          </div>
        </div>
      </CardHeader>

      {suggestion.description && (
        <CardContent>
          <p className="text-gray-600">{suggestion.description}</p>
          {suggestion.suggested_time && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">Suggested Time:</p>
              <p className="text-sm text-gray-600">
                {(() => {
                  try {
                    const date = new Date(suggestion.suggested_time)
                    if (isNaN(date.getTime())) {
                      return 'Time not specified'
                    }
                    return date.toLocaleString()
                  } catch (error) {
                    return 'Time not specified'
                  }
                })()}
              </p>
            </div>
          )}
        </CardContent>
      )}

      {suggestion.status === 'pending' && (onApprove || onReject) && (
        <CardFooter>
          <div className="flex space-x-3">
            {onApprove && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onApprove(suggestion.id)}
              >
                Approve
              </Button>
            )}
            {onReject && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(suggestion.id)}
              >
                Reject
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}