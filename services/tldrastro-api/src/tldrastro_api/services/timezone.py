import json
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import urlopen
from zoneinfo import ZoneInfo

from tldrastro_api.config import get_settings
from tldrastro_api.models import TimezoneRequest, TimezoneResponse

GOOGLE_TIMEZONE_ENDPOINT = "https://maps.googleapis.com/maps/api/timezone/json"


def timezone_at(latitude: float, longitude: float) -> str:
    from timezonefinder import TimezoneFinder

    finder = TimezoneFinder()
    time_zone = finder.timezone_at(lat=latitude, lng=longitude)
    if not time_zone:
        time_zone = finder.closest_timezone_at(lat=latitude, lng=longitude)
    if not time_zone:
        raise ValueError("No timezone found for the supplied coordinates.")

    return time_zone


def _timestamp_for_google_lookup(date_value: str) -> int:
    # Google needs an instant, but timezone identity is coordinate-based. Noon UTC avoids
    # date-edge surprises while ZoneInfo below computes the actual local birth offset.
    return round(datetime.fromisoformat(f"{date_value}T12:00:00").replace(tzinfo=timezone.utc).timestamp())


def google_timezone_at(latitude: float, longitude: float, date_value: str, api_key: str) -> str:
    params = urlencode({
        "location": f"{latitude},{longitude}",
        "timestamp": str(_timestamp_for_google_lookup(date_value)),
        "key": api_key,
    })
    url = f"{GOOGLE_TIMEZONE_ENDPOINT}?{params}"

    with urlopen(url, timeout=6) as response:
        payload = json.loads(response.read().decode("utf-8"))

    status = payload.get("status")
    time_zone_name = payload.get("timeZoneId")

    if status != "OK" or not time_zone_name:
        message = payload.get("errorMessage") or payload.get("error_message") or status or "unknown error"
        raise ValueError(f"Google Time Zone API lookup failed: {message}")

    return str(time_zone_name)


def resolve_timezone_name(latitude: float, longitude: float, date_value: str):
    settings = get_settings()

    if settings.google_timezone_api_key:
        try:
            return google_timezone_at(latitude, longitude, date_value, settings.google_timezone_api_key), "google", []
        except Exception as error:
            try:
                return timezone_at(latitude, longitude), "coordinates", [
                    f"Google timezone lookup failed; timezonefinder was used instead ({error})."
                ]
            except Exception as fallback_error:
                raise ValueError(
                    f"Google timezone lookup failed ({error}); timezonefinder failed ({fallback_error})"
                ) from fallback_error

    return timezone_at(latitude, longitude), "coordinates", []


def resolve_timezone(request: TimezoneRequest) -> TimezoneResponse:
    warnings = []
    source = "coordinates"

    if request.timeZone:
        time_zone_name = request.timeZone
        source = "request"
    else:
        try:
            resolved = resolve_timezone_name(request.latitude, request.longitude, request.date)
            time_zone_name, source, lookup_warnings = resolved
            warnings.extend(lookup_warnings)
        except Exception as error:
            raise ValueError(f"Timezone lookup failed: {error}") from error

    try:
        local_zone = ZoneInfo(time_zone_name)
    except Exception as error:
        raise ValueError(f"Timezone '{time_zone_name}' was not recognized.") from error

    time_value = request.time or "12:00"
    local = datetime.fromisoformat(f"{request.date}T{time_value}:00").replace(tzinfo=local_zone)
    utc = local.astimezone(timezone.utc)
    offset = local.utcoffset()
    dst = local.dst()

    return TimezoneResponse(
        timeZone=time_zone_name,
        utcOffsetMinutes=round(offset.total_seconds() / 60) if offset else 0,
        isDst=bool(dst and dst.total_seconds() != 0),
        localDateTime=local.isoformat(),
        utcDateTime=utc.isoformat(),
        source=source,
        warnings=warnings,
    )
