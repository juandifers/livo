const errorMap = {
  'Login failed': 'Login Failed',
  'Invalid credentials': 'Login Failed',
  'Failed to reset password': 'Failed to reset password',
  'Failed to complete account setup': 'Failed to complete account setup',
  'Failed to change password': 'Failed to change password',
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
