/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Dynamic sidebar classes
    'w-(--sidebar-width)',
    'w-(--sidebar-width-icon)',
    'max-w-(--skeleton-width)',
    // Data attribute selectors
    'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
    'group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]',
    'group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
    // Animation classes
    'animate-slideUp',
    'animate-fadeIn', 
    'animate-scaleIn',
    'animate-float',
  ],
  theme: {
    // Enhanced design tokens
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    extend: {
      // Enhanced spacing with 8px mathematical grid
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
        '34': '8.5rem',   // 136px
        '38': '9.5rem',   // 152px
        '42': '10.5rem',  // 168px
        '46': '11.5rem',  // 184px
        '50': '12.5rem',  // 200px
        '54': '13.5rem',  // 216px
        '58': '14.5rem',  // 232px
        '62': '15.5rem',  // 248px
        '66': '16.5rem',  // 264px
        '70': '17.5rem',  // 280px
        '74': '18.5rem',  // 296px
        '78': '19.5rem',  // 312px
        '82': '20.5rem',  // 328px
        '86': '21.5rem',  // 344px
        '90': '22.5rem',  // 360px
        '94': '23.5rem',  // 376px
        '98': '24.5rem',  // 392px
        '102': '25.5rem', // 408px
      },
      // Nature-inspired color palette
      colors: {
        // Primary nature greens
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a', // Main brand color - fresh green
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Secondary earth tones
        secondary: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308', // Warm earth yellow
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        // Natural accent colors
        accent: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16', // Fresh lime
          600: '#65a30d',
          700: '#4d7c0f',
          800: '#3f6212',
          900: '#365314',
          950: '#1a2e05',
        },
        // Earth browns
        earth: {
          50: '#faf7f0',
          100: '#f4ede1',
          200: '#e9dcc6',
          300: '#dbc7a4',
          400: '#cbae81',
          500: '#b8956a', // Warm earth brown
          600: '#a67e5b',
          700: '#8a654c',
          800: '#715442',
          900: '#5c4639',
          950: '#31241c',
        },
        // Natural grays (stone-like)
        natural: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c', // Natural stone
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
        // Status colors with nature theme
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e', // Fresh green
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b', // Autumn orange
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444', // Natural red
          600: '#dc2626',
        },
        info: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981', // Teal green
          600: '#059669',
        },
        // Rich Neutral Colors with Subtle Undertones
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Enhanced Background and Surface Colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        
        surface: {
          50: '#ffffff',
          100: '#f8fafc',
          200: '#f1f5f9',
          300: '#e2e8f0',
          400: '#cbd5e1',
          500: '#94a3b8',
          600: '#64748b',
          700: '#475569',
          800: '#334155',
          900: '#1e293b',
          950: '#0f172a',
        },
        
        // Calendar and Feature-Specific Colors
        calendar: {
          event: '#3b82f6',
          task: '#10b981',
          reminder: '#f59e0b',
          meeting: '#8b5cf6',
          personal: '#ec4899',
          work: '#6366f1',
          ai: '#0ea5e9',
        },
        
        // Status and State Colors
        status: {
          pending: '#f59e0b',
          'in-progress': '#3b82f6',
          review: '#8b5cf6',
          done: '#10b981',
          blocked: '#ef4444',
          deferred: '#6b7280',
          cancelled: '#9ca3af',
        },
        
        // shadcn/ui CSS variable mappings
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        
        // Sidebar CSS variables
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      
      // Enhanced Typography Scale with Better Hierarchy
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],      // 11px
        'xs': ['0.75rem', { lineHeight: '1.125rem' }],     // 12px
        'sm': ['0.875rem', { lineHeight: '1.375rem' }],    // 14px
        'base': ['1rem', { lineHeight: '1.625rem' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.875rem' }],    // 18px
        'xl': ['1.25rem', { lineHeight: '2rem' }],         // 20px
        '2xl': ['1.5rem', { lineHeight: '2.25rem' }],      // 24px
        '3xl': ['1.875rem', { lineHeight: '2.625rem' }],   // 30px
        '4xl': ['2.25rem', { lineHeight: '3rem' }],        // 36px
        '5xl': ['3rem', { lineHeight: '3.75rem' }],        // 48px
        '6xl': ['3.75rem', { lineHeight: '4.5rem' }],      // 60px
        '7xl': ['4.5rem', { lineHeight: '5.25rem' }],      // 72px
        '8xl': ['6rem', { lineHeight: '6.75rem' }],        // 96px
        '9xl': ['8rem', { lineHeight: '8.75rem' }],        // 128px
      },
      
      fontWeight: {
        hairline: '100',
        thin: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      
      letterSpacing: {
        'tightest': '-0.075em',
        'tighter': '-0.05em', 
        'tight': '-0.025em',
        'normal': '0em',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
      },
      
      // Enhanced Border Radius Scale
      borderRadius: {
        'xs': '0.125rem',   // 2px
        'sm': '0.25rem',    // 4px
        'DEFAULT': '0.375rem', // 6px
        'md': '0.5rem',     // 8px
        'lg': '0.75rem',    // 12px
        'xl': '1rem',       // 16px
        '2xl': '1.25rem',   // 20px
        '3xl': '1.5rem',    // 24px
        '4xl': '2rem',      // 32px
        '5xl': '2.5rem',    // 40px
        'full': '9999px',
      },
      
      // Enhanced Shadow Scale with Sophisticated Effects
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'md': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'lg': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        // Enhanced glow effects for AI feel
        'glow': '0 0 20px rgb(14 165 233 / 0.3)',
        'glow-lg': '0 0 40px rgb(14 165 233 / 0.4)',
        'glow-xl': '0 0 60px rgb(14 165 233 / 0.5)',
        'glow-primary': '0 0 20px rgb(14 165 233 / 0.4)',
        'glow-success': '0 0 20px rgb(16 185 129 / 0.4)',
        'glow-warning': '0 0 20px rgb(245 158 11 / 0.4)',
        'glow-error': '0 0 20px rgb(239 68 68 / 0.4)',
        // Card elevation system
        'elevation-1': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
        'elevation-2': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        'elevation-3': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
        'elevation-4': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
        'elevation-5': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      
      // Enhanced Animation System for Micro-Interactions
      animation: {
        // Basic animations
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-in',
        
        // Micro-interactions
        'bounce-gentle': 'bounceGentle 0.6s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'wobble': 'wobble 0.5s ease-in-out',
        'shake': 'shake 0.5s ease-in-out',
        
        // Loading animations
        'spin-slow': 'spin 2s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        
        // Button and interaction animations
        'button-press': 'buttonPress 0.1s ease-in-out',
        'card-hover': 'cardHover 0.2s ease-out',
        'nav-expand': 'navExpand 0.3s ease-out',
        'nav-collapse': 'navCollapse 0.3s ease-in',
        
        // Success and feedback animations
        'success-bounce': 'successBounce 0.6s ease-out',
        'error-shake': 'errorShake 0.5s ease-in-out',
        'notification-slide': 'notificationSlide 0.4s ease-out',
      },
      
      keyframes: {
        // Basic keyframes
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        
        // Micro-interaction keyframes
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgb(14 165 233 / 0.3)' },
          '100%': { boxShadow: '0 0 40px rgb(14 165 233 / 0.6)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        wobble: {
          '0%': { transform: 'translateX(0%)' },
          '15%': { transform: 'translateX(-25%) rotate(-5deg)' },
          '30%': { transform: 'translateX(20%) rotate(3deg)' },
          '45%': { transform: 'translateX(-15%) rotate(-3deg)' },
          '60%': { transform: 'translateX(10%) rotate(2deg)' },
          '75%': { transform: 'translateX(-5%) rotate(-1deg)' },
          '100%': { transform: 'translateX(0%)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
        
        // UI-specific keyframes
        buttonPress: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' },
        },
        cardHover: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '100%': { transform: 'translateY(-2px) scale(1.02)' },
        },
        navExpand: {
          '0%': { width: '64px' },
          '100%': { width: '256px' },
        },
        navCollapse: {
          '0%': { width: '256px' },
          '100%': { width: '64px' },
        },
        successBounce: {
          '0%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.1)' },
          '50%': { transform: 'scale(0.95)' },
          '75%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        errorShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        notificationSlide: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      
      // Enhanced Z-index scale
      zIndex: {
        '1': '1',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        'auto': 'auto',
      },
      
      // Backdrop blur scale
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        DEFAULT: '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      
      // Enhanced transition durations
      transitionDuration: {
        '75': '75ms',
        '100': '100ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '600': '600ms',
        '700': '700ms',
        '800': '800ms',
        '900': '900ms',
        '1000': '1000ms',
      },
      
      // Enhanced transition timing functions
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'snappy': 'cubic-bezier(0.4, 0, 1, 1)',
      },
    },
  },
  plugins: [],
}