import { useTheme } from '@/contexts/ThemeContext';

interface ThemeLogoProps {
  className?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  // Optional: specify different logos for each theme
  lightModeLogo?: string;
  darkModeLogo?: string;
  // Optional: use single transparent logo (default behavior)
  transparentLogo?: string;
  // Optional: use the new JPG logo format
  useJpgLogo?: boolean;
}

export const ThemeLogo = ({
  className = '',
  alt = 'NovaGift Logo',
  size = 'md',
  lightModeLogo,
  darkModeLogo,
  transparentLogo,
}: ThemeLogoProps) => {
  const { theme } = useTheme();

  // Size variants
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    full: 'w-full h-auto',
  };

  // Determine which logo to use
  const getLogoSrc = () => {
    // If specific theme logos are provided, use them
    if (lightModeLogo && darkModeLogo) {
      return theme === 'dark' ? darkModeLogo : lightModeLogo;
    }

    // If transparent logo is specified, use it
    if (transparentLogo) {
      return transparentLogo;
    }

    // Default: use the JPG logo
    return '/assets/images/novagift-logo.jpg';
  };

  return (
    <img
      src={getLogoSrc()}
      alt={alt}
      className={`
        ${sizeClasses[size]} 
        ${size === 'full' ? '' : 'mx-auto'}
        opacity-95 
        hover:opacity-100 
        hover:scale-110
        hover:rotate-2
        hover:drop-shadow-2xl
        hover:brightness-110
        transition-all 
        duration-300 
        ease-out
        object-contain
        bg-transparent
        mix-blend-normal
        cursor-pointer
        transform-gpu
        ${theme === 'dark' ? 'hover:drop-shadow-[0_20px_35px_rgba(59,130,246,0.3)]' : 'hover:drop-shadow-[0_20px_35px_rgba(37,99,235,0.2)]'}
        ${className}
      `}
      style={{ 
        imageRendering: 'crisp-edges',
        backgroundColor: 'transparent'
      }}
    />
  );
};
