import { PublicClientApplication, Configuration } from "@azure/msal-node";
import { KeychainPersistence, PersistenceCachePlugin } from "@azure/msal-node-extensions";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import * as http from "http";
import open from "open";
import { AuthError } from "./errors.js";
import { logger } from "./logger.js";

const CONFIG_DIR = path.join(os.homedir(), ".config", "calendit");

function getTokenPath(name?: string): string {
  const filename = name ? `google_token_${name}.json` : "google_token.json";
  return path.join(CONFIG_DIR, filename);
}

export class AuthManager {
  private msalClient?: PublicClientApplication;

  constructor() {}

  /**
   * Outlook (Microsoft Graph) 認証の初期化と取得
   */
  async getOutlookClient(clientId: string, tenantId: string = "common") {
    if (!this.msalClient) {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      const cachePath = path.join(CONFIG_DIR, "msal_cache.json");
      const persistence = await KeychainPersistence.create(cachePath, "calendit-service", "outlook-account");
      const cachePlugin = new PersistenceCachePlugin(persistence);

      const msalConfig: Configuration = {
        auth: {
          clientId,
          authority: `https://login.microsoftonline.com/${tenantId}`,
        },
        cache: {
          cachePlugin,
        },
      };

      this.msalClient = new PublicClientApplication(msalConfig);
    }
    return this.msalClient;
  }

  /**
   * Google 認証クライアントの取得
   */
  async getGoogleAuth(clientId: string, clientSecret: string, accountId?: string): Promise<OAuth2Client> {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, "http://localhost:3000");
    const tokenPath = getTokenPath(accountId);

    try {
      const tokenData = await fs.readFile(tokenPath, "utf-8");
      oauth2Client.setCredentials(JSON.parse(tokenData));
    } catch (e) {
      // トークンがない場合は何もしない
    }

    return oauth2Client;
  }

  /**
   * Google の対話型ログインフロー
   */
  async loginGoogle(clientId: string, clientSecret: string, accountId?: string): Promise<void> {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, "http://localhost:3000");
    const tokenPath = getTokenPath(accountId);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar"],
      prompt: "consent",
    });

    logger.info(`Opening browser for Google Authentication (${accountId || "default"})...`);
    logger.info("URL:", authUrl);
    logger.info("ブラウザが開かない場合は上記URLを手動で開いてください。3分以内に認証を完了してください。");

    return new Promise((resolve, reject) => {
      let server: http.Server;
      const timeout = setTimeout(() => {
        server.close();
        reject(
          new AuthError(
            "Google 認証がタイムアウトしました。",
            "再度 `calendit auth login google` を実行して、3分以内に認証を完了してください。",
          ),
        );
      }, 180_000);
      server = http.createServer(async (req, res) => {
        try {
          const url = new URL(req.url!, `http://${req.headers.host}`);
          const code = url.searchParams.get("code");

          if (code) {
            const { tokens } = await oauth2Client.getToken(code);
            await fs.mkdir(CONFIG_DIR, { recursive: true });
            await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
            
            res.end("Authentication successful! You can close this tab and return to the terminal.");
            clearTimeout(timeout);
            server.close();
            resolve();
          } else {
            res.end("No code found in the redirect.");
          }
        } catch (e) {
          res.end("Authentication failed.");
          clearTimeout(timeout);
          reject(e);
        }
      });

      server.listen(3000, () => {
        open(authUrl);
      });
    });
  }

  /**
   * Outlook の対話型ログインフロー
   */
  async loginOutlook(clientId: string, tenantId: string = "common", accountId?: string): Promise<void> {
    const pca = await this.getOutlookClient(clientId, tenantId);
    
    const authCodeUrlParameters = {
      scopes: ["https://graph.microsoft.com/Calendars.ReadWrite"],
      redirectUri: "http://localhost:3000",
    };

    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);

    logger.info(`Opening browser for Outlook Authentication (${accountId || "default"})...`);
    logger.info("URL:", authUrl);
    logger.info("ブラウザが開かない場合は上記URLを手動で開いてください。3分以内に認証を完了してください。");

    return new Promise((resolve, reject) => {
      let server: http.Server;
      const timeout = setTimeout(() => {
        server.close();
        reject(
          new AuthError(
            "Outlook 認証がタイムアウトしました。",
            "再度 `calendit auth login outlook` を実行して、3分以内に認証を完了してください。",
          ),
        );
      }, 180_000);
      server = http.createServer(async (req, res) => {
        try {
          const url = new URL(req.url!, `http://${req.headers.host}`);
          const code = url.searchParams.get("code");

          if (code) {
            await pca.acquireTokenByCode({
              code,
              scopes: ["https://graph.microsoft.com/Calendars.ReadWrite"],
              redirectUri: "http://localhost:3000",
            });
            
            res.end("Authentication successful! You can close this tab and return to the terminal.");
            clearTimeout(timeout);
            server.close();
            resolve();
          } else {
            res.end("No code found in the redirect.");
          }
        } catch (e) {
          res.end("Authentication failed.");
          clearTimeout(timeout);
          reject(e);
        }
      });

      server.listen(3000, () => {
        open(authUrl);
      });
    });
  }
}
