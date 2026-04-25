/**
 * Built artifacts を前提とした軽量ユニット（`npm test` から実行）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { graphCalendarItemToCalendarInfo, mergeOutlookCalendarsFirstWins } from "../../dist/core/outlookCalendarList.js";

test("graphCalendarItemToCalendarInfo maps Outlook Graph fields", () => {
  const c = graphCalendarItemToCalendarInfo({
    id: "cal-1",
    name: "Work",
    isDefaultCalendar: true,
    canEdit: true,
  });
  assert.equal(c.id, "cal-1");
  assert.equal(c.name, "Work");
  assert.equal(c.service, "outlook");
  assert.equal(c.isPrimary, true);
  assert.equal(c.canEdit, true);
});

test("mergeOutlookCalendarsFirstWins: 同 ID は先勝ち（/me/calendars を先に渡す想定）", () => {
  const fromRoot = graphCalendarItemToCalendarInfo({ id: "x", name: "FromRoot", isDefaultCalendar: false });
  const fromGroup = graphCalendarItemToCalendarInfo({ id: "x", name: "FromGroup" });
  const out = mergeOutlookCalendarsFirstWins([[fromRoot], [fromGroup]]);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "FromRoot");
});

test("mergeOutlookCalendarsFirstWins: 別 ID はすべて残る", () => {
  const a = graphCalendarItemToCalendarInfo({ id: "a", name: "A" });
  const b = graphCalendarItemToCalendarInfo({ id: "b", name: "B" });
  const out = mergeOutlookCalendarsFirstWins([[a], [b]]);
  assert.equal(out.length, 2);
});
