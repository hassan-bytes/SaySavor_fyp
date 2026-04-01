import { useCallback, useEffect, useState } from 'react';

export interface CustomerLocation {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp: number;
}

export type LocationStatus = 'idle' | 'loading' | 'ready' | 'error';
export type LocationPermissionStatus = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

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
    const [permission, setPermission] = useState<LocationPermissionStatus>('unknown');

    useEffect(() => {
        const cached = readCachedLocation();
        if (cached) {
            setLocation(cached);
            setStatus('ready');
        }

        if (!navigator.permissions?.query) {
            setPermission('unsupported');
            return;
        }

        let active = true;

        navigator.permissions
            .query({ name: 'geolocation' as PermissionName })
            .then((perm) => {
                if (!active) return;

                const updatePermission = () => {
                    const state = perm.state as LocationPermissionStatus;
                    setPermission(state);

                    if (state === 'denied') {
                        setStatus((prev) => (prev === 'ready' ? prev : 'error'));
                        setError('Location permission blocked. Please allow location from browser site settings.');
                    }
                };

                updatePermission();
                perm.onchange = updatePermission;
            })
            .catch(() => {
                if (active) {
                    setPermission('unknown');
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported on this device.');
            setStatus('error');
            return;
        }

        if (permission === 'denied') {
            setError('Location permission blocked. Please allow location from browser site settings.');
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
                setPermission('granted');
                try {
                    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
                } catch {
                    // Ignore storage failures.
                }
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setPermission('denied');
                    setError('Location access denied. Please allow permission to continue.');
                } else {
                    setError(err.message || 'Unable to access location.');
                }
                setStatus('error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5 * 60 * 1000,
            }
        );
    }, [permission]);

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
        permission,
        requestLocation,
        clearLocation,
    };
};
