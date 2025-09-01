import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBackButton?: boolean;
}

export function PageHeader({ 
  title, 
  description, 
  children, 
  onBack, 
  backLabel = "Back",
  breadcrumbs = [],
  showBackButton = false 
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-brand-text/60 mb-4">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              {item.href ? (
                <button
                  onClick={() => navigate(item.href!)}
                  className="hover:text-brand-text transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-brand-text/40">{item.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="w-4 h-4" />
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Back Button */}
      {showBackButton && (
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-brand-text/60 hover:text-brand-text transition-colors mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">{backLabel}</span>
        </button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-text">{title}</h1>
          {description && <p className="text-brand-text/60 mt-2">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
