/**
 * Nominatim Reverse Geocoding Service (OpenStreetMap)
 * Converts GPS latitude & longitude into precise real-world street and city addresses.
 * Free, open-source with in-memory caching to comply with OSM usage guidelines.
 */

// In-memory cache to prevent redundant API calls for nearby or identical coordinates
const geocodeCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Builds a clean, professional address string from Nominatim address components.
 */
function formatAddress(addressObj, displayName, lat, lon) {
  if (!addressObj || Object.keys(addressObj).length === 0) {
    return displayName || `Location (${Number(lat).toFixed(4)}°, ${Number(lon).toFixed(4)}°)`;
  }

  // 1. Street / Building / Landmark
  const primary = addressObj.road || 
                  addressObj.street || 
                  addressObj.pedestrian || 
                  addressObj.building || 
                  addressObj.amenity || 
                  addressObj.commercial || 
                  '';

  // 2. Neighbourhood / Suburb / Area
  const area = addressObj.suburb || 
               addressObj.neighbourhood || 
               addressObj.quarter || 
               addressObj.city_district || 
               addressObj.locality || 
               '';

  // 3. City / Town / Village
  const city = addressObj.city || 
               addressObj.town || 
               addressObj.village || 
               addressObj.municipality || 
               addressObj.county || 
               '';

  // 4. State
  const state = addressObj.state || '';

  // 5. Postal Code
  const postcode = addressObj.postcode ? `(${addressObj.postcode})` : '';

  // Filter empty strings and deduplicate
  const parts = [];
  [primary, area, city, state, postcode].forEach((item) => {
    const trimmed = (item || '').trim();
    if (trimmed && !parts.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      parts.push(trimmed);
    }
  });

  if (parts.length > 0) {
    return parts.join(', ');
  }

  // Fallback to first 3 segments of display_name or coordinates
  if (displayName) {
    const displaySegments = displayName.split(',').map((s) => s.trim()).filter(Boolean);
    return displaySegments.slice(0, 4).join(', ');
  }

  return `Location (${Number(lat).toFixed(4)}°, ${Number(lon).toFixed(4)}°)`;
}

export const nominatimService = {
  /**
   * Reverse geocodes coordinates to a human-readable address.
   *
   * @param {number|string} latitude
   * @param {number|string} longitude
   * @param {Object} [options]
   * @param {number} [options.timeoutMs=6000] Request timeout in milliseconds
   * @returns {Promise<{
   *   success: boolean,
   *   formattedAddress: string,
   *   displayName: string,
   *   addressDetails: Object,
   *   coordinates: { lat: number, lon: number },
   *   cached?: boolean,
   *   error?: string
   * }>}
   */
  async getPreciseLocation(latitude, longitude, options = {}) {
    const numLat = Number(latitude);
    const numLon = Number(longitude);

    if (isNaN(numLat) || isNaN(numLon)) {
      return {
        success: false,
        formattedAddress: 'Invalid GPS Coordinates',
        displayName: '',
        addressDetails: {},
        coordinates: { lat: 0, lon: 0 },
        error: 'Invalid coordinates provided'
      };
    }

    // Cache key rounded to 4 decimals (~11m resolution)
    const cacheKey = `${numLat.toFixed(4)}_${numLon.toFixed(4)}`;
    const now = Date.now();

    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return {
          ...cached.data,
          cached: true
        };
      }
      geocodeCache.delete(cacheKey);
    }

    const timeoutMs = options.timeoutMs || 6000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Zoom 18 provides high-precision building/street level address details
      const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${numLat}&lon=${numLon}&zoom=18&addressdetails=1`;

      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nominatim HTTP error: ${response.status}`);
      }

      const data = await response.json();
      const address = data.address || {};
      const formattedAddress = formatAddress(address, data.display_name, numLat, numLon);

      const result = {
        success: true,
        formattedAddress,
        displayName: data.display_name || formattedAddress,
        addressDetails: address,
        coordinates: { lat: numLat, lon: numLon },
        cached: false
      };

      // Store in memory cache
      geocodeCache.set(cacheKey, { timestamp: now, data: result });

      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const errMsg = isAbort ? 'Nominatim request timed out' : err.message;
      console.warn('[NominatimService] Reverse geocode failed, using fallback:', errMsg);

      return {
        success: false,
        formattedAddress: `Location (${numLat.toFixed(4)}°, ${numLon.toFixed(4)}°)`,
        displayName: '',
        addressDetails: {},
        coordinates: { lat: numLat, lon: numLon },
        error: errMsg
      };
    }
  }
};
