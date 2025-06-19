/**
 * Comprehensive Animation System for B Free.AI
 * Integrates Framer Motion with our AI-themed design system
 */

import { Variants, Transition } from 'framer-motion'

// Enhanced easing curves for sophisticated animations
export const easings = {
  // Standard curves
  smooth: [0.4, 0, 0.2, 1],
  snappy: [0.4, 0, 1, 1],
  bouncy: [0.68, -0.55, 0.265, 1.55],
  
  // AI-themed curves
  neural: [0.645, 0.045, 0.355, 1],
  electric: [0.25, 0.46, 0.45, 0.94],
  quantum: [0.19, 1, 0.22, 1],
  
  // Micro-interaction curves
  gentle: [0.25, 0.8, 0.25, 1],
  crisp: [0.4, 0, 0.6, 1],
  elastic: [0.68, -0.6, 0.32, 1.6],
} as const

// Transition presets for consistent timing
export const transitions = {
  // Basic transitions
  fast: {
    duration: 0.2,
    ease: easings.smooth,
  },
  normal: {
    duration: 0.3,
    ease: easings.smooth,
  },
  slow: {
    duration: 0.5,
    ease: easings.smooth,
  },
  
  // Specialized transitions
  bounce: {
    duration: 0.6,
    ease: easings.bouncy,
  },
  spring: {
    type: 'spring' as const,
    stiffness: 260,
    damping: 20,
  },
  springBouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 17,
  },
  springSmooth: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
  
  // AI-themed transitions
  neural: {
    duration: 0.4,
    ease: easings.neural,
  },
  electric: {
    duration: 0.3,
    ease: easings.electric,
  },
  quantum: {
    duration: 0.5,
    ease: easings.quantum,
  },
} as const

// Fade animations with various directions
export const fadeVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    transition: transitions.fast,
  },
}

// Enhanced slide animations
export const slideVariants: Variants = {
  hiddenLeft: {
    opacity: 0,
    x: -50,
  },
  hiddenRight: {
    opacity: 0,
    x: 50,
  },
  hiddenUp: {
    opacity: 0,
    y: -30,
  },
  hiddenDown: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: transitions.springSmooth,
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: transitions.fast,
  },
}

// Scale animations for cards and interactive elements
export const scaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.springSmooth,
  },
  hover: {
    scale: 1.02,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: transitions.fast,
  },
}

// Stagger animations for lists and grids
export const staggerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
}

// Item variants for staggered animations
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.springSmooth,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: transitions.fast,
  },
}

// Modal and drawer animations
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...transitions.springSmooth,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: transitions.fast,
  },
}

// Drawer variants for side panels
export const drawerVariants: Variants = {
  hiddenLeft: {
    x: '-100%',
    opacity: 0,
  },
  hiddenRight: {
    x: '100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitions.springSmooth,
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: transitions.fast,
  },
}

// AI-specific animations
export const aiVariants: Variants = {
  thinking: {
    opacity: [0.5, 1, 0.5],
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easings.neural,
    },
  },
  processing: {
    rotate: [0, 360],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
  complete: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.6,
      ease: easings.electric,
    },
  },
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easings.quantum,
    },
  },
}

// Floating animations for AI elements
export const floatVariants: Variants = {
  float: {
    y: [-5, 5, -5],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: easings.gentle,
    },
  },
  hover: {
    y: -10,
    transition: transitions.fast,
  },
}

// Navigation animations
export const navVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...transitions.springSmooth,
      staggerChildren: 0.05,
    },
  },
}

// Button hover and tap animations
export const buttonVariants: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },
  loading: {
    opacity: 0.7,
    transition: transitions.fast,
  },
}

// Card animations with sophisticated hover effects
export const cardVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
    transition: transitions.fast,
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
}

// Page transition animations
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  in: {
    opacity: 1,
    x: 0,
    transition: {
      ...transitions.springSmooth,
      staggerChildren: 0.1,
    },
  },
  out: {
    opacity: 0,
    x: -20,
    transition: transitions.fast,
  },
}

// Notification animations
export const notificationVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 100,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: transitions.springBouncy,
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.8,
    transition: transitions.fast,
  },
}

// Task status animations
export const taskStatusVariants: Variants = {
  pending: {
    backgroundColor: 'hsl(38 92% 50% / 0.1)',
    borderColor: 'hsl(38 92% 50% / 0.2)',
    transition: transitions.normal,
  },
  'in-progress': {
    backgroundColor: 'hsl(217 91% 60% / 0.1)',
    borderColor: 'hsl(217 91% 60% / 0.2)',
    transition: transitions.normal,
  },
  done: {
    backgroundColor: 'hsl(142 71% 45% / 0.1)',
    borderColor: 'hsl(142 71% 45% / 0.2)',
    scale: [1, 1.05, 1],
    transition: {
      backgroundColor: transitions.normal,
      borderColor: transitions.normal,
      scale: { duration: 0.3, ease: easings.bouncy },
    },
  },
  blocked: {
    backgroundColor: 'hsl(0 84% 60% / 0.1)',
    borderColor: 'hsl(0 84% 60% / 0.2)',
    x: [0, -2, 2, -2, 0],
    transition: {
      backgroundColor: transitions.normal,
      borderColor: transitions.normal,
      x: { duration: 0.4, ease: easings.crisp },
    },
  },
}

// Loading spinner variants
export const spinnerVariants: Variants = {
  spinning: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

// Utility functions for creating custom animations
export const createDelayedAnimation = (delay: number, variants: Variants) => ({
  ...variants,
  visible: {
    ...variants.visible,
    transition: {
      ...(variants.visible as any)?.transition,
      delay,
    },
  },
})

export const createStaggeredList = (itemCount: number, staggerDelay = 0.1) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.1,
    },
  },
})

// Custom hooks for common animation patterns
export const useHoverAnimation = () => ({
  whileHover: { scale: 1.02, y: -2 },
  whileTap: { scale: 0.98 },
  transition: transitions.fast,
})

export const useButtonAnimation = () => ({
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: transitions.fast,
})

export const useCardAnimation = () => ({
  initial: 'rest',
  whileHover: 'hover',
  whileTap: 'tap',
  variants: cardVariants,
})

// AI-themed particle system animations
export const particleVariants: Variants = {
  floating: {
    y: [0, -20, 0],
    x: [0, 10, 0],
    opacity: [0.3, 0.8, 0.3],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: easings.gentle,
    },
  },
}

// Enhanced layout animations
export const layoutTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 50,
  mass: 1,
}

// Export all animations as a comprehensive system
export const animations = {
  // Variants
  fade: fadeVariants,
  slide: slideVariants,
  scale: scaleVariants,
  stagger: staggerVariants,
  staggerItem: staggerItemVariants,
  modal: modalVariants,
  drawer: drawerVariants,
  ai: aiVariants,
  float: floatVariants,
  nav: navVariants,
  button: buttonVariants,
  card: cardVariants,
  page: pageVariants,
  notification: notificationVariants,
  taskStatus: taskStatusVariants,
  spinner: spinnerVariants,
  particle: particleVariants,
  
  // Transitions
  transitions,
  
  // Easings
  easings,
  
  // Layout
  layoutTransition,
  
  // Utilities
  createDelayedAnimation,
  createStaggeredList,
  useHoverAnimation,
  useButtonAnimation,
  useCardAnimation,
} as const

export default animations 