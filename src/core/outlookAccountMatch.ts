import type { AccountInfo } from "@azure/msal-node";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * MSAL キャッシュ上のアカウントが、コンテキストの `accountId`（メールまたは homeAccountId）に対応するか。
 */
export function outlookAccountMatchesConfig(account: AccountInfo, configAccountId: string): boolean {
  const want = norm(configAccountId);
  if (!want) return false;
  if (norm(account.username) === want) return true;
  if (account.homeAccountId && norm(account.homeAccountId) === want) return true;
  return false;
}

/**
 * `accountId` 未指定のときは先頭アカウント。指定時は一致するもののみ（フォールバックしない）。
 */
export function pickOutlookMsalAccount(accounts: AccountInfo[], accountId: string | undefined): AccountInfo | undefined {
  if (accounts.length === 0) return undefined;
  const id = accountId?.trim();
  if (!id) return accounts[0];
  return accounts.find((a) => outlookAccountMatchesConfig(a, id));
}

export function formatOutlookCacheUsernames(accounts: AccountInfo[]): string {
  return accounts.map((a) => a.username || a.homeAccountId || "(unknown)").join(", ");
}
