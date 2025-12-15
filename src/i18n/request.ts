import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

const locales = ['en', 'de'];

export default getRequestConfig(async (params) => {
    // console.log('--- i18n Request call:', params);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userLocale = (params as any).locale; // Try to get locale

    // If undefined, maybe using newer next-intl with requestLocale?
    // We will just default to 'en' if undefined to prevent 404, or use requestLocale if available.

    if (!userLocale || !locales.includes(userLocale)) {
        console.warn('--- Invalid or missing locale:', userLocale, 'Defaulting to en');
        userLocale = 'en';
    }

    return {
        locale: userLocale,
        messages: (await import(`../../messages/${userLocale}.json`)).default
    };
});
