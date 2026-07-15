#!/usr/bin/env python3
"""
admin_settings.py — application-scoped content settings (Admin-controlled).

Backs config/admin-content-settings.json. The historical-lookback display switch
lives here, NOT in user preferences and NOT in localStorage; ordinary users cannot
configure it. Setting it appends an audit entry and bumps configVersion, which the
reader cache key includes so a change propagates instead of serving stale pages.

The setting controls DISPLAY only. It never changes record status or promotes drafts.
"""
import json, os, datetime

CONFIG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "config", "admin-content-settings.json")


def load():
    with open(CONFIG) as fh:
        return json.load(fh)


def get(setting_id, cfg=None):
    cfg = cfg or load()
    s = cfg.get("settings", {}).get(setting_id)
    return None if s is None else s.get("value")


def is_user_configurable(setting_id, cfg=None):
    cfg = cfg or load()
    return bool(cfg.get("settings", {}).get(setting_id, {}).get("userConfigurable", False))


def set_value(setting_id, value, updated_by, note=""):
    """Persist a new value, append an Admin audit entry, bump configVersion.
    Does NOT touch any record status. Returns the new config."""
    cfg = load()
    s = cfg["settings"][setting_id]
    if s.get("userConfigurable", False):
        raise PermissionError(f"{setting_id} is not user-configurable")
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    s["value"] = value
    s["updatedAt"] = now
    s["updatedBy"] = updated_by
    cfg["configVersion"] = int(cfg.get("configVersion", 0)) + 1
    cfg.setdefault("audit", []).append({
        "settingId": setting_id, "value": value, "updatedAt": now,
        "updatedBy": updated_by, "scope": s.get("scope", "application"),
        "userConfigurable": s.get("userConfigurable", False), "note": note,
    })
    with open(CONFIG, "w") as fh:
        json.dump(cfg, fh, indent=2, ensure_ascii=False)
    return cfg


def cache_version(cfg=None):
    """Reader configuration/cache key contribution. Includes the setting value so a
    toggle change invalidates cached pages (no stale historical block, no flash)."""
    cfg = cfg or load()
    return f"cfgv{cfg.get('configVersion', 0)}:histSky={get('skyHistoricalLookbackEnabled', cfg)}"
