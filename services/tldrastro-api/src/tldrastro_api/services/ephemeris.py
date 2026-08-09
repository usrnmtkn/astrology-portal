from contextvars import ContextVar
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

PROBE_JULIAN_DAY = 2451545.0
REQUESTED_ENGINE = "swiss"

_trace: ContextVar[Optional[Dict[str, Any]]] = ContextVar("ephemeris_trace", default=None)


def _version(swe: Any) -> Optional[str]:
    value = getattr(swe, "__version__", None)
    return str(value) if value is not None else None


def _engine_from_flags(swe: Any, flags: int) -> str:
    if flags & swe.FLG_JPLEPH:
        return "jpl"
    if flags & swe.FLG_SWIEPH:
        return "swiss"
    if flags & swe.FLG_MOSEPH:
        return "moshier"
    return "unknown"


def start_ephemeris_trace(ephemeris_path: Optional[str] = None) -> None:
    _trace.set(
        {
            "engines": set(),
            "returnedFlags": set(),
            "dataPath": ephemeris_path,
            "calculations": 0,
        }
    )


def tracked_calc_ut(swe: Any, julian_day: float, body_id: int, flags: int) -> Tuple[Any, int]:
    result, returned_flags = swe.calc_ut(julian_day, body_id, flags)
    state = _trace.get()
    if state is not None:
        engines: Set[str] = state["engines"]
        returned: Set[int] = state["returnedFlags"]
        engines.add(_engine_from_flags(swe, returned_flags))
        returned.add(returned_flags)
        state["calculations"] += 1
    return result, returned_flags


def ephemeris_provenance(swe: Any) -> Dict[str, object]:
    state = _trace.get()
    engines = sorted(state["engines"]) if state else []
    actual_engine = engines[0] if len(engines) == 1 else "mixed" if engines else "unknown"
    return {
        "library": "pyswisseph",
        "libraryVersion": _version(swe),
        "requestedEngine": REQUESTED_ENGINE,
        "actualEngine": actual_engine,
        "actualEngines": engines,
        "fallback": bool(engines and engines != [REQUESTED_ENGINE]),
        "dataPath": state["dataPath"] if state else None,
        "returnedFlags": sorted(state["returnedFlags"]) if state else [],
        "calculations": state["calculations"] if state else 0,
    }


def merge_ephemeris_provenance(*values: Any) -> Optional[Dict[str, object]]:
    items = [
        value.model_dump() if hasattr(value, "model_dump") else value
        for value in values
        if value is not None
    ]
    if not items:
        return None

    libraries = sorted({str(item["library"]) for item in items})
    versions = sorted(
        {
            str(item["libraryVersion"])
            for item in items
            if item.get("libraryVersion") is not None
        }
    )
    requested_engines = sorted({str(item["requestedEngine"]) for item in items})
    actual_engines = sorted(
        {
            str(engine)
            for item in items
            for engine in item.get("actualEngines", [])
        }
    )
    data_paths = {
        str(item["dataPath"])
        for item in items
        if item.get("dataPath") is not None
    }

    return {
        "library": libraries[0] if len(libraries) == 1 else "mixed",
        "libraryVersion": versions[0] if len(versions) == 1 else None,
        "requestedEngine": (
            requested_engines[0] if len(requested_engines) == 1 else "mixed"
        ),
        "actualEngine": (
            actual_engines[0]
            if len(actual_engines) == 1
            else "mixed" if actual_engines else "unknown"
        ),
        "actualEngines": actual_engines,
        "fallback": any(bool(item.get("fallback")) for item in items),
        "dataPath": next(iter(data_paths)) if len(data_paths) == 1 else None,
        "returnedFlags": sorted(
            {
                int(flag)
                for item in items
                for flag in item.get("returnedFlags", [])
            }
        ),
        "calculations": sum(int(item.get("calculations", 0)) for item in items),
    }


def _probe(swe: Any) -> Tuple[List[Dict[str, object]], List[str], List[int]]:
    requested_flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    checks: List[Dict[str, object]] = []
    engines: List[str] = []
    returned_flags: List[int] = []

    # True Black Moon Lilith uses the osculating apogee from semo_18.se1, the
    # Moon ephemeris. Probing it here prevents a runtime from reporting ready
    # when planet data exists but the Moon/true-apogee file is unavailable.
    for label, body_id in (
        ("Sun", swe.SUN),
        ("Moon", swe.MOON),
        ("True Black Moon Lilith", swe.OSCU_APOG),
    ):
        try:
            result, actual_flags = swe.calc_ut(PROBE_JULIAN_DAY, body_id, requested_flags)
            engine = _engine_from_flags(swe, actual_flags)
            checks.append(
                {
                    "body": label,
                    "ok": True,
                    "engine": engine,
                    "returnedFlags": actual_flags,
                    "longitude": round(float(result[0]), 6),
                }
            )
            engines.append(engine)
            returned_flags.append(actual_flags)
        except Exception as error:
            checks.append({"body": label, "ok": False, "error": str(error)})

    return checks, sorted(set(engines)), sorted(set(returned_flags))


def ephemeris_status(ephemeris_path: Optional[str] = None) -> Dict[str, object]:
    try:
        import swisseph as swe  # type: ignore
    except Exception as error:  # pragma: no cover - depends on local install
        return {
            "available": False,
            "ready": False,
            "library": "pyswisseph",
            "requestedEngine": REQUESTED_ENGINE,
            "actualEngine": "unavailable",
            "fallback": False,
            "degraded": False,
            "error": str(error),
            "path": ephemeris_path,
            "pathConfigured": bool(ephemeris_path),
            "pathAvailable": None,
        }

    path_configured = bool(ephemeris_path)
    path_available = Path(ephemeris_path).is_dir() if ephemeris_path else None

    if ephemeris_path:
        swe.set_ephe_path(ephemeris_path)

    checks, engines, returned_flags = _probe(swe)
    available = bool(checks) and all(bool(check.get("ok")) for check in checks)
    actual_engine = engines[0] if len(engines) == 1 else "mixed" if engines else "unavailable"
    fallback = bool(engines and engines != [REQUESTED_ENGINE])
    degraded = available and fallback

    # A configured path declares production intent: do not silently become
    # ready with Moshier if the mounted Swiss data is absent or unusable.
    ready = available and path_available is not False and (not path_configured or not fallback)

    return {
        "available": available,
        "ready": ready,
        "library": "pyswisseph",
        "version": _version(swe),
        "requestedEngine": REQUESTED_ENGINE,
        "actualEngine": actual_engine,
        "actualEngines": engines,
        "fallback": fallback,
        "degraded": degraded,
        "path": ephemeris_path,
        "pathConfigured": path_configured,
        "pathAvailable": path_available,
        "probeJulianDay": PROBE_JULIAN_DAY,
        "returnedFlags": returned_flags,
        "checks": checks,
    }
