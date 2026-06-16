from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from tldrastro_api.models import TimezoneRequest, TimezoneResponse


def _timezone_at(latitude: float, longitude: float) -> str:
    from timezonefinder import TimezoneFinder

    finder = TimezoneFinder()
    time_zone = finder.timezone_at(lat=latitude, lng=longitude)
    if not time_zone:
        time_zone = finder.closest_timezone_at(lat=latitude, lng=longitude)
    if not time_zone:
        raise ValueError("No timezone found for the supplied coordinates.")
    return time_zone


def resolve_timezone(request: TimezoneRequest) -> TimezoneResponse:
    warnings = []
    source = "coordinates"

    if request.timeZone:
        time_zone_name = request.timeZone
        source = "request"
    else:
        try:
            time_zone_name = _timezone_at(request.latitude, request.longitude)
        except Exception as error:
            warnings.append(f"Timezone lookup failed: {error}")
            time_zone_name = "UTC"
            source = "fallback"

    try:
        local_zone = ZoneInfo(time_zone_name)
    except Exception:
        warnings.append(f"Timezone '{time_zone_name}' was not recognized; UTC was used.")
        time_zone_name = "UTC"
        local_zone = timezone.utc
        source = "fallback"

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

