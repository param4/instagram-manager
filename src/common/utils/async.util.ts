/**
 * Async helper utilities.
 */
export class AsyncUtil {
  /**
   * Delays execution for the specified duration.
   *
   * @param ms - Milliseconds to sleep
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
