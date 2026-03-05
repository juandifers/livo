import type { Locale } from './constants';
import { translate } from './index';

const errorMap: Record<string, string> = {
  'Login failed': 'Login failed',
  'Invalid or expired reset link.': 'Invalid or expired reset link.',
  'Failed to send password reset email': 'Failed to send password reset email',
  'Failed to reset password.': 'Failed to reset password.',
  'Failed to complete account setup.': 'Failed to complete account setup.',
  'Failed to change password': 'Failed to change password',
};

export function mapCommonApiError(locale: Locale, rawMessage: string, fallback = 'Error') {
  if (!rawMessage) {
    return translate(locale, fallback);
  }

  const direct = errorMap[rawMessage];
  if (direct) {
    return translate(locale, direct);
  }

  const normalized = rawMessage.toLowerCase();
  const found = Object.entries(errorMap).find(([fragment]) => normalized.includes(fragment.toLowerCase()));
  if (found) {
    return translate(locale, found[1]);
  }

  return rawMessage;
}
