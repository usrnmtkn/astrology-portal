from typing import Dict, Optional


def ephemeris_status(ephemeris_path: Optional[str] = None) -> Dict[str, object]:
    try:
        import swisseph as swe  # type: ignore
    except Exception as error:  # pragma: no cover - depends on local install
        return {
            "available": False,
            "library": "pyswisseph",
            "error": str(error),
            "path": ephemeris_path,
        }

    if ephemeris_path:
        swe.set_ephe_path(ephemeris_path)

    return {
        "available": True,
        "library": "pyswisseph",
        "version": getattr(swe, "__version__", None),
        "path": ephemeris_path,
    }

