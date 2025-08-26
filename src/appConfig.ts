/**
 * Application configuration
 */

// White label configuration
export const APP_NAME = import.meta.env['VITE_APP_NAME'] || 'WorksHub';
export const COMPANY_NAME = import.meta.env['VITE_COMPANY_NAME'] || 'That Works Agency';

// Other app configurations can be added here as needed
export const APP_CONFIG = {
  name: APP_NAME,
  company: COMPANY_NAME,
  fullTitle: `${APP_NAME} - ${COMPANY_NAME}`,
  copyright: `© ${new Date().getFullYear()} ${APP_NAME} by ${COMPANY_NAME}. All rights reserved.`
};
