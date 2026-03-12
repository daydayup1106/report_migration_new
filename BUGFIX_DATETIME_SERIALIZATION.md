# Bug Fix - DateTime Serialization in Download ZIP

## Issue

When clicking the "Download ZIP" button in the report detail modal, the server returned a 500 error:

```
TypeError: Object of type datetime is not JSON serializable
```

**Error Location:** `backend/app/routes/reports.py` line 371 in `download_all_report_files()`

## Root Cause

The code was using `model_dump()` followed by `json.dumps()` to serialize Pydantic models containing datetime objects:

```python
# BROKEN CODE
report_dict = report.model_dump(exclude={'embeddings'})
json.dumps(report_dict, indent=2, ensure_ascii=False)  # ❌ Fails on datetime
```

Python's standard `json.dumps()` cannot serialize datetime objects directly. Pydantic's `model_dump()` returns Python datetime objects as-is, which causes the serialization to fail.

## Solution

Changed to use Pydantic's built-in `model_dump_json()` method, which handles datetime serialization automatically:

```python
# FIXED CODE
report_json = report.model_dump_json(exclude={'embeddings'}, indent=2)  # ✅ Works!
```

## Changes Made

**File:** `backend/app/routes/reports.py`

### Before (Lines 366-396):
```python
with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
    # Add report.json
    report_dict = report.model_dump(exclude={'embeddings'})
    zip_file.writestr(
        f"{report_id}/report.json",
        json.dumps(report_dict, indent=2, ensure_ascii=False)  # ❌ TypeError
    )

    # Add roles.json
    if roles:
        roles_dict = [role.model_dump() for role in roles]
        zip_file.writestr(
            f"{report_id}/roles.json",
            json.dumps(roles_dict, indent=2, ensure_ascii=False)  # ❌ TypeError
        )

    # Add config.json
    if config:
        config_dict = config.model_dump()
        zip_file.writestr(
            f"{report_id}/config.json",
            json.dumps(config_dict, indent=2, ensure_ascii=False)  # ❌ TypeError
        )

    # Add ui_settings.json
    if ui_settings:
        ui_settings_dict = ui_settings.model_dump()
        zip_file.writestr(
            f"{report_id}/ui_settings.json",
            json.dumps(ui_settings_dict, indent=2, ensure_ascii=False)  # ❌ TypeError
        )
```

### After (Lines 366-396):
```python
with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
    # Add report.json (using model_dump_json for proper datetime serialization)
    report_json = report.model_dump_json(exclude={'embeddings'}, indent=2)  # ✅
    zip_file.writestr(
        f"{report_id}/report.json",
        report_json
    )

    # Add roles.json
    if roles:
        # Create a list of role dicts and serialize with proper datetime handling
        roles_data = [role.model_dump(mode='json') for role in roles]  # ✅
        zip_file.writestr(
            f"{report_id}/roles.json",
            json.dumps(roles_data, indent=2, ensure_ascii=False, default=str)
        )

    # Add config.json
    if config:
        config_json = config.model_dump_json(indent=2)  # ✅
        zip_file.writestr(
            f"{report_id}/config.json",
            config_json
        )

    # Add ui_settings.json
    if ui_settings:
        ui_settings_json = ui_settings.model_dump_json(indent=2)  # ✅
        zip_file.writestr(
            f"{report_id}/ui_settings.json",
            ui_settings_json
        )
```

## Technical Details

### Pydantic Serialization Methods

1. **`model_dump()`** - Returns Python dict with native Python types (datetime objects remain as datetime)
   - ❌ Not JSON-safe for datetime objects
   - Use when you need Python objects for further processing

2. **`model_dump_json()`** - Returns JSON string with all types properly serialized
   - ✅ JSON-safe, datetimes converted to ISO 8601 strings
   - Use when you need JSON output directly

3. **`model_dump(mode='json')`** - Returns Python dict with JSON-compatible types
   - ✅ JSON-safe, datetimes converted to strings
   - Use when you need a dict but want JSON-compatible types

### DateTime Serialization Format

Pydantic serializes datetime objects to ISO 8601 format strings:

```python
datetime(2024, 2, 10, 14, 45, 30)  →  "2024-02-10T14:45:30"
```

This format is:
- Standard and widely supported
- Timezone-aware (includes 'Z' or offset if applicable)
- Human-readable
- Machine-parseable

## Testing

Created test script: `test_json_serialization.py`

**Test Results:**
```
Method 1: model_dump() + json.dumps()
[EXPECTED ERROR] Object of type datetime is not JSON serializable

Method 2: model_dump_json()
[OK] Successfully serialized with model_dump_json()

Method 3: model_dump(mode='json') + json.dumps()
[OK] Successfully serialized with model_dump(mode='json')
```

## Expected Behavior After Fix

1. User clicks "Download ZIP" button in report detail modal
2. Server fetches report, roles, config, and ui_settings from MongoDB
3. Server serializes all models to JSON with proper datetime handling
4. Server creates ZIP file with all JSON files
5. Browser downloads: `{report_id}_export.zip`

**ZIP Contents:**
```
{report_id}_export.zip
└── {report_id}/
    ├── report.json       (with ISO 8601 datetime strings)
    ├── roles.json        (with ISO 8601 datetime strings)
    ├── config.json       (with ISO 8601 datetime strings)
    └── ui_settings.json  (with ISO 8601 datetime strings)
```

## Status

✅ **Fixed and Tested**

The download ZIP feature now works correctly and handles datetime serialization properly.
