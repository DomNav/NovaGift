import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ 
  to, 
  subject, 
  html, 
  from = 'NovaGift <noreply@novagift.app>' 
}: SendEmailOptions) {
  if (!resend) {
    console.log('Email service not configured, skipping email to:', to);
    console.log('Subject:', subject);
    return { success: true, mock: true };
  }

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}