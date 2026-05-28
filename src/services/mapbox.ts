import type { LocationInput } from "../types";

type MapboxFeature = {
  id: string;
  name?: string;
  place_formatted?: string;
  full_address?: string;
  properties?: {
    mapbox_id?: string;
    name?: string;
    name_preferred?: string;
    place_formatted?: string;
    full_address?: string;
    context?: {
      region?: {
        name?: string;
        region_code?: string;
      };
    };
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

export type CitySuggestion = LocationInput & {
  id: string;
  region: string;
};

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

export function hasMapboxToken() {
  return Boolean(mapboxToken);
}

function withoutCountry(value: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return value.trim();
  }

  return parts.slice(0, -1).join(", ");
}

function regionForFeature(feature: MapboxFeature) {
  const contextRegion = feature.properties?.context?.region;
  const formattedRegion = feature.place_formatted ?? feature.properties?.place_formatted ?? "";
  const region = contextRegion?.name ?? contextRegion?.region_code ?? withoutCountry(formattedRegion);

  return region.trim();
}

function formatSuggestionLabel(feature: MapboxFeature) {
  const fullAddress = feature.full_address ?? feature.properties?.full_address;
  const name = feature.name ?? feature.properties?.name_preferred ?? feature.properties?.name;
  const region = regionForFeature(feature);

  if (name && region && name !== region) {
    return `${name}, ${region}`;
  }

  if (fullAddress) {
    return withoutCountry(fullAddress);
  }

  return name ?? region ?? "Unknown city";
}

export async function searchCities(query: string): Promise<CitySuggestion[]> {
  const trimmed = query.trim();

  if (!mapboxToken || trimmed.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    access_token: mapboxToken,
    autocomplete: "true",
    limit: "5",
    q: trimmed,
    types: "place,locality"
  });

  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Mapbox city search failed with ${response.status}`);
  }

  const data = (await response.json()) as MapboxResponse;

  return (data.features ?? []).flatMap((feature) => {
    const longitude = feature.properties?.coordinates?.longitude ?? feature.geometry?.coordinates?.[0];
    const latitude = feature.properties?.coordinates?.latitude ?? feature.geometry?.coordinates?.[1];

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return [];
    }

    return {
      id: feature.id ?? feature.properties?.mapbox_id ?? `${latitude}-${longitude}`,
      label: formatSuggestionLabel(feature),
      region: regionForFeature(feature),
      latitude,
      longitude
    };
  });
}

export async function reverseGeocodeCity(latitude: number, longitude: number): Promise<LocationInput | null> {
  if (!mapboxToken) {
    return null;
  }

  const params = new URLSearchParams({
    access_token: mapboxToken,
    latitude: String(latitude),
    longitude: String(longitude),
    limit: "1",
    types: "place,locality"
  });

  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Mapbox reverse geocode failed with ${response.status}`);
  }

  const data = (await response.json()) as MapboxResponse;
  const [feature] = data.features ?? [];

  if (!feature) {
    return null;
  }

  return {
    label: formatSuggestionLabel(feature),
    latitude,
    longitude
  };
}
