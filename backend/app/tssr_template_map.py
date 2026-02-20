"""
TSSR Template Mapping — tag-based field mapping for .docx export.

The TSSR Word template uses Structured Document Tags (SDTs) with unique `tag`
attributes. Each SDT is either a TEXT input or a COMBOBOX/DROPDOWN with
predefined options.

This module defines the mapping between database fields and template SDT tags,
including the allowed options for dropdown fields, so the export can correctly
set each control's value.

How it works:
  1. The export endpoint loads the template and scans all SDTs by tag.
  2. For each mapping entry, it finds the SDT with the matching tag.
  3. For TEXT SDTs, it sets the text content directly.
  4. For COMBOBOX/DROPDOWN SDTs, it sets the selected value (must match an option).
  5. For plain cells (no SDT), it uses the row/col position and sets cell text.

The tag names come from the template's XML (w:sdt > w:sdtPr > w:tag).
"""

# Each entry: (sdt_tag, db_field, control_type, options_if_dropdown)
# control_type: "text" | "combobox" | "dropdown" | "plain_cell"
# For "plain_cell", we fall back to positional (table_index, row, col)

TEMPLATE_MAP = [
    # ── Table 0: Site Identity (12 rows x 3 cols) ──────────────────────
    # Text content controls
    {
        "tag": "SiteName",
        "db_field": "site_name",
        "type": "text",
    },
    {
        "tag": "SiteID",
        "db_field": "site_id",
        "type": "text",
    },
    # Contractual Model dropdown (this is what the template calls "Site Type")
    {
        "tag": "ContractualModel",
        "db_field": "site_type",
        "type": "combobox",
        "options": [
            "Choose an item.",
            "Not Applicable",
            "Private Site",
            "Coloc",
            "Greenfield",
        ],
    },
    # Supporting document version dropdowns
    {
        "tag": "SiteOwnerOfferVersion",
        "db_field": "site_owner_offer",
        "type": "combobox",
        "options": [
            "Choose an item.",
            "No",
            "NA",
            "v01",
            "v02",
            "v03",
            "v04",
            "v05",
            "v06",
            "v07",
            "v08",
            "v09",
            "v10",
        ],
    },
    {
        "tag": "MontasjeunderlagVesrion",  # Note: typo is in the template
        "db_field": "montasjeunderlag",
        "type": "combobox",
        "options": [
            "Choose an item.",
            "No",
            "NA",
            "v01",
            "v02",
            "v03",
            "v04",
            "v05",
            "v06",
            "v07",
            "v08",
            "v09",
            "v10",
        ],
    },
    {
        "tag": "SART Version",
        "db_field": "sart",
        "type": "combobox",
        "options": [
            "Choose an item.",
            "No",
            "NA",
            "v01",
            "v02",
            "v03",
            "v04",
            "v05",
            "v06",
            "v07",
            "v08",
            "v09",
            "v10",
        ],
    },
    {
        "tag": "VeiviserAvailable",
        "db_field": "veiviser",
        "type": "combobox",
        "options": ["Choose an item.", "Yes", "No"],
    },
    {
        "tag": "RFSRVersion",
        "db_field": "rfsr_rnp",
        "type": "combobox",
        "options": [
            "Choose an item.",
            "No",
            "NA",
            "v01",
            "v02",
            "v03",
            "v04",
            "v05",
            "v06",
            "v07",
            "v08",
            "v09",
            "v10",
        ],
    },
    # "Guideline Version" is actually "Other Supporting Documents" text field
    {
        "tag": "OtherSupportingDocuments",
        "db_field": "guideline_version",
        "type": "text",
    },
    # ── Table 0: Plain cells (no SDT) ──────────────────────────────────
    # These cells don't have content controls, so we use positional fill
    {
        "table": 0,
        "row": 3,
        "col": 1,
        "db_field": "customer",
        "type": "plain_cell",
    },
    {
        "table": 0,
        "row": 4,
        "col": 0,
        "db_field": "site_owner",
        "type": "plain_cell",
        "prefix": "Site Owner: ",
    },
    {
        "table": 0,
        "row": 10,
        "col": 1,
        "db_field": "veiviser_comments",
        "type": "plain_cell",
    },
    {
        "table": 0,
        "row": 11,
        "col": 1,
        "db_field": "iloq_details",
        "type": "plain_cell",
        "condition_field": "iloq_required",  # Only fill if iloq_required is True
    },
    # ── Table 1: TSSR Alignment ─────────────────────────────────────────
    {
        "tag": "TSSRAligned",
        "db_field": "tssr_alignment",
        "type": "dropdown",
        "options": ["Choose an item.", "Yes", "No"],
    },
    {
        "table": 1,
        "row": 3,
        "col": 0,
        "db_field": "tssr_alignment_comments",
        "type": "plain_cell",
    },
]

# Mapping of db_field -> list of valid dropdown options (for frontend validation)
# This is derived from the TEMPLATE_MAP above for convenience
DROPDOWN_OPTIONS: dict[str, list[str]] = {}
for _entry in TEMPLATE_MAP:
    if _entry.get("options"):
        # Exclude the "Choose an item." placeholder
        DROPDOWN_OPTIONS[_entry["db_field"]] = [
            o for o in _entry["options"] if o != "Choose an item."
        ]
