
export class RetentionManager {
    /**
     * Triggers the cleanup of local logs older than the specified number of days.
     * @param days Number of days to retain logs (logs older than this will be deleted).
     * @returns Promise resolving to the number of deleted records.
     */
    static async runCleanup(days: number): Promise<number> {
        try {
            console.log(`RetentionManager: Starting cleanup for logs older than ${days} days...`);
            const deletedCount = await (window as any).api.cleanupData(days);
            console.log(`RetentionManager: Cleanup complete. Deleted ${deletedCount} records.`);
            return deletedCount;
        } catch (error) {
            console.error('RetentionManager: Cleanup failed', error);
            throw error;
        }
    }
}
