# Quick Reference - New Features

## 1. Generate Example Excel

### How to Use:
1. Go to Upload tab
2. Click "Generate Example" button (top right)
3. Enter Report Name (e.g., "Sales Metrics Report")
4. Enter Report ID (e.g., "sales_metrics_2024")
5. Click "Generate" button
6. Excel file downloads automatically

### What You Get:
- Excel file named: `example_{reportId}.xlsx`
- Contains:
  - Report metadata (name, ID, formatSpecId, domainId)
  - 2-3 random parameters
  - 5-8 random columns with descriptions
  - Proper formatting and structure
- **Different data each time** (random parameters and columns)

### Example:
```
Input:
  Report Name: "Sales Dashboard"
  Report ID: "sales_dash_2024"

Output File: example_sales_dash_2024.xlsx
```

## 2. Download All Report Files as ZIP

### How to Use:
1. Go to Reports tab
2. Click on any report to open detail modal
3. Click "Download ZIP" button (top right)
4. ZIP file downloads automatically

### What You Get:
- ZIP file named: `{reportId}_export.zip`
- Contains folder: `{reportId}/`
  - `report.json` - Main report metadata (columns, parameters, descriptions)
  - `roles.json` - All roles/environments for this report
  - `config.json` - Report configuration
  - `ui_settings.json` - UI display settings

### Example:
```
Report ID: "sales_metrics_2024"

Downloaded: sales_metrics_2024_export.zip
  └── sales_metrics_2024/
      ├── report.json
      ├── roles.json
      ├── config.json
      └── ui_settings.json
```

## API Endpoints

### Generate Example
```bash
POST /api/upload/generate-example
Content-Type: application/json

{
  "reportName": "My Report",
  "reportId": "my_report_001"
}

Response: Excel file download
```

### Download ZIP
```bash
GET /api/reports/{report_id}/download-all

Response: ZIP file download
```

## Testing

### Test Generate Example:
```bash
cd D:\development\PyCharmWorkSpace\report_migration_new
python test_new_endpoints.py
```

### Check Generated Files:
```bash
# View generated files
ls -la test_output/

# Check Excel content
python -c "
import openpyxl
wb = openpyxl.load_workbook('test_output/example_sales_metrics_2024.xlsx')
ws = wb.active
for row in ws.iter_rows(values_only=True, max_row=15):
    print(row)
"
```

## Notes

- **Generate Example**: Creates different random data each time for testing variety
- **Download ZIP**: Includes all related data for complete backup/export
- **Format**: Generated Excel files use the exact format expected by the parser
- **Valid IDs**: Generated formatSpecId and domainId are valid 24-char hex strings (MongoDB ObjectId format)

## Troubleshooting

### Issue: Generate Example button not visible
- Check that you're on the Upload tab
- Button is in the top-right corner of the page header

### Issue: Download ZIP button not working
- Make sure report is fully loaded (not pending)
- Check browser console for errors
- Verify report exists in database

### Issue: Generated Excel file won't upload
- This shouldn't happen - generated files use correct format
- If it does, check console for validation errors
- Report the specific error message
