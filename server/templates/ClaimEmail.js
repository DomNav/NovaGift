"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimEmail = ClaimEmail;
const React = __importStar(require("react"));
const components_1 = require("@react-email/components");
function ClaimEmail({ amountUsd, claimUrl, skinId }) {
    return (<components_1.Html>
      <components_1.Head />
      <components_1.Preview>You've received ${amountUsd.toFixed(2)} on NovaGift</components_1.Preview>
      <components_1.Body style={{ backgroundColor: "#f6f8ff", fontFamily: "Inter, Arial, sans-serif" }}>
        <components_1.Container style={{ background: "#fff", margin: "32px auto", padding: "24px", borderRadius: 12, maxWidth: 520 }}>
          <components_1.Img src="https://novagift.app/logo.png" alt="NovaGift" width="120" style={{ marginBottom: 16 }}/>
          <components_1.Heading as="h2" style={{ margin: "0 0 8px 0" }}>You've received a gift 🎁</components_1.Heading>
          <components_1.Text style={{ color: "#334" }}>Open your NovaGift envelope to claim <b>${amountUsd.toFixed(2)} USDC</b>.</components_1.Text>
          {skinId && <components_1.Text style={{ color: "#667" }}>The sender picked a special style: <b>{skinId}</b>.</components_1.Text>}
          <components_1.Link href={claimUrl} style={{ display: "inline-block", marginTop: 16, background: "#1D2BFF", color: "#fff", padding: "12px 16px", borderRadius: 10, textDecoration: "none" }}>
            Open your envelope
          </components_1.Link>
          <components_1.Text style={{ color: "#889", marginTop: 20, fontSize: 12 }}>
            This link lets you claim on NovaGift. If you weren't expecting this, you can ignore the email.
          </components_1.Text>
        </components_1.Container>
      </components_1.Body>
    </components_1.Html>);
}
exports.default = ClaimEmail;
