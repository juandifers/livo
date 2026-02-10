/**
 * Cloudinary configuration for asset photo uploads.
 * Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in env.
 * When configured, uploads go to Cloudinary; otherwise backend falls back to local disk (dev only).
 */
const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

/**
 * Upload an image buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - e.g. 'image/jpeg'
 * @param {string} [folder='livo-assets'] - Cloudinary folder
 * @returns {Promise<{ secure_url: string }>}
 */
async function uploadBuffer(buffer, mimetype, folder = 'livo-assets') {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
  }
  const b64 = buffer.toString('base64');
  const dataUri = `data:${mimetype};base64,${b64}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
  });
  return { secure_url: result.secure_url };
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured: isConfigured,
  uploadBuffer,
};
