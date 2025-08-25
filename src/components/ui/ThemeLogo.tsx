import { useTheme } from '@/contexts/ThemeContext'

interface ThemeLogoProps {
  className?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'full'
  // Optional: specify different logos for each theme
  lightModeLogo?: string
  darkModeLogo?: string
  // Optional: use single transparent logo (default behavior)
  transparentLogo?: string
  // Optional: use the new JPG logo format
  useJpgLogo?: boolean
}

export const ThemeLogo = ({ 
  className = '', 
  alt = 'NovaGift Logo',
  size = 'md',
  lightModeLogo,
  darkModeLogo,
  transparentLogo,
  useJpgLogo = true
}: ThemeLogoProps) => {
  const { theme } = useTheme()
  
  // Size variants
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16', 
    lg: 'w-24 h-24',
    'full': 'w-full h-auto'
  }
  
  // Determine which logo to use
  const getLogoSrc = () => {
    // If specific theme logos are provided, use them
    if (lightModeLogo && darkModeLogo) {
      return theme === 'dark' ? darkModeLogo : lightModeLogo
    }
    
    // If transparent logo is specified, use it
    if (transparentLogo) {
      return transparentLogo
    }
    
    // Default: use the JPG logo
    return '/assets/images/novagift-logo.jpg'
  }
  
  return (
    <img 
      src={getLogoSrc()}
      alt={alt}
      className={`
        ${sizeClasses[size]} 
        ${size === 'full' ? '' : 'mx-auto'}
        opacity-90 
        hover:opacity-100 
        transition-all 
        duration-200 
        drop-shadow-lg
        object-contain
        ${theme === 'dark' ? 'filter brightness-110 contrast-110 shadow-2xl shadow-blue-500/30' : 'filter brightness-95 contrast-105'}
        ${className}
      `}
    />
  )
}
