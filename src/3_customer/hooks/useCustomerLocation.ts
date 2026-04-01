import { useCallback, useEffect, useState } from 'react';

export interface CustomerLocation {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp: number;
}

export type LocationStatus = 'idle' | 'loading' | 'ready' | 'error';

const LOCATION_STORAGE_KEY = 'ss_customer_location';
const LOCATION_TTL_MS = 30 * 60 * 1000;

const readCachedLocation = (): CustomerLocation | null => {
    try {
        const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CustomerLocation;
        if (!parsed?.timestamp) return null;
        if (Date.now() - parsed.timestamp > LOCATION_TTL_MS) return null;
        if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
        return parsed;
    } catch {
        return null;
    }
};

export const useCustomerLocation = () => {
    const [location, setLocation] = useState<CustomerLocation | null>(null);
    const [status, setStatus] = useState<LocationStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cached = readCachedLocation();
        if (cached) {
            setLocation(cached);
            setStatus('ready');
        }
    }, []);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported on this device.');
            setStatus('error');
            return;
        }

        setStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const next: CustomerLocation = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: Date.now(),
                };
                setLocation(next);
                setStatus('ready');
                setError(null);
                try {
                    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
                } catch {
                    // Ignore storage failures.
                }
            },
            (err) => {
                setError(err.message || 'Unable to access location.');
                setStatus('error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5 * 60 * 1000,
            }
        );
    }, []);

    const clearLocation = useCallback(() => {
        setLocation(null);
        setStatus('idle');
        setError(null);
        try {
            localStorage.removeItem(LOCATION_STORAGE_KEY);
        } catch {
            // Ignore storage failures.
        }
    }, []);

    return {
        location,
        status,
        error,
        requestLocation,
        clearLocation,
    };
};
