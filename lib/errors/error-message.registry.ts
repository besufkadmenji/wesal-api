import { TranslatedError } from '../i18n/i18n.service';

/**
 * Central registry for all error messages across entities
 */
class ErrorMessageRegistry {
  private messages: Map<string, TranslatedError> = new Map();

  /**
   * Register error messages from an entity
   */
  register(messages: Record<string, TranslatedError>): void {
    Object.entries(messages).forEach(([code, message]) => {
      this.messages.set(code, message);
    });
  }

  /**
   * Get translated error message by code
   */
  get(code: string): TranslatedError | undefined {
    return this.messages.get(code);
  }

  /**
   * Check if error code exists
   */
  has(code: string): boolean {
    return this.messages.has(code);
  }
}

// Export singleton instance
export const errorMessageRegistry = new ErrorMessageRegistry();
