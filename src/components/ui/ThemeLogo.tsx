import { useTheme } from '@/contexts/ThemeContext'

interface ThemeLogoProps {
  className?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  // Optional: specify different logos for each theme
  lightModeLogo?: string
  darkModeLogo?: string
  // Optional: use single transparent logo (default behavior)
  transparentLogo?: string
}

export const ThemeLogo = ({ 
  className = '', 
  alt = 'NovaGift Logo',
  size = 'md',
  lightModeLogo,
  darkModeLogo,
  transparentLogo
}: ThemeLogoProps) => {
  const { theme } = useTheme()
  
  // Size variants
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16', 
    lg: 'w-24 h-24'
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
    
    // Default: use the transparent version for better cross-theme visibility
    return '/assets/images/novagift-high-resolution-logo-transparent.png'
  }
  
  return (
    <img 
      src={getLogoSrc()}
      alt={alt}
      className={`
        ${sizeClasses[size]} 
        mx-auto 
        opacity-90 
        hover:opacity-100 
        transition-all 
        duration-200 
        drop-shadow-lg
        ${theme === 'dark' ? 'filter brightness-110 contrast-110' : 'filter brightness-95 contrast-105'}
        ${className}
      `}
    />
  )
}
