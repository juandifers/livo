const errorMap = {
  'Login failed': 'Login Failed',
  'Invalid credentials': 'Login Failed',
  'Failed to reset password': 'Failed to reset password',
  'Failed to complete account setup': 'Failed to complete account setup',
  'Failed to change password': 'Failed to change password',
  'Failed to delete account': 'Failed to delete account',
  'Account deletion endpoint is unavailable. Please update backend deployment.': 'Account deletion endpoint is unavailable. Please update backend deployment.',
  'Unable to reach server. Please check your connection and try again.': 'Unable to reach server. Please check your connection and try again.',
  'Current password is incorrect': 'Current password is incorrect',
  'You have upcoming bookings. Cancel them before deleting your account.': 'You have upcoming bookings. Cancel them before deleting your account.',
  'You cannot delete your account while you are an owner of one or more assets. Please contact an administrator.': 'You cannot delete your account while you are an owner of one or more assets. Please contact an administrator.',
  'Failed to create booking': 'Failed to create booking. Please try again.',
  'Request failed': 'An unexpected error occurred',
};

export function mapCommonApiError(rawMessage, t, fallbackKey = 'An unexpected error occurred') {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return t(fallbackKey);
  }

  const trimmed = rawMessage.trim();
  if (!trimmed) {
    return t(fallbackKey);
  }

  const direct = errorMap[trimmed];
  if (direct) {
    return t(direct);
  }

  const matched = Object.entries(errorMap).find(([fragment]) =>
    trimmed.toLowerCase().includes(fragment.toLowerCase())
  );

  if (matched) {
    return t(matched[1]);
  }

  return rawMessage;
}
