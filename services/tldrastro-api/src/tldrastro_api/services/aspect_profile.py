import json
from functools import lru_cache
from importlib.resources import files
from typing import Any, TypeVar

AspectT = TypeVar("AspectT")


@lru_cache(maxsize=1)
def canonical_sky_aspect_profile() -> dict[str, Any]:
    profile_path = files("tldrastro_api").joinpath("data/sky_aspect_profile.json")
    return json.loads(profile_path.read_text(encoding="utf-8"))


def canonical_sky_point_names() -> list[str]:
    return [str(point["name"]) for point in canonical_sky_aspect_profile()["points"]]


def canonical_sky_aspect_definitions() -> list[tuple[str, float]]:
    return [
        (str(aspect["id"]), float(aspect["angle"]))
        for aspect in canonical_sky_aspect_profile()["aspects"]
    ]


def canonical_sky_aspect_orbs() -> dict[str, float]:
    return {
        str(aspect["id"]): float(aspect["orb"])
        for aspect in canonical_sky_aspect_profile()["aspects"]
    }


def canonicalize_node_axis_aspects(aspects: list[AspectT]) -> list[AspectT]:
    """Collapse both lunar-node contacts into one North-Node-keyed sky event."""
    node_points = {"North Node", "South Node"}
    canonical: list[AspectT] = []
    contact_indexes: dict[str, int] = {}

    for aspect in aspects:
        first = str(aspect.from_)
        second = str(aspect.to)
        first_is_node = first in node_points
        second_is_node = second in node_points

        if first_is_node and second_is_node:
            continue

        if not first_is_node and not second_is_node:
            canonical.append(aspect)
            continue

        other_point = second if first_is_node else first
        node_point = first if first_is_node else second
        existing_index = contact_indexes.get(other_point)

        if existing_index is None:
            contact_indexes[other_point] = len(canonical)
            canonical.append(aspect)
            continue

        existing = canonical[existing_index]
        existing_first = str(existing.from_)
        existing_second = str(existing.to)
        existing_node = existing_first if existing_first in node_points else existing_second

        if node_point == "North Node" and existing_node != "North Node":
            canonical[existing_index] = aspect

    return sorted(canonical, key=lambda entry: float(entry.orb))
