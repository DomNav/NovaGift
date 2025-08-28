// src/utils/rewards.ts
import type { UnlockRule } from '@/store/skins';

export const cents = (n: number) => Math.max(0, Math.round(n || 0));
export const usd = (centsVal: number, digits = 0) =>
  `$${(Math.max(0, centsVal) / 100).toFixed(digits)}`;

/** Human label: "Unlocks at 5 sends and $100 total", "Unlocks at first send", etc. */
export function ruleLabel(rule?: UnlockRule): string {
  if (!rule || (!rule.minSends && !rule.minUsdCents)) return 'Free';
  const parts: string[] = [];
  if (rule.minSends) parts.push(rule.minSends === 1 ? 'first send' : `${rule.minSends} sends`);
  if (rule.minUsdCents) parts.push(`${usd(rule.minUsdCents, 0)} total`);
  return `Unlocks at ${parts.join(' and ')}`;
}

export type RewardsProg = {
  eligible: boolean;
  sendReq?: { current: number; required: number; remaining: number; ratio: number };
  usdReq?: { current: number; required: number; remainingCents: number; ratio: number };
  tooltip: string; // concise actionable copy
};

/** Compute if a rule is met and how far the user is. */
export function progressForRule(
  rule: UnlockRule | undefined,
  rewards: { sendCount: number; totalUsdCents: number }
): RewardsProg {
  if (!rule || (!rule.minSends && !rule.minUsdCents)) {
    return { eligible: true, tooltip: 'Free skin' };
  }

  const curS = rewards.sendCount || 0;
  const curU = cents(rewards.totalUsdCents || 0);

  const out: RewardsProg = {
    eligible: true,
    tooltip: '',
  };

  if (rule.minSends) {
    const req = rule.minSends;
    const rem = Math.max(0, req - curS);
    const ratio = Math.min(1, curS / req);
    out.sendReq = { current: curS, required: req, remaining: rem, ratio };
    if (rem > 0) out.eligible = false;
  }
  if (rule.minUsdCents) {
    const req = cents(rule.minUsdCents);
    const rem = Math.max(0, req - curU);
    const ratio = Math.min(1, curU / req);
    out.usdReq = { current: curU, required: req, remainingCents: rem, ratio };
    if (rem > 0) out.eligible = false;
  }

  // Tooltip message
  const needs: string[] = [];
  if (out.sendReq && out.sendReq.remaining > 0) {
    needs.push(out.sendReq.remaining === 1 ? '1 more send' : `${out.sendReq.remaining} more sends`);
  }
  if (out.usdReq && out.usdReq.remainingCents > 0) {
    const d = out.usdReq.remainingCents;
    // round up to whole dollars for readability
    const dollarsUp = Math.ceil(d / 100);
    needs.push(`$${dollarsUp} more sent`);
  }
  out.tooltip = out.eligible ? 'Ready to apply' : `Unlock by ${needs.join(' and ')}`;
  return out;
}
