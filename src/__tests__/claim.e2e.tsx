/**
 * End-to-end smoke test for claim flow
 * This test stubs wallet API and walks through the claim process
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClaimPage } from '../pages/claim/ClaimPage';

// Mock the env module
vi.mock('../config/env', () => ({
  API_URL: 'https://test-api.example.com',
  RPC_URL: 'https://test-rpc.example.com',
}));

// Mock the wallet hook
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    publicKey: 'GTEST123456789ABCDEF',
    connected: false,
    connecting: false,
    connect: vi.fn(),
    signAndSend: vi.fn(),
  }),
}));

// Mock the toast hook
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Freighter wallet API
const mockFreighterApi = {
  getPublicKey: vi.fn(),
  signTransaction: vi.fn(),
  isConnected: vi.fn(),
};

// Mock window.freighterApi
Object.defineProperty(window, 'freighterApi', {
  value: mockFreighterApi,
  writable: true,
});

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-envelope-id' }),
    useSearchParams: () => [new URLSearchParams('t=test-invite-token'), vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },

  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('Claim Page E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset Freighter mocks
    mockFreighterApi.getPublicKey.mockResolvedValue('GTEST123456789ABCDEF');
    mockFreighterApi.signTransaction.mockResolvedValue('SIGNED_XDR_STRING');
    mockFreighterApi.isConnected.mockResolvedValue(true);
  });

  it('should display loading state initially', async () => {
    // Mock pending API response
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(
      <TestWrapper>
        <ClaimPage />
      </TestWrapper>
    );

    expect(screen.getByText('Loading gift...')).toBeInTheDocument();
  });

  it('should display envelope details when loaded', async () => {
    const mockEnvelopeData = {
      id: 'test-envelope-id',
      status: 'FUNDED',
      amount: '100',
      assetCode: 'XLM',
      senderMessage: 'Happy Birthday!',
      senderName: 'Alice',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEnvelopeData),
    });

    render(
      <TestWrapper>
        <ClaimPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("You've Got a Gift!")).toBeInTheDocument();
      expect(screen.getByText('100 XLM')).toBeInTheDocument();
      expect(screen.getByText('"Happy Birthday!"')).toBeInTheDocument();
      expect(screen.getByText('From Alice')).toBeInTheDocument();
    });
  });

  it('should display error when envelope not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Envelope not found' }),
    });

    render(
      <TestWrapper>
        <ClaimPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Gift Not Found')).toBeInTheDocument();
    });
  });

  it('should display already claimed status', async () => {
    const mockEnvelopeData = {
      id: 'test-envelope-id',
      status: 'OPENED',
      amount: '100',
      assetCode: 'XLM',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEnvelopeData),
    });

    render(
      <TestWrapper>
        <ClaimPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Already Claimed')).toBeInTheDocument();
      expect(screen.getByText('This gift has already been claimed by someone else.')).toBeInTheDocument();
    });
  });

  it('should display expired status', async () => {
    const mockEnvelopeData = {
      id: 'test-envelope-id',
      status: 'CANCELED',
      amount: '100',
      assetCode: 'XLM',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEnvelopeData),
    });

    render(
      <TestWrapper>
        <ClaimPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Gift Expired')).toBeInTheDocument();
      expect(screen.getByText('This gift has expired and can no longer be claimed.')).toBeInTheDocument();
    });
  });

  it('should display unfunded status', async () => {
    const mockEnvelopeData = {
      id: 'test-envelope-id',
      status: 'CREATED',
      amount: '100',
      assetCode: 'XLM',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEnvelopeData),
    });

    render(
      <TestWrapper>
        <ClaimPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Gift Not Ready')).toBeInTheDocument();
      expect(screen.getByText("This gift hasn't been funded yet. Please check back later.")).toBeInTheDocument();
    });
  });

  // Note: Full wallet integration test would require a more complex setup
  // with actual Freighter integration and transaction signing.
  // This smoke test focuses on UI states and basic interactions.
});
