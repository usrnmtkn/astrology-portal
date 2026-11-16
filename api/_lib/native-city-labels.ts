// Unmodified label helpers from apps/web/src/services/mapbox.ts.
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

export function formatSuggestionLabel(feature: MapboxFeature) {
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
