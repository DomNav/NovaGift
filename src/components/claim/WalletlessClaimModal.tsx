import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/useToast';

const ContactSchema = z.object({
  contact: z.string().min(1, 'Contact is required').refine(
    (val) => {
      // Check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Check if it's a valid E.164 phone number
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return emailRegex.test(val) || phoneRegex.test(val);
    },
    { message: 'Must be a valid email or phone number' }
  ),
});

type ContactFormData = z.infer<typeof ContactSchema>;

interface WalletlessClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelopeId: string;
}

export const WalletlessClaimModal = ({ 
  isOpen, 
  onClose, 
  envelopeId 
}: WalletlessClaimModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    
    try {
      // Determine if it's email or phone
      const isEmail = data.contact.includes('@');
      const method = isEmail ? 'email' : 'sms';

      const response = await fetch(`/api/envelopes/${envelopeId}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          contact: data.contact,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process claim');
      }

      setIsSuccess(true);
      addToast({ 
        message: "We've sent you a link to claim later", 
        type: 'success' 
      });

      // Wait a moment then navigate
      setTimeout(() => {
        navigate(`/thanks?envelopeId=${envelopeId}`);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error claiming without wallet:', error);
      addToast({ 
        message: 'Failed to process claim. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
        {!isSuccess ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Continue Without Wallet
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Enter your email or phone number to receive a link to claim your gift later when you have a wallet.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label 
                  htmlFor="contact" 
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Email or Phone Number
                </label>
                <input
                  {...register('contact')}
                  type="text"
                  id="contact"
                  placeholder="email@example.com or +1234567890"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                    bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  disabled={isLoading}
                />
                {errors.contact && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.contact.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Sending...' : 'Send Link'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Success!
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              We've sent you a link to claim your gift later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};