import { CalendarInfo } from "../types/index.js";

/**
 * Microsoft Graph の calendar リソース 1 件を CalendarInfo に変換する。
 * @see https://learn.microsoft.com/en-us/graph/api/resources/calendar
 */
export function graphCalendarItemToCalendarInfo(item: {
  id: string;
  name?: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
}): CalendarInfo {
  return {
    id: item.id,
    name: item.name ?? "(No Name)",
    service: "outlook",
    isPrimary: Boolean(item.isDefaultCalendar),
    canEdit: item.canEdit !== false,
  };
}

/**
 * `/me/calendars` → 各 `calendarGroups/.../calendars` の順で渡し、**同一 ID は先勝ち**で 1 本化する。
 */
export function mergeOutlookCalendarsFirstWins(layers: CalendarInfo[][]): CalendarInfo[] {
  const byId = new Map<string, CalendarInfo>();
  for (const layer of layers) {
    for (const c of layer) {
      if (!byId.has(c.id)) {
        byId.set(c.id, c);
      }
    }
  }
  return Array.from(byId.values());
}
