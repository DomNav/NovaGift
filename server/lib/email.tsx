import React from "react";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_dummy_key_for_testing' 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;
const EMAIL_FROM = process.env.EMAIL_FROM || "NovaGift <noreply@novagift.dev>";
const CLAIM_SHORT_DOMAIN = process.env.CLAIM_SHORT_DOMAIN || "https://ng.fyi";

interface EmailInviteProps {
  recipientEmail: string;
  amount: string;
  assetCode: string;
  claimUrl: string;
  senderName?: string;
}

const EmailInviteTemplate: React.FC<EmailInviteProps> = ({
  amount,
  assetCode,
  claimUrl,
  senderName = "Someone"
}) => {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ backgroundColor: "#f7f7f7", padding: "40px", borderRadius: "8px" }}>
        <h1 style={{ color: "#333", marginBottom: "20px" }}>
          🎁 You've received a gift!
        </h1>
        
        <p style={{ fontSize: "18px", color: "#555", marginBottom: "30px" }}>
          {senderName} has sent you <strong>{amount} {assetCode}</strong> on NovaGift.
        </p>
        
        <a
          href={claimUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#7C3AED",
            color: "white",
            padding: "14px 32px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "16px",
            fontWeight: "bold"
          }}
        >
          Claim Your Gift
        </a>
        
        <p style={{ fontSize: "14px", color: "#888", marginTop: "30px" }}>
          Or copy this link: {claimUrl}
        </p>
        
        <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #ddd" }}>
          <p style={{ fontSize: "12px", color: "#999" }}>
            This gift expires in 7 days. NovaGift is a secure platform for sending digital assets.
          </p>
        </div>
      </div>
    </div>
  );
};

export async function sendInviteEmail({
  recipientEmail,
  amount,
  assetCode,
  envelopeId,
  inviteToken,
  senderName
}: {
  recipientEmail: string;
  amount: string;
  assetCode: string;
  envelopeId: string;
  inviteToken: string;
  senderName?: string;
}): Promise<{ id: string }> {
  const claimUrl = `${CLAIM_SHORT_DOMAIN}/c/${envelopeId}?t=${inviteToken}`;
  
  if (!resend) {
    console.log('Email sending disabled - no API key configured');
    return { id: 'mock-email-id' };
  }
  
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: recipientEmail,
    subject: `You've received ${amount} ${assetCode} on NovaGift!`,
    react: (
      <EmailInviteTemplate
        recipientEmail={recipientEmail}
        amount={amount}
        assetCode={assetCode}
        claimUrl={claimUrl}
        senderName={senderName}
      />
    )
  });
  
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
  
  if (!data?.id) {
    throw new Error("No email ID returned from Resend");
  }
  
  return { id: data.id };
}