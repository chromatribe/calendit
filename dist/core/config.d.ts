import { ContextConfig, GoogleCredentials, OutlookCredentials } from "../types/index.js";
export declare class ConfigManager {
    private config;
    constructor();
    load(): Promise<void>;
    save(): Promise<void>;
    getContext(name: string): ContextConfig | undefined;
    setContext(name: string, context: ContextConfig): void;
    getAllContexts(): Record<string, ContextConfig>;
    getGoogleCreds(): GoogleCredentials | undefined;
    setGoogleCreds(id: string, secret: string): void;
    getOutlookCreds(): OutlookCredentials | undefined;
    setOutlookCreds(id: string, tenantId: string): void;
}
