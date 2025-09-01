/**
 * Claim store for handling envelope claiming functionality
 */

import { API_URL } from '../config/env';

// Type definitions for envelope statuses
export type EnvelopeStatus = "CREATED" | "FUNDED" | "OPENED" | "CANCELED";

// Interface for envelope data returned by the API
export interface EnvelopeData {
  id: string;
  status: EnvelopeStatus;
  amount: string;
  asset: string;
  assetCode: string;
  senderMessage?: string;
  senderName?: string;
  recipient?: string;
  createdAt: string;
  expiresAt?: string;
}

// Interface for building claim transaction parameters
export interface BuildClaimTxParams {
  id: string;
  recipient: string;
  invite?: string;
}

// Interface for the build claim transaction response
export interface BuildClaimTxResponse {
  xdr: string;
}

/**
 * Fetch envelope data by ID
 * @param id - The envelope ID
 * @returns Promise<EnvelopeData>
 */
export async function fetchEnvelope(id: string): Promise<EnvelopeData> {
  try {
    const response = await fetch(`${API_URL}/api/claim/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Envelope not found');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch envelope: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate required fields
    if (!data.id || !data.status) {
      throw new Error('Invalid envelope data received');
    }

    return data as EnvelopeData;
  } catch (error) {
    console.error('fetchEnvelope error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch envelope');
  }
}

/**
 * Build a claim transaction XDR
 * @param params - Parameters for building the claim transaction
 * @returns Promise<string> - The unsigned XDR string
 */
export async function buildClaimTx(params: BuildClaimTxParams): Promise<string> {
  try {
    const { id, recipient, invite } = params;
    
    // Validate parameters
    if (!id || !recipient) {
      throw new Error('Missing required parameters for building claim transaction');
    }

    const requestBody: Record<string, unknown> = {
      recipient,
    };

    // Add invite token if provided
    if (invite) {
      requestBody.t = invite;
    }

    const response = await fetch(`${API_URL}/api/claim/${id}/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 400) {
        throw new Error(errorData.message || 'Invalid claim parameters');
      }
      if (response.status === 404) {
        throw new Error('Envelope not found or already claimed');
      }
      if (response.status === 409) {
        throw new Error('Envelope already claimed or not available for claiming');
      }
      
      throw new Error(errorData.message || `Failed to build claim transaction: ${response.status}`);
    }

    const data: BuildClaimTxResponse = await response.json();
    
    if (!data.xdr) {
      throw new Error('Invalid response: missing XDR');
    }

    return data.xdr;
  } catch (error) {
    console.error('buildClaimTx error:', error);
    throw error instanceof Error ? error : new Error('Failed to build claim transaction');
  }
}

/**
 * Helper function to format envelope amount for display
 * @param amount - Amount as string
 * @param assetCode - Asset code
 * @returns Formatted amount string
 */
export function formatEnvelopeAmount(amount: string, assetCode: string): string {
  try {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return `${amount} ${assetCode}`;
    }
    
    // Format with appropriate decimals
    const formatted = numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 7,
    });
    
    return `${formatted} ${assetCode}`;
  } catch {
    return `${amount} ${assetCode}`;
  }
}

/**
 * Helper function to shorten wallet addresses for display
 * @param address - Stellar public key
 * @returns Shortened address string
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) {
    return address;
  }
  
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
