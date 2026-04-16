export class AbstractCalendarService {
    /**
     * 予定データの正規化 (共通処理)
     */
    normalizeEvent(event) {
        const normalized = { ...event };
        if (normalized.summary)
            normalized.summary = normalized.summary.trim();
        if (normalized.location)
            normalized.location = normalized.location.trim();
        return normalized;
    }
    /**
     * エラーの正規化 (各サービスでオーバーライド可能)
     */
    normalizeError(error) {
        const providerId = this.getProviderId();
        if (error instanceof Error) {
            error.message = `[${providerId}] ${error.message}`;
            return error;
        }
        return new Error(`[${providerId}] Unknown error: ${JSON.stringify(error)}`);
    }
}
