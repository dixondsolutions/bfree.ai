'use client'

import { useState, useEffect } from 'react'
import { SuggestionCard } from '@/components/ai/SuggestionCard'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AIAnalysisLoader, LoadingSpinner } from '@/components/ui/Loading'
import { PageGrid, PageSection } from '@/components/layout/PageLayout'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/Select'

interface Suggestion {
  id: string
  title: string
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'processed'
  suggestion_type: string
  confidence_score: number
  suggested_time: string | null
  created_at: string
  source_email_id: string
  feedback?: any
}

interface SuggestionsClientProps {
  initialSuggestions: Suggestion[]
}

export function SuggestionsClient({ initialSuggestions }: SuggestionsClientProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions)
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>(initialSuggestions)
  const [loading, setLoading] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Filter suggestions based on status
  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredSuggestions(suggestions)
    } else {
      setFilteredSuggestions(suggestions.filter(s => s.status === filterStatus))
    }
  }, [suggestions, filterStatus])

  const refreshSuggestions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/suggestions')
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions)
      }
    } catch (error) {
      console.error('Error refreshing suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (suggestionId: string) => {
    setProcessingIds(prev => new Set(prev).add(suggestionId))
    
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId,
          status: 'approved'
        }),
      })

      if (response.ok) {
        setSuggestions(prev => 
          prev.map(s => 
            s.id === suggestionId 
              ? { ...s, status: 'approved' as const }
              : s
          )
        )
      } else {
        console.error('Failed to approve suggestion')
      }
    } catch (error) {
      console.error('Error approving suggestion:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(suggestionId)
        return next
      })
    }
  }

  const handleReject = async (suggestionId: string) => {
    setProcessingIds(prev => new Set(prev).add(suggestionId))
    
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId,
          status: 'rejected'
        }),
      })

      if (response.ok) {
        setSuggestions(prev => 
          prev.map(s => 
            s.id === suggestionId 
              ? { ...s, status: 'rejected' as const }
              : s
          )
        )
      } else {
        console.error('Failed to reject suggestion')
      }
    } catch (error) {
      console.error('Error rejecting suggestion:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(suggestionId)
        return next
      })
    }
  }

  const generateMoreSuggestions = async () => {
    setLoading(true)
    try {
      // This would trigger AI processing of recent emails
      // For now, we'll just refresh the suggestions
      await refreshSuggestions()
    } catch (error) {
      console.error('Error generating suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Header Actions */}
      <div className="flex items-center space-x-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter suggestions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📊 All Suggestions</SelectItem>
            <SelectItem value="pending">⏳ Pending Review</SelectItem>
            <SelectItem value="approved">✅ Approved</SelectItem>
            <SelectItem value="rejected">❌ Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          size="default"
          onClick={refreshSuggestions}
          disabled={loading}
        >
          {loading ? (
            <LoadingSpinner size="xs" className="mr-2" />
          ) : (
            <span className="mr-2">🔄</span>
          )}
          Refresh
        </Button>
        <Button 
          variant="default" 
          size="default"
          onClick={generateMoreSuggestions}
          disabled={loading}
        >
          <span className="mr-2">🤖</span>
          Generate More
        </Button>
      </div>

      {/* AI Processing Status */}
      <PageSection title="AI Processing Status" description="Real-time analysis of your email content">
        <Card className="border border-neutral-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">AI Processing Status</h2>
              <LoadingSpinner size="xs" variant="primary" />
            </div>
            <p className="text-sm text-neutral-500 mt-1">Real-time analysis of your email content</p>
          </CardHeader>
          <CardContent>
            <AIAnalysisLoader />
          </CardContent>
        </Card>
      </PageSection>

      {/* Suggestions Content */}
      {filteredSuggestions.length === 0 ? (
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-success-100 to-success-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-success-600 text-3xl">🤖</span>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              {filterStatus === 'all' ? 'No AI Suggestions Yet' : `No ${filterStatus} suggestions`}
            </h3>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              {filterStatus === 'all' 
                ? "Connect Gmail and process emails to start getting AI-powered scheduling suggestions. Our AI will analyze your emails and suggest optimal meeting times."
                : `No suggestions with status "${filterStatus}" found. Try adjusting the filter or generating more suggestions.`
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="default" size="default" onClick={generateMoreSuggestions}>
                <span className="mr-2">🚀</span>
                Start AI Analysis
              </Button>
              <Button variant="outline" size="default">
                <span className="mr-2">📎</span>
                View Setup Guide
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <PageSection title="Summary Stats">
            {/* Summary Stats */}
            <PageGrid columns={4}>
              <Card className="border border-neutral-200 hover:border-success-300 transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl">📊</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900">{suggestions.length}</div>
                  <div className="text-sm text-neutral-500">Total Suggestions</div>
                </CardContent>
              </Card>
              
              <Card className="border border-neutral-200 hover:border-warning-300 transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl">⏳</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900">
                    {suggestions.filter(s => s.status === 'pending').length}
                  </div>
                  <div className="text-sm text-neutral-500">Pending Review</div>
                </CardContent>
              </Card>
              
              <Card className="border border-neutral-200 hover:border-blue-300 transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl">✅</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900">
                    {suggestions.filter(s => s.status === 'approved').length}
                  </div>
                  <div className="text-sm text-neutral-500">Approved</div>
                </CardContent>
              </Card>
              
              <Card className="border border-neutral-200 hover:border-error-300 transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-error-500 to-error-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl">🎯</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900">
                    {suggestions.length > 0 
                      ? Math.round((suggestions.reduce((sum, s) => sum + s.confidence_score, 0) / suggestions.length) * 100) 
                      : 0}%
                    </div>
                  <div className="text-sm text-neutral-500">Avg Confidence</div>
                </CardContent>
              </Card>
            </PageGrid>
          </PageSection>

          {/* Suggestions List */}
          <PageSection title="Recent Suggestions" headerActions={
            <div className="flex items-center space-x-2">
                <Badge className="bg-success-100 text-success-800 border-success-200">
                  <span className="mr-1">🤖</span>
                  AI Powered
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <span className="mr-1">⚡</span>
                  Real-time
                </Badge>
              </div>
            }>
            
            <div className="space-y-4">
              {filteredSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6">
                    <SuggestionCard
                      suggestion={suggestion}
                      onApprove={processingIds.has(suggestion.id) ? undefined : handleApprove}
                      onReject={processingIds.has(suggestion.id) ? undefined : handleReject}
                    />
                    {processingIds.has(suggestion.id) && (
                      <div className="mt-4 flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2 text-sm text-neutral-600">Processing...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </PageSection>
        </>
      )}
    </>
  )
} 