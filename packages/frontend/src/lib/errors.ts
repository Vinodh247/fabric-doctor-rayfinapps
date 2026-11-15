import { InvalidSavedDateError, NotSignedInError } from '@/lib/assessment-store';
import { MissingRayfinConfigError } from '@/lib/rayfin-client';

/**
 * Turns a data-service failure into a short, actionable message without
 * exposing backend internals. The original error is logged for diagnosis.
 */
export function friendlyDataError(error: unknown, action: string): string {
  console.error(`Fabric Doctor: failed to ${action}`, error);
  if (error instanceof NotSignedInError || error instanceof InvalidSavedDateError) {
    return error.message;
  }
  if (error instanceof MissingRayfinConfigError) {
    return 'This app is not connected to its Fabric backend. Contact the app owner.';
  }
  if (error instanceof Error && error.message === 'This assessment no longer exists.') {
    return error.message;
  }
  return `Couldn't ${action}. Check your connection and try again.`;
}
