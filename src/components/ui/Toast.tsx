import { useToast } from '@/hooks/useToast'
import clsx from 'clsx'

export const Toast = () => {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'animate-slide-up px-6 py-4 rounded-lg shadow-lg backdrop-blur-lg',
            'border min-w-[300px] max-w-md cursor-pointer transition-all duration-200',
            'hover:scale-105 active:scale-95',
            {
              'bg-green-500/20 border-green-500/50 text-green-100': toast.type === 'success',
              'bg-red-500/20 border-red-500/50 text-red-100': toast.type === 'error',
              'bg-blue-500/20 border-blue-500/50 text-blue-100': toast.type === 'info',
              'bg-yellow-500/20 border-yellow-500/50 text-yellow-100': toast.type === 'warning',
            },
          )}
          onClick={() => removeToast(toast.id)}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'info' && 'ℹ'}
              {toast.type === 'warning' && '⚠'}
            </span>
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}