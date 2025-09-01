import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/useToast';

const ContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contact: z.string().refine(
    (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return emailRegex.test(val) || phoneRegex.test(val);
    },
    { message: 'Must be a valid email or phone number' }
  ),
  wallet: z.string().optional(),
  tags: z.array(z.enum(['VIP', 'Team', 'Friends'])).optional(),
});

type ContactFormData = z.infer<typeof ContactSchema>;

interface AddContactModalProps {
  onContactAdded?: () => void;
}

export const AddContactModal = ({ onContactAdded }: AddContactModalProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactSchema),
  });

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          tags: selectedTags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add contact');
      }

      addToast({ message: 'Contact added', type: 'success' });
      
      // Reset form and close modal
      reset();
      setSelectedTags([]);
      setOpen(false);
      
      // Callback to refresh list
      onContactAdded?.();
    } catch (error) {
      console.error('Error adding contact:', error);
      addToast({ message: 'Failed to add contact', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button>
          ➕ Add Contact
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl z-50">
          <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Add New Contact
          </Dialog.Title>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label 
                htmlFor="name" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Name
              </label>
              <input
                {...register('name')}
                type="text"
                id="name"
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label 
                htmlFor="contact" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Email or Phone
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

            <div>
              <label 
                htmlFor="wallet" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Wallet Address (optional)
              </label>
              <input
                {...register('wallet')}
                type="text"
                id="wallet"
                placeholder="G..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                disabled={isLoading}
              />
              {errors.wallet && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.wallet.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tags
              </label>
              <div className="flex gap-2">
                {(['VIP', 'Team', 'Friends'] as const).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    disabled={isLoading}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Contact'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};