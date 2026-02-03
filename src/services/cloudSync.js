/**
 * Cloud Sync Service for WhitTech Estimator
 * Provides D1 cloud persistence with local IndexedDB fallback
 */

const API_BASE = window.location.hostname === 'localhost'
    ? 'https://jwhitton.com'
    : '';

const APP_NAME = 'estimator';

/**
 * Check if cloud storage is available
 */
export async function isCloudAvailable() {
    try {
        const response = await fetch(`${API_BASE}/api/data/${APP_NAME}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        return response.ok;
    } catch (error) {
        console.warn('Cloud storage not available:', error.message);
        return false;
    }
}

/**
 * Load database from cloud storage
 * @returns {Promise<{database: string, version: number, lastModified: string} | null>}
 */
export async function loadFromCloud() {
    try {
        const response = await fetch(`${API_BASE}/api/data/${APP_NAME}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            console.warn('Cloud load failed:', response.status);
            return null;
        }

        const result = await response.json();

        // Check if we have database data
        if (result.data && result.data.database) {
            console.log('✓ Loaded data from cloud storage');
            return result.data;
        }

        return null;
    } catch (error) {
        console.warn('Cloud load error:', error.message);
        return null;
    }
}

/**
 * Save database to cloud storage
 * @param {Uint8Array} dbExport - The exported SQLite database
 * @returns {Promise<boolean>}
 */
export async function saveToCloud(dbExport) {
    try {
        // Convert Uint8Array to base64 string for JSON transport
        const base64 = uint8ArrayToBase64(dbExport);

        const payload = {
            database: base64,
            version: 1,
            lastModified: new Date().toISOString()
        };

        const response = await fetch(`${API_BASE}/api/data/${APP_NAME}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.warn('Cloud save failed:', response.status);
            return false;
        }

        console.log('✓ Data synced to cloud');
        return true;
    } catch (error) {
        console.warn('Cloud save error:', error.message);
        return false;
    }
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(uint8Array) {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
