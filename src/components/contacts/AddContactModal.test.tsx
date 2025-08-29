import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddContactModal } from './AddContactModal';

// Mock useToast
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('AddContactModal', () => {
  const mockOnContactAdded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  it('renders trigger button', () => {
    render(<AddContactModal />);
    expect(screen.getByText('➕ Add Contact')).toBeInTheDocument();
  });

  it('opens modal when trigger is clicked', () => {
    render(<AddContactModal />);
    
    const triggerButton = screen.getByText('➕ Add Contact');
    fireEvent.click(triggerButton);
    
    expect(screen.getByText('Add New Contact')).toBeInTheDocument();
  });

  it('displays all form fields', () => {
    render(<AddContactModal />);
    
    const triggerButton = screen.getByText('➕ Add Contact');
    fireEvent.click(triggerButton);
    
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email or Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Wallet Address (optional)')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('displays tag buttons', () => {
    render(<AddContactModal />);
    
    const triggerButton = screen.getByText('➕ Add Contact');
    fireEvent.click(triggerButton);
    
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Friends')).toBeInTheDocument();
  });

  it('toggles tag selection', () => {
    render(<AddContactModal />);
    
    const triggerButton = screen.getByText('➕ Add Contact');
    fireEvent.click(triggerButton);
    
    const vipTag = screen.getByText('VIP');
    
    // Initially not selected (has light background)
    expect(vipTag.className).toContain('bg-slate-100');
    
    // Click to select
    fireEvent.click(vipTag);
    expect(vipTag.className).toContain('bg-blue-500');
    
    // Click again to deselect
    fireEvent.click(vipTag);
    expect(vipTag.className).toContain('bg-slate-100');
  });

  it('shows validation errors for invalid input', async () => {
    render(<AddContactModal />);
    
    const triggerButton = screen.getByText('➕ Add Contact');
    fireEvent.click(triggerButton);
    
    const submitButton = screen.getByRole('button', { name: /add contact/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
      expect(screen.getByText('Must be a valid email or phone number')).toBeInTheDocument();
    });
  });

  it('accepts valid email format', async () => {
    render(<AddContactModal />);
    
    const triggerButton = screen.getByText('➕ Add Contact');
    fireEvent.click(triggerButton);
    
    const nameInput = screen.getByLabelText('Name');
    const contactInput = screen.getByLabelText('Email or Phone');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(contactInput, { target: { value: 'john@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: /add contact/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Must be a valid email or phone number')).not.toBeInTheDocument();
    });
  });

  it('accepts valid phone format', async () => {
    render(<AddContactModal />);
    
    const triggerButton = screen.getByText('➕ Add Contact');
    fireEvent.click(triggerButton);
    
    const nameInput = screen.getByLabelText('Name');
    const contactInput = screen.getByLabelText('Email or Phone');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(contactInput, { target: { value: '+1234567890' } });
    
    const submitButton = screen.getByRole('button', { name: /add contact/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Must be a valid email or phone number')).not.toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', name: 'John Doe' }),
    });

    render(<AddContactModal onContactAdded={mockOnContactAdded} />);
    
    const triggerButton = screen.getByText('➕ Add Contact');
    fireEvent.click(triggerButton);
    
    const nameInput = screen.getByLabelText('Name');
    const contactInput = screen.getByLabelText('Email or Phone');
    const walletInput = screen.getByLabelText('Wallet Address (optional)');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(contactInput, { target: { value: 'john@example.com' } });
    fireEvent.change(walletInput, { target: { value: 'GXXXXX' } });
    
    // Select a tag
    const vipTag = screen.getByText('VIP');
    fireEvent.click(vipTag);
    
    const submitButton = screen.getByRole('button', { name: /add contact/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'John Doe',
          contact: 'john@example.com',
          wallet: 'GXXXXX',
          tags: ['VIP'],
        }),
      });
      
      expect(mockOnContactAdded).toHaveBeenCalled();
    });
  });

  it('handles API error gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    render(<AddContactModal />);
    
    const triggerButton = screen.getByText('➕ Add Contact');
    fireEvent.click(triggerButton);
    
    const nameInput = screen.getByLabelText('Name');
    const contactInput = screen.getByLabelText('Email or Phone');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(contactInput, { target: { value: 'john@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: /add contact/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      // Modal should still be open after error
      expect(screen.getByText('Add New Contact')).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<AddContactModal />);
    
    const triggerButton = screen.getByText('➕ Add Contact');
    fireEvent.click(triggerButton);
    
    const nameInput = screen.getByLabelText('Name');
    const contactInput = screen.getByLabelText('Email or Phone');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(contactInput, { target: { value: 'john@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: /add contact/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Adding...')).toBeInTheDocument();
      expect(nameInput).toBeDisabled();
      expect(contactInput).toBeDisabled();
    });
  });
});