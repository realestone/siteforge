"""Validation rules for TSSR + BOQ cross-checks.

Ports frontend's validateTSSR() from SiteContext.tsx.
"""

from dataclasses import dataclass


@dataclass
class ValidationResult:
    id: str
    type: str  # "error" | "warning" | "success"
    code: str
    message: str
    fields: list[str] | None = None


def validate(tssr: dict, boq_items: list[dict]) -> list[ValidationResult]:
    """Run all validation rules against TSSR data and BOQ items."""
    results: list[ValidationResult] = []

    sectors = tssr.get("sectors", 1)
    size = tssr.get("size", "Small")
    config = tssr.get("config_string", "")
    acdb = tssr.get("acdb", "")
    earthing = tssr.get("earthing", "")

    boq_by_id = {item.get("id", item.get("product_code", "")): item for item in boq_items}

    # V001: Config string matches sector count
    config_clean = config.rstrip("_")
    sector_letters = config_clean[1:] if len(config_clean) > 1 else ""
    if len(sector_letters) == sectors:
        results.append(ValidationResult("V001", "success", "V001", "Config string matches sector count"))
    else:
        results.append(ValidationResult(
            "V001", "error", "V001",
            f"Config '{config}' implies {len(sector_letters)} sectors but {sectors} defined",
            ["config", "sectors"],
        ))

    # V002: RRH quantities match sector config
    rrh = boq_by_id.get("AHEGB", {})
    if rrh and rrh.get("quantity", 0) == sectors:
        results.append(ValidationResult("V002", "success", "V002", "RRH quantities match sector config"))

    # V003: GPS kit check for Large configs
    gps = boq_by_id.get("GPS", {})
    if size == "Large":
        if gps and gps.get("quantity", 0) > 0:
            results.append(ValidationResult("V003", "success", "V003", "GPS kit complete (Large config)"))
        else:
            results.append(ValidationResult("V003", "error", "V003", "GPS kit required for Large configuration", ["size"]))

    # V004: ACDB type matches earthing system
    if "TN" in acdb and "TN" in earthing:
        results.append(ValidationResult("V004", "success", "V004", "ACDB type matches earthing system"))
    elif "TT" in acdb and "TT" in earthing:
        results.append(ValidationResult("V004", "success", "V004", "ACDB type matches earthing system"))
    elif acdb and earthing:
        results.append(ValidationResult(
            "V004", "warning", "V004",
            f"ACDB type ({acdb}) may not match earthing system ({earthing})",
            ["acdb", "earthing"],
        ))

    # V005: Jumper count matches antenna ports
    jumper = boq_by_id.get("ANT-JUMPER", {})
    expected_jumpers = sectors * 4
    if jumper and jumper.get("quantity", 0) == expected_jumpers:
        results.append(ValidationResult("V005", "success", "V005", "Jumper count matches antenna ports"))

    # V012: DC cable material vs install service
    dc_cable = boq_by_id.get("CABLE-DC6", {})
    dc_install = boq_by_id.get("SVC-DC-INST", {})
    if dc_cable and dc_install:
        diff = abs(dc_cable.get("quantity", 0) - dc_install.get("quantity", 0))
        if diff > 5:
            results.append(ValidationResult(
                "V012", "warning", "V012",
                f"DC cable material ({dc_cable['quantity']}m) \u2260 install service ({dc_install['quantity']}m)",
                ["CABLE-DC6", "SVC-DC-INST"],
            ))

    # V015: Walk test count check
    test = boq_by_id.get("SVC-TESTING", {})
    if test:
        min_tests = sectors * 2
        max_tests = sectors * 3
        qty = test.get("quantity", 0)
        if qty < min_tests or qty > max_tests:
            results.append(ValidationResult(
                "V015", "warning", "V015",
                f"Walk test count ({qty}) outside typical range for {sectors} sectors ({min_tests}-{max_tests})",
            ))

    return results
