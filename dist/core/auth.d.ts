import { PublicClientApplication } from "@azure/msal-node";
import { OAuth2Client } from "google-auth-library";
export declare class AuthManager {
    private msalClient?;
    constructor();
    /**
     * Outlook (Microsoft Graph) 認証の初期化と取得
     */
    getOutlookClient(clientId: string, tenantId?: string): Promise<PublicClientApplication>;
    /**
     * Google 認証クライアントの取得
     */
    getGoogleAuth(clientId: string, clientSecret: string, accountId?: string): Promise<OAuth2Client>;
    /**
     * Google の対話型ログインフロー
     */
    loginGoogle(clientId: string, clientSecret: string, accountId?: string): Promise<void>;
    /**
     * Outlook の対話型ログインフロー
     */
    loginOutlook(clientId: string, tenantId?: string, accountId?: string): Promise<void>;
}
