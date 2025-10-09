// List of allowed origins for CORS.
const allowedOrigins = [
  'https://kanbancic-production.up.railway.app', // Production frontend
  'http://localhost:5173',                      // Default Vite dev server
  'http://localhost:3000',                      // Common alternative dev server
];

/**
 * Utility function to handle CORS headers.
 * It checks the request's Origin header against a list of allowed origins.
 * @param {Request} req - The incoming request object.
 * @returns {Object} - The appropriate CORS headers.
 */
export const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin');

  // If the request's origin is in our list of allowed origins,
  // set the Access-Control-Allow-Origin header to that origin.
  // Otherwise, do not set the header, which will cause the browser's
  // CORS check to fail, as intended.
  const corsOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : '';

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  };
};