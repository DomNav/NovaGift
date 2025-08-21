import * as React from "react";
import { Html, Head, Preview, Body, Container, Heading, Text, Link, Img } from "@react-email/components";

export function ClaimEmail({ amountUsd, claimUrl, skinId }: { amountUsd: number; claimUrl: string; skinId?: string }) {
  return (
    <Html>
      <Head />
      <Preview>You've received ${amountUsd.toFixed(2)} on Soroseal</Preview>
      <Body style={{ backgroundColor: "#f6f8ff", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ background: "#fff", margin: "32px auto", padding: "24px", borderRadius: 12, maxWidth: 520 }}>
          <Img src="https://soroseal.app/logo.png" alt="Soroseal" width="120" style={{ marginBottom: 16 }} />
          <Heading as="h2" style={{ margin: "0 0 8px 0" }}>You've received a gift 🎁</Heading>
          <Text style={{ color: "#334" }}>Open your Soroseal envelope to claim <b>${amountUsd.toFixed(2)} USDC</b>.</Text>
          {skinId && <Text style={{ color: "#667" }}>The sender picked a special style: <b>{skinId}</b>.</Text>}
          <Link
            href={claimUrl}
            style={{ display: "inline-block", marginTop: 16, background: "#1D2BFF", color: "#fff", padding: "12px 16px", borderRadius: 10, textDecoration: "none" }}>
            Open your envelope
          </Link>
          <Text style={{ color: "#889", marginTop: 20, fontSize: 12 }}>
            This link lets you claim on Soroseal. If you weren't expecting this, you can ignore the email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
export default ClaimEmail;