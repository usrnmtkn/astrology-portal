import type { Page } from '@playwright/test';

export const geocodedCaliforniaCity = {
  label: 'Los Angeles, California', latitude: 34.0522, longitude: -118.2437,
  timeZone: 'America/Los_Angeles'
};

/** Select provider coordinates through the same city suggestion UI as a reader. */
export async function selectGeocodedCaliforniaCity(page: Page) {
  await page.route('https://api.mapbox.com/search/geocode/v6/**', route => route.fulfill({ json: {
    features: [{ id: 'qa-california-city', properties: {
      name: 'Los Angeles', context: { region: { name: 'California' } },
      coordinates: { latitude: geocodedCaliforniaCity.latitude, longitude: geocodedCaliforniaCity.longitude }
    } }]
  } }));
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Los Angeles');
  await page.getByRole('option', { name: /Los Angeles, California/ }).click();
}
