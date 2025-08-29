interface SendSMSOptions {
  to: string;
  message: string;
}

export async function sendSMS({ to, message }: SendSMSOptions) {
  // Placeholder for SMS service integration
  // In production, integrate with Twilio, AWS SNS, or similar
  console.log('SMS service not configured, would send to:', to);
  console.log('Message:', message);
  
  return { 
    success: true, 
    mock: true,
    to,
    message 
  };
}