export type CalendarServiceType = 'google' | 'outlook';

export interface CalendarEvent {
  id?: string;
  summary: string;
  start: string; // ISO 8601
  end: string;   // ISO 8601
  location?: string;
  description?: string;
  service: CalendarServiceType;
  calendarId: string;
}

export interface CalendarInfo {
  id: string;
  name: string;
  service: CalendarServiceType;
  isPrimary: boolean;
  canEdit: boolean;
}

export interface ProviderCapabilities {
  webConferencing: boolean;
  bulkOperations: boolean;
}

export interface ContextConfig {
  service: CalendarServiceType;
  calendarId: string;
  accountId?: string; // 認証トークンの識別子
  fields?: string[];
  defaultFormat?: 'csv' | 'md' | 'json';
}

export interface AppConfig {
  contexts: Record<string, ContextConfig>;
}

export interface GoogleCredentials {
  id: string;
  secret: string;
}

export interface OutlookCredentials {
  id: string;
  tenantId: string;
}

export interface FullAppConfig extends AppConfig {
  google_creds?: GoogleCredentials;
  outlook_creds?: OutlookCredentials;
}
