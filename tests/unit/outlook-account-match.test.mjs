import test from "node:test";
import assert from "node:assert/strict";
import {
  outlookAccountMatchesConfig,
  pickOutlookMsalAccount,
} from "../../dist/core/outlookAccountMatch.js";

test("outlookAccountMatchesConfig: case-insensitive email", () => {
  const account = { username: "User@OUTLOOK.com", homeAccountId: "x.y", environment: "login.windows.net", tenantId: "y" };
  assert.equal(outlookAccountMatchesConfig(account, "user@outlook.com"), true);
});

test("pickOutlookMsalAccount: no accountId uses first entry", () => {
  const a = { username: "a@b.com", homeAccountId: "1.2", environment: "login.windows.net", tenantId: "2" };
  const b = { username: "c@d.com", homeAccountId: "3.4", environment: "login.windows.net", tenantId: "4" };
  assert.equal(pickOutlookMsalAccount([a, b], undefined), a);
});

test("pickOutlookMsalAccount: no fallback when accountId set and no match", () => {
  const a = { username: "other@outlook.com", homeAccountId: "1.2", environment: "login.windows.net", tenantId: "2" };
  assert.equal(pickOutlookMsalAccount([a], "ivis.klain@outlook.com"), undefined);
});

test("pickOutlookMsalAccount: finds match with trimmed / case", () => {
  const a = { username: "IVIS.KLAIN@OUTLOOK.COM", homeAccountId: "1.2", environment: "login.windows.net", tenantId: "2" };
  assert.equal(pickOutlookMsalAccount([a], "  ivis.klain@outlook.com  "), a);
});
