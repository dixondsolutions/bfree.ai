'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Brain, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users, 
  MapPin, 
  Calendar,
  Zap,
  TrendingUp,
  Target,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

interface AIAnalysisData {
  email_id: string
  subject: string
  from_address: string
  analyzed: boolean
  analyzed_at?: string
  has_scheduling_content: boolean
  keywords_extracted: string[]
  suggestions: Array<{
    id: string
    type: string
    title: string
    description: string
    confidence: number
    status: string
    reasoning?: string
    participants?: string[]
    location?: string
    duration?: number
    priority?: string
    created_at: string
  }>
  tasks_created: Array<{
    id: string
    title: string
    status: string
    priority: string
    confidence: number
    ai_generated: boolean
    created_at: string
  }>
  summary: {
    total_suggestions: number
    total_tasks_created: number
    avg_confidence: number
    high_confidence_suggestions: number
  }
}

interface AIAnalysisResultsProps {
  emailId: string
}

export function AIAnalysisResults({ emailId }: AIAnalysisResultsProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/emails/${emailId}/analysis`)
      if (!response.ok) {
        throw new Error('Failed to fetch analysis')
      }
      
      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      console.error('Error fetching AI analysis:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (emailId) {
      fetchAnalysis()
    }
  }, [emailId])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-300'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'processed': return 'bg-purple-100 text-purple-800'
      case 'converted': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-600 mr-2" />
            <span className="text-muted-foreground">Loading AI analysis...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchAnalysis}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) {
    return null
  }

  if (!analysis.analyzed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-gray-400" />
            AI Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Not Analyzed Yet</h3>
            <p className="text-muted-foreground mb-4">
              This email hasn't been processed by AI yet.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Analysis Results
          </CardTitle>
          <CardDescription>
            Analyzed {analysis.analyzed_at && format(new Date(analysis.analyzed_at), 'MMM d, yyyy at h:mm a')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{analysis.summary.total_suggestions}</div>
              <div className="text-sm text-muted-foreground">Suggestions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analysis.summary.total_tasks_created}</div>
              <div className="text-sm text-muted-foreground">Tasks Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(analysis.summary.avg_confidence * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{analysis.summary.high_confidence_suggestions}</div>
              <div className="text-sm text-muted-foreground">High Confidence</div>
            </div>
          </div>

          {/* Scheduling Content Status */}
          <div className="flex items-center gap-2 mb-4">
            {analysis.has_scheduling_content ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">Scheduling content detected</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">No scheduling content detected</span>
              </>
            )}
          </div>

          {/* Keywords */}
          {analysis.keywords_extracted.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Extracted Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysis.keywords_extracted.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {analysis.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              AI Suggestions ({analysis.suggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.suggestions.map((suggestion) => (
                <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{suggestion.title}</h4>
                      {suggestion.description && (
                        <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getConfidenceColor(suggestion.confidence)}>
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                      <Badge className={getStatusColor(suggestion.status)}>
                        {suggestion.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Suggestion Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {suggestion.participants && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{suggestion.participants.join(', ')}</span>
                      </div>
                    )}
                    {suggestion.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{suggestion.location}</span>
                      </div>
                    )}
                    {suggestion.duration && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{suggestion.duration} minutes</span>
                      </div>
                    )}
                  </div>

                  {/* AI Reasoning */}
                  {suggestion.reasoning && (
                    <div className="bg-gray-50 rounded p-3">
                      <h5 className="font-medium text-sm mb-1">AI Reasoning:</h5>
                      <p className="text-sm text-gray-700">{suggestion.reasoning}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Created {format(new Date(suggestion.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Created Tasks */}
      {analysis.tasks_created.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Auto-Created Tasks ({analysis.tasks_created.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.tasks_created.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>Created {format(new Date(task.created_at), 'MMM d, h:mm a')}</span>
                      {task.confidence > 0 && (
                        <span>• {Math.round(task.confidence * 100)}% confidence</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{task.priority}</Badge>
                    <Badge 
                      className={
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}