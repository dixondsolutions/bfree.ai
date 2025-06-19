/**
 * Gentle Animation System for B Free.AI
 * Natural, subtle animations inspired by nature
 */

import { Variants, Transition } from 'framer-motion'

// Natural easing curves inspired by organic movement
export const easings = {
  // Gentle, organic curves
  natural: [0.25, 0.8, 0.25, 1],
  gentle: [0.4, 0, 0.2, 1],
  soft: [0.23, 1, 0.32, 1],
  
  // Breathing-like motion
  breathe: [0.37, 0, 0.63, 1],
  sway: [0.645, 0.045, 0.355, 1],
  
  // Minimal interaction curves
  subtle: [0.4, 0, 0.6, 1],
  smooth: [0.4, 0, 0.2, 1],
} as const

// Gentle transition presets
export const transitions = {
  // Subtle entrance
  gentle: {
    duration: 0.6,
    ease: easings.gentle,
  },
  
  // Natural breathing
  breathe: {
    duration: 3,
    ease: easings.breathe,
    repeat: Infinity,
    repeatType: 'reverse' as const,
  },
  
  // Soft hover
  hover: {
    duration: 0.3,
    ease: easings.soft,
  },
  
  // Page entrance
  pageEnter: {
    duration: 0.8,
    ease: easings.natural,
  },
  
  // Card entrance
  cardEnter: {
    duration: 0.5,
    ease: easings.natural,
  },
} as const

// Gentle motion variants
export const animations = {
  // Page entrance - very subtle
  pageEnter: {
    initial: { 
      opacity: 0, 
      y: 20 
    },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: transitions.pageEnter,
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: transitions.gentle,
    },
  },

  // Card entrance - staggered but subtle
  cardEnter: {
    initial: { 
      opacity: 0, 
      y: 15,
      scale: 0.98,
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: transitions.cardEnter,
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: transitions.gentle,
    },
  },

  // Gentle hover effect
  gentleHover: {
    initial: { 
      scale: 1,
      y: 0,
    },
    hover: { 
      scale: 1.02,
      y: -2,
      transition: transitions.hover,
    },
  },

  // Subtle breathing effect for important elements
  breathe: {
    initial: { 
      scale: 1,
      opacity: 1,
    },
    animate: { 
      scale: [1, 1.03, 1],
      opacity: [1, 0.9, 1],
      transition: {
        duration: 4,
        ease: easings.breathe,
        repeat: Infinity,
        repeatType: 'reverse' as const,
      },
    },
  },

  // Natural sway for accent elements
  gentleSway: {
    initial: { 
      x: 0,
      rotate: 0,
    },
    animate: { 
      x: [0, 2, 0, -2, 0],
      rotate: [0, 0.5, 0, -0.5, 0],
      transition: {
        duration: 6,
        ease: easings.sway,
        repeat: Infinity,
      },
    },
  },

  // Subtle fade in
  fadeIn: {
    initial: { 
      opacity: 0 
    },
    animate: { 
      opacity: 1,
      transition: transitions.gentle,
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3 },
    },
  },

  // Gentle slide up
  slideUp: {
    initial: { 
      opacity: 0, 
      y: 30 
    },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: transitions.gentle,
    },
  },

  // Stagger container for multiple items
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  },

  // Stagger items
  staggerItem: {
    initial: { 
      opacity: 0, 
      y: 20 
    },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: transitions.cardEnter,
    },
  },
} as const

// Utility functions for natural animations
export const getStaggerDelay = (index: number, baseDelay = 0.1) => ({
  delay: index * baseDelay,
})

export const createStaggerVariant = (items: number, baseDelay = 0.1) => ({
  animate: {
    transition: {
      staggerChildren: baseDelay,
      delayChildren: baseDelay * 0.5,
    },
  },
})

// Nature-inspired interaction states
export const interactionStates = {
  // Gentle press effect
  press: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
  
  // Soft glow on focus
  focus: {
    boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.1)',
    transition: transitions.hover,
  },
  
  // Subtle lift on hover
  lift: {
    y: -3,
    boxShadow: '0 4px 8px rgba(34, 197, 94, 0.1)',
    transition: transitions.hover,
  },
} as const

// Component-specific animation presets
export const componentAnimations = {
  // Dashboard cards
  dashboardCard: {
    ...animations.cardEnter,
    whileHover: interactionStates.lift,
    whileTap: interactionStates.press,
  },
  
  // Button animations
  button: {
    whileHover: { scale: 1.02 },
    whileTap: interactionStates.press,
    transition: transitions.hover,
  },
  
  // Modal animations
  modal: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: transitions.gentle,
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.3 },
    },
  },
  
  // Sidebar animations
  sidebar: {
    initial: { x: -20, opacity: 0 },
    animate: { 
      x: 0, 
      opacity: 1,
      transition: transitions.pageEnter,
    },
  },
} as const

export default animations 