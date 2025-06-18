'use client'

import { useState, useRef, useEffect, ReactNode, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
}

export interface SelectProps {
  /** Available options */
  options: SelectOption[]
  /** Selected value(s) */
  value?: string | string[]
  /** Default value */
  defaultValue?: string | string[]
  /** Callback when selection changes */
  onChange: (value: string | string[]) => void
  /** Whether multiple selection is allowed */
  multiple?: boolean
  /** Whether the select is searchable */
  searchable?: boolean
  /** Whether the select is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Label for the select */
  label?: string
  /** Error message */
  error?: string
  /** Help text */
  helpText?: string
  /** Whether the field is required */
  required?: boolean
  /** Maximum height of the dropdown */
  maxHeight?: string
  /** Whether to allow creating new options */
  creatable?: boolean
  /** Loading state */
  loading?: boolean
  /** Empty message when no options found */
  emptyMessage?: string
  /** Additional classes */
  className?: string
  /** Additional classes for the container */
  containerClassName?: string
}

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  multiple = false,
  searchable = false,
  disabled = false,
  placeholder = 'Select an option...',
  label,
  error,
  helpText,
  required,
  maxHeight = '200px',
  creatable = false,
  loading = false,
  emptyMessage = 'No options found',
  className,
  containerClassName,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    const initialValue = value || defaultValue
    if (!initialValue) return []
    return Array.isArray(initialValue) ? initialValue : [initialValue]
  })
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  // Add create option if creatable and query doesn't match existing options
  const finalOptions = [...filteredOptions]
  if (creatable && searchQuery && !filteredOptions.some(option => 
    option.label.toLowerCase() === searchQuery.toLowerCase()
  )) {
    finalOptions.unshift({
      value: searchQuery,
      label: `Create "${searchQuery}"`,
      description: 'Create new option',
    })
  }

  // Update internal state when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValues(Array.isArray(value) ? value : [value])
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (isOpen && focusedIndex >= 0 && focusedIndex < finalOptions.length) {
          handleOptionSelect(finalOptions[focusedIndex])
        } else {
          setIsOpen(!isOpen)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSearchQuery('')
        setFocusedIndex(-1)
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setFocusedIndex(prev => 
            prev < finalOptions.length - 1 ? prev + 1 : 0
          )
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : finalOptions.length - 1
          )
        }
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  // Handle option selection
  const handleOptionSelect = (option: SelectOption) => {
    if (option.disabled) return

    let newSelectedValues: string[]

    if (multiple) {
      if (selectedValues.includes(option.value)) {
        newSelectedValues = selectedValues.filter(v => v !== option.value)
      } else {
        newSelectedValues = [...selectedValues, option.value]
      }
    } else {
      newSelectedValues = [option.value]
      setIsOpen(false)
    }

    setSelectedValues(newSelectedValues)
    onChange(multiple ? newSelectedValues : newSelectedValues[0] || '')
    
    if (searchable) {
      setSearchQuery('')
    }
    setFocusedIndex(-1)
  }

  // Remove selected option
  const handleRemoveOption = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelectedValues = selectedValues.filter(v => v !== valueToRemove)
    setSelectedValues(newSelectedValues)
    onChange(multiple ? newSelectedValues : '')
  }

  // Get display text for selected options
  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder

    if (multiple) {
      return `${selectedValues.length} selected`
    }

    const selectedOption = options.find(opt => opt.value === selectedValues[0])
    return selectedOption?.label || selectedValues[0]
  }

  // Get selected option objects
  const selectedOptions = selectedValues
    .map(value => options.find(opt => opt.value === value))
    .filter(Boolean) as SelectOption[]

  const selectId = `select-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={cn('relative', containerClassName)} ref={containerRef}>
      {/* Label */}
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      {/* Select Button */}
      <div
        className={cn(
          'relative w-full border rounded-md cursor-pointer transition-colors',
          'focus-within:ring-2 focus-within:ring-offset-2',
          {
            'border-neutral-300 bg-white': !error && !disabled,
            'hover:border-neutral-400': !error && !disabled,
            'focus-within:border-primary-500 focus-within:ring-primary-500': !error && !disabled,
            'border-error-300': error && !disabled,
            'focus-within:border-error-500 focus-within:ring-error-500': error && !disabled,
            'border-neutral-200 bg-neutral-50 cursor-not-allowed': disabled,
          },
          className
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={label ? `${selectId}-label` : undefined}
      >
        {/* Selected Values Display */}
        <div className="flex items-center min-h-[42px] px-3 py-2">
          {multiple && selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedOptions.slice(0, 3).map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800"
                >
                  {option.icon && <span className="mr-1">{option.icon}</span>}
                  {option.label}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveOption(option.value, e)}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary-200 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              {selectedOptions.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-800">
                  +{selectedOptions.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center flex-1">
              {selectedOptions[0]?.icon && (
                <span className="mr-2">{selectedOptions[0].icon}</span>
              )}
              <span className={cn(
                'flex-1 text-sm',
                selectedValues.length === 0 ? 'text-neutral-400' : 'text-neutral-900'
              )}>
                {getDisplayText()}
              </span>
            </div>
          )}

          {/* Loading or Chevron */}
          <div className="ml-2 flex items-center">
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg
                className={cn(
                  'h-4 w-4 text-neutral-400 transition-transform',
                  isOpen && 'rotate-180'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>

        {/* Search Input */}
        {searchable && isOpen && (
          <div className="border-t border-neutral-200 p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search options..."
              className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:outline-none focus:border-primary-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg"
          style={{ maxHeight }}
        >
          <div
            ref={listRef}
            className="overflow-auto"
            style={{ maxHeight }}
            role="listbox"
          >
            {finalOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-neutral-500 text-center">
                {emptyMessage}
              </div>
            ) : (
              finalOptions.map((option, index) => (
                <div
                  key={option.value}
                  className={cn(
                    'flex items-center px-3 py-2 cursor-pointer transition-colors',
                    {
                      'bg-primary-50 text-primary-900': focusedIndex === index,
                      'hover:bg-neutral-50': focusedIndex !== index && !option.disabled,
                      'text-neutral-400 cursor-not-allowed': option.disabled,
                      'bg-primary-100': selectedValues.includes(option.value) && !option.disabled,
                    }
                  )}
                  onClick={() => handleOptionSelect(option)}
                  role="option"
                  aria-selected={selectedValues.includes(option.value)}
                >
                  {/* Checkbox for multiple selection */}
                  {multiple && (
                    <div className="mr-3">
                      <div className={cn(
                        'w-4 h-4 border rounded flex items-center justify-center',
                        selectedValues.includes(option.value)
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-neutral-300'
                      )}>
                        {selectedValues.includes(option.value) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Option Icon */}
                  {option.icon && (
                    <span className="mr-3 flex-shrink-0">{option.icon}</span>
                  )}

                  {/* Option Content */}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-neutral-500">{option.description}</div>
                    )}
                  </div>

                  {/* Selected Indicator for single selection */}
                  {!multiple && selectedValues.includes(option.value) && (
                    <svg className="w-4 h-4 text-primary-600 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Help Text or Error Message */}
      {(helpText || error) && (
        <div className="mt-1">
          {error ? (
            <p className="text-sm text-error-600 flex items-center">
              <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          ) : helpText ? (
            <p className="text-sm text-neutral-500">{helpText}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}