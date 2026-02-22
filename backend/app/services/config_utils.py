"""Config string parser for radio plan configuration.

Config string format: [N]<sector_sizes>_
  N = New site (optional prefix — fresh install, not upgrade/swap)
  L = Large sector (NR + LTE + mMIMO AQQY)
  M = Medium sector (LTE + NR, no mMIMO)
  S = Small sector (LTE only)
  _ = terminator

Examples:
  NLLL_ = New site, 3 Large sectors
  NLL_  = New site, 2 Large sectors
  NM_   = New site, 1 Medium sector
  LLL_  = Existing site upgrade, 3 Large sectors
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ParsedConfig:
    is_new: bool
    sector_sizes: list[str]
    sector_count: int
    has_large: bool
    large_count: int
    has_medium: bool
    medium_count: int
    has_small: bool
    small_count: int
    raw: str


def parse_config(config: str) -> ParsedConfig:
    """Parse a config string like 'NLLL_' into structured data."""
    raw = config
    rest = config.rstrip("_")

    is_new = False
    if rest.startswith("N"):
        is_new = True
        rest = rest[1:]

    sector_sizes = [c for c in rest if c in "LMS"]
    large_count = sector_sizes.count("L")
    medium_count = sector_sizes.count("M")
    small_count = sector_sizes.count("S")

    return ParsedConfig(
        is_new=is_new,
        sector_sizes=sector_sizes,
        sector_count=len(sector_sizes),
        has_large=large_count > 0,
        large_count=large_count,
        has_medium=medium_count > 0,
        medium_count=medium_count,
        has_small=small_count > 0,
        small_count=small_count,
        raw=raw,
    )
