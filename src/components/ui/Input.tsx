import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** The variant style of the input */
  variant?: 'default' | 'error' | 'success'
  /** The size of the input */
  size?: 'sm' | 'md' | 'lg'
  /** Label text for the input */
  label?: string
  /** Help text displayed below the input */
  helpText?: string
  /** Error message displayed below the input */
  error?: string
  /** Icon to display on the left side */
  leftIcon?: ReactNode
  /** Icon to display on the right side */
  rightIcon?: ReactNode
  /** Additional classes for the container */
  containerClassName?: string
  /** Additional classes for the label */
  labelClassName?: string
  /** Whether the field is required (adds red asterisk) */
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  size = 'md',
  label,
  helpText,
  error,
  leftIcon,
  rightIcon,
  containerClassName,
  labelClassName,
  required,
  className,
  id,
  disabled,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error || variant === 'error'
  const hasSuccess = variant === 'success'

  const baseClasses = cn(
    'block w-full rounded-md border transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'placeholder:text-neutral-400',
    
    // Size variants
    {
      'text-sm px-3 py-2': size === 'sm',
      'text-sm px-3 py-2.5': size === 'md',
      'text-base px-4 py-3': size === 'lg',
    },
    
    // Icon padding adjustments
    {
      'pl-10': leftIcon && size === 'sm',
      'pl-11': leftIcon && size === 'md',
      'pl-12': leftIcon && size === 'lg',
      'pr-10': rightIcon && size === 'sm',
      'pr-11': rightIcon && size === 'md',
      'pr-12': rightIcon && size === 'lg',
    },
    
    // Variant styles
    {
      // Default variant
      'border-neutral-300 bg-white text-neutral-900': variant === 'default' && !disabled,
      'hover:border-neutral-400': variant === 'default' && !disabled,
      'focus:border-primary-500 focus:ring-primary-500': variant === 'default' && !disabled,
      
      // Error variant
      'border-error-300 bg-white text-neutral-900': hasError && !disabled,
      'hover:border-error-400': hasError && !disabled,
      'focus:border-error-500 focus:ring-error-500': hasError && !disabled,
      
      // Success variant
      'border-success-300 bg-white text-neutral-900': hasSuccess && !disabled,
      'hover:border-success-400': hasSuccess && !disabled,
      'focus:border-success-500 focus:ring-success-500': hasSuccess && !disabled,
      
      // Disabled state
      'border-neutral-200 bg-neutral-50 text-neutral-500': disabled,
    }
  )

  const iconClasses = cn(
    'absolute inset-y-0 flex items-center pointer-events-none',
    {
      'text-neutral-400': variant === 'default',
      'text-error-400': hasError,
      'text-success-400': hasSuccess,
    }
  )

  const leftIconClasses = cn(iconClasses, {
    'left-3': size === 'sm',
    'left-3': size === 'md',
    'left-4': size === 'lg',
  })

  const rightIconClasses = cn(iconClasses, {
    'right-3': size === 'sm',
    'right-3': size === 'md',
    'right-4': size === 'lg',
  })

  return (
    <div className={cn('w-full', containerClassName)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'block text-sm font-medium text-neutral-700 mb-1',
            labelClassName
          )}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className={leftIconClasses}>
            <div className={cn('h-5 w-5', { 'h-4 w-4': size === 'sm', 'h-6 w-6': size === 'lg' })}>
              {leftIcon}
            </div>
          </div>
        )}

        {/* Input Field */}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(baseClasses, className)}
          {...props}
        />

        {/* Right Icon */}
        {rightIcon && (
          <div className={rightIconClasses}>
            <div className={cn('h-5 w-5', { 'h-4 w-4': size === 'sm', 'h-6 w-6': size === 'lg' })}>
              {rightIcon}
            </div>
          </div>
        )}
      </div>

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
})

Input.displayName = 'Input'

// Textarea component with similar features
export interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'error' | 'success'
  label?: string
  helpText?: string
  error?: string
  containerClassName?: string
  labelClassName?: string
  required?: boolean
  rows?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  variant = 'default',
  label,
  helpText,
  error,
  containerClassName,
  labelClassName,
  required,
  className,
  id,
  disabled,
  rows = 3,
  ...props
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error || variant === 'error'
  const hasSuccess = variant === 'success'

  const baseClasses = cn(
    'block w-full rounded-md border transition-colors duration-200 text-sm px-3 py-2.5',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'placeholder:text-neutral-400 resize-vertical',
    
    // Variant styles
    {
      // Default variant
      'border-neutral-300 bg-white text-neutral-900': variant === 'default' && !disabled,
      'hover:border-neutral-400': variant === 'default' && !disabled,
      'focus:border-primary-500 focus:ring-primary-500': variant === 'default' && !disabled,
      
      // Error variant
      'border-error-300 bg-white text-neutral-900': hasError && !disabled,
      'hover:border-error-400': hasError && !disabled,
      'focus:border-error-500 focus:ring-error-500': hasError && !disabled,
      
      // Success variant
      'border-success-300 bg-white text-neutral-900': hasSuccess && !disabled,
      'hover:border-success-400': hasSuccess && !disabled,
      'focus:border-success-500 focus:ring-success-500': hasSuccess && !disabled,
      
      // Disabled state
      'border-neutral-200 bg-neutral-50 text-neutral-500': disabled,
    }
  )

  return (
    <div className={cn('w-full', containerClassName)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={textareaId}
          className={cn(
            'block text-sm font-medium text-neutral-700 mb-1',
            labelClassName
          )}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      {/* Textarea Field */}
      <textarea
        ref={ref}
        id={textareaId}
        disabled={disabled}
        rows={rows}
        className={cn(baseClasses, className)}
        {...props}
      />

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
})

Textarea.displayName = 'Textarea'