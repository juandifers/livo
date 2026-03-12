require('dotenv').config();

const parseBooleanEnv = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === 'true';
};

const parseIntegerEnv = (value, defaultValue) => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? defaultValue : parsedValue;
};

const parseCsvEnv = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const normalizeOrigin = (origin) =>
  String(origin || '')
    .trim()
    .replace(/\/$/, '');

const parseOrigin = (origin) => {
  try {
    const url = new URL(normalizeOrigin(origin));
    return {
      origin: url.origin,
      protocol: url.protocol,
      hostname: url.hostname.toLowerCase(),
      port: url.port || ''
    };
  } catch (_error) {
    return null;
  }
};

const parseAllowedOriginPattern = (allowedOrigin) => {
  const normalized = normalizeOrigin(allowedOrigin);
  if (!normalized) return null;
  if (normalized === '*') {
    return { any: true };
  }

  if (!normalized.includes('*')) {
    const parsed = parseOrigin(normalized);
    return parsed ? { ...parsed, wildcardHost: false } : null;
  }

  const wildcardMatch = normalized.match(/^(https?):\/\/\*\.([^/:]+)(?::(\d+))?$/i);
  if (!wildcardMatch) {
    return null;
  }

  return {
    any: false,
    protocol: `${wildcardMatch[1].toLowerCase()}:`,
    hostnameSuffix: wildcardMatch[2].toLowerCase(),
    port: wildcardMatch[3] || '',
    wildcardHost: true
  };
};

const isOriginAllowed = (origin, allowedOrigins = []) => {
  const parsedOrigin = parseOrigin(origin);
  if (!parsedOrigin) return false;

  return allowedOrigins.some((allowedOrigin) => {
    const parsedAllowedOrigin = parseAllowedOriginPattern(allowedOrigin);
    if (!parsedAllowedOrigin) return false;
    if (parsedAllowedOrigin.any) return true;

    if (parsedAllowedOrigin.wildcardHost) {
      if (parsedAllowedOrigin.protocol !== parsedOrigin.protocol) return false;
      if (parsedAllowedOrigin.port && parsedAllowedOrigin.port !== parsedOrigin.port) return false;
      if (parsedOrigin.hostname === parsedAllowedOrigin.hostnameSuffix) return false;
      return parsedOrigin.hostname.endsWith(`.${parsedAllowedOrigin.hostnameSuffix}`);
    }

    return parsedAllowedOrigin.origin === parsedOrigin.origin;
  });
};

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const defaultMongoUri = 'mongodb://localhost:27017/assetBookingSystem';
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || (isProduction ? '' : defaultMongoUri);
const jwtSecret = process.env.JWT_SECRET || 'yourSecretKey';

if (isProduction && !mongoURI) {
  throw new Error('MONGODB_URI (or MONGO_URI) must be set in production.');
}

if (isProduction && (!process.env.JWT_SECRET || jwtSecret === 'yourSecretKey')) {
  throw new Error('JWT_SECRET must be set to a non-default value in production.');
}

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

module.exports = {
  port: process.env.PORT || 3000,
  env,

  // Prefer MONGODB_URI; fallback to MONGO_URI; final fallback to local
  mongoURI,

  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRE || '30d',
    cookieExpire: parseIntegerEnv(process.env.JWT_COOKIE_EXPIRE, 30)
  },

  // Rate limiting settings
  rateLimit: {
    windowMs: parseIntegerEnv(process.env.RATE_LIMIT_WINDOW, 15 * 60 * 1000), // 15 minutes
    maxRequests: parseIntegerEnv(process.env.RATE_LIMIT_MAX, 100), // Limit each IP to 100 requests per windowMs
    authWindowMs: parseIntegerEnv(process.env.AUTH_RATE_LIMIT_WINDOW, 60 * 60 * 1000), // 1 hour
    authMaxRequests: parseIntegerEnv(process.env.AUTH_RATE_LIMIT_MAX, 5), // Limit each IP to 5 login attempts per hour
    passwordResetWindowMs: parseIntegerEnv(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW, 60 * 60 * 1000), // 1 hour
    passwordResetMaxRequests: parseIntegerEnv(process.env.PASSWORD_RESET_RATE_LIMIT_MAX, 3) // Limit each IP to 3 password reset requests per hour
  },

  // CORS allowlist
  cors: {
    allowedOrigins: parseCsvEnv(process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGINS),
    allowAllInDevelopment: parseBooleanEnv(process.env.CORS_ALLOW_ALL_IN_DEV, true),
    isOriginAllowed: (origin) =>
      isOriginAllowed(origin, parseCsvEnv(process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGINS))
  },

  // Proxy setting required for accurate client IP behind Vercel/load balancers
  trustProxy: parseIntegerEnv(process.env.TRUST_PROXY, 1),

  // Email configuration
  email: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    username: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
    from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
    fromName: process.env.FROM_NAME || 'Asset Booking System',
    strictTransport: parseBooleanEnv(process.env.EMAIL_STRICT_TRANSPORT, true),
    allowMockFallback: parseBooleanEnv(process.env.ALLOW_EMAIL_MOCK_FALLBACK, false)
  },

  // URLs used in account setup and password reset emails
  baseUrl,
  accountSetupUrlBase: process.env.ACCOUNT_SETUP_URL_BASE || `${baseUrl}/account-setup.html`,
  passwordResetUrlBase: process.env.PASSWORD_RESET_URL_BASE || `${baseUrl}/reset-password.html`
};
