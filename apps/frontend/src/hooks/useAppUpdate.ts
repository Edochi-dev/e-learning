import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Browsers only look for a new service worker on navigation; an installed
// app left open for days would never notice a deploy without this.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export const useAppUpdate = () => {
    const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
    const {
        needRefresh: [updateAvailable, setUpdateAvailable],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW: (_url, reg) => setRegistration(reg),
    });

    useEffect(() => {
        if (!registration) return;

        const check = () => {
            if (navigator.onLine && !registration.installing) {
                registration.update().catch(() => undefined);
            }
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible') check();
        };

        const interval = window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [registration]);

    return {
        updateAvailable,
        applyUpdate: () => updateServiceWorker(true),
        dismiss: () => setUpdateAvailable(false),
    };
};
