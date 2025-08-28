import crypto from 'crypto-js/hmac-sha256';
import { toast } from 'sonner';

interface NotifyRecipientParams {
  envelopeId: string;
  email: string;
  amountUsd: number;
  skinId?: string;
}

export async function notifyRecipient({
  envelopeId,
  email,
  amountUsd,
  skinId,
}: NotifyRecipientParams): Promise<boolean> {
  try {
    const notifyUrl = import.meta.env.VITE_NOTIFY_URL || 'http://localhost:4000';
    const webhookSecret = import.meta.env.VITE_WEBHOOK_SECRET || 'soro_dev_secret';

    const body = JSON.stringify({
      envelopeId,
      recipientEmail: email,
      amountUsd,
      skinId,
    });

    const sig = crypto(body, webhookSecret).toString();

    const response = await fetch(`${notifyUrl}/notify/envelope-funded`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-soro-signature': sig,
      },
      body,
    });

    if (response.ok) {
      toast.success('We emailed the recipient a claim link.');
      return true;
    }

    throw new Error('Failed to send notification');
  } catch (error) {
    console.error('Failed to notify recipient:', error);
    return false;
  }
}
