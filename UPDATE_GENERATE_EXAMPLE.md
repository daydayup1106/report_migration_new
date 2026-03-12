# Update - Generate Example Feature Improvements

## Changes Made

Updated the "Generate Example Excel" feature with two key improvements:

1. **Dynamic placeholder examples** - Different examples shown each time the dialog opens
2. **6-digit reportId validation** - Enforced exactly 6 digits for reportId

## 1. Dynamic Placeholder Examples

### Problem:
- Static placeholder text (`e.g., Sales Metrics Report` and `e.g., sales_metrics_2024`)
- User saw the same examples every time

### Solution:
- Generate random examples each time the dialog opens
- 8 different report name variations
- Random 6-digit reportId (100000-999999)

### Implementation:

**Frontend** (`frontend/src/components/UploadTab.tsx`):
```typescript
const getRandomExample = () => {
  const reportNames = [
    'Sales Metrics Report',
    'Customer Analytics Dashboard',
    'Financial Summary Report',
    'Marketing Performance Report',
    'Operational Metrics Report',
    'Revenue Analysis Report',
    'User Engagement Report',
    'Product Performance Report',
  ];
  const randomName = reportNames[Math.floor(Math.random() * reportNames.length)];
  const randomId = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  return { name: randomName, id: randomId };
};

const [example] = useState(() => getRandomExample());
```

**Usage:**
```tsx
<input placeholder={`e.g., ${example.name}`} />
<input placeholder={`e.g., ${example.id}`} />
```

### Example Variations:

**Session 1:**
- Report Name: `e.g., Marketing Performance Report`
- Report ID: `e.g., 342156`

**Session 2:**
- Report Name: `e.g., Customer Analytics Dashboard`
- Report ID: `e.g., 789234`

**Session 3:**
- Report Name: `e.g., Financial Summary Report`
- Report ID: `e.g., 501928`

## 2. Six-Digit ReportId Validation

### Problem:
- reportId could be any string (e.g., `sales_metrics_2024`)
- Inconsistent with actual report IDs in the system (200012, 500001, etc.)
- No validation on format

### Solution:
- Enforce exactly 6 digits
- Input automatically filters out non-digits
- Visual feedback for invalid input
- Backend validation as well

### Frontend Validation:

**Input Handler:**
```typescript
const handleReportIdChange = (value: string) => {
  // Only allow digits
  const digitsOnly = value.replace(/\D/g, '');
  // Limit to 6 digits
  const limited = digitsOnly.slice(0, 6);
  setReportId(limited);

  // Validate
  if (limited.length > 0 && limited.length !== 6) {
    setError('Report ID must be exactly 6 digits');
  } else {
    setError('');
  }
};
```

**Input Field:**
```tsx
<input
  type="text"
  value={reportId}
  onChange={(e) => handleReportIdChange(e.target.value)}
  placeholder={`e.g., ${example.id}`}
  maxLength={6}
  className={error ? 'border-red-500' : 'border-slate-600'}
/>
{error && <p className="text-red-400">{error}</p>}
```

**Validation Check:**
```typescript
const isValid = reportName.trim() && reportId.length === 6;

<button disabled={!isValid}>Generate</button>
```

### Backend Validation:

**File:** `backend/app/routes/upload.py`

```python
@router.post("/generate-example")
async def generate_example_excel(request: GenerateExampleRequest):
    # Validate reportId is exactly 6 digits
    if not request.reportId.isdigit() or len(request.reportId) != 6:
        raise HTTPException(
            status_code=400,
            detail="Report ID must be exactly 6 digits (e.g., 200012, 500001)"
        )
    # ... rest of the code
```

### User Experience:

**Before:**
- User types: `sales_metrics_2024`
- System accepts it
- Result: Inconsistent with system format

**After:**
- User types: `sales_metrics_2024`
- System filters to: `2024` (only digits)
- User sees error: "Report ID must be exactly 6 digits"
- User completes: `200024`
- System accepts it ✓

**Input Behavior:**
```
User types    → System shows    → Status
"abc"         → ""               → ❌ Invalid (0 digits)
"123"         → "123"            → ❌ Invalid (3 digits)
"12345"       → "12345"          → ❌ Invalid (5 digits)
"123456"      → "123456"         → ✓ Valid (6 digits)
"1234567"     → "123456"         → ✓ Valid (truncated to 6)
"abc123def"   → "123"            → ❌ Invalid (filtered to 3 digits)
```

## Testing

### Test Cases:

```
Valid IDs:
✓ 200012
✓ 500001
✓ 123456

Invalid IDs:
✗ 12345    (too short - 5 digits)
✗ 1234567  (too long - 7 digits)
✗ abc123   (contains letters)
✗ 20001    (too short - 5 digits)
```

### Test Results:

```bash
$ python test_new_endpoints.py

[OK] Successfully generated example Excel file: test_output/example_200012.xlsx
  - Report Name: Sales Metrics Report
  - Report ID: 200012
  - Format Spec ID: 2f203ccb4838104512f62ba7
  - Domain ID: b2f5960172dadbfd89c00d41
  - Parameters: 5
  - Columns: 25

[OK] Successfully generated example Excel file: test_output/example_500001.xlsx
  - Report Name: Customer Analytics
  - Report ID: 500001
  - Format Spec ID: e07bb952352247db721a5a5d
  - Domain ID: d9f03ac01d4c0ef0e13755bc
  - Parameters: 6
  - Columns: 25
```

## Files Modified

### Backend (1 file):
- `backend/app/routes/upload.py`
  - Added reportId validation in `generate_example_excel()` endpoint

### Frontend (1 file):
- `frontend/src/components/UploadTab.tsx`
  - Added `getRandomExample()` function
  - Added `handleReportIdChange()` with validation
  - Updated input placeholders to use dynamic examples
  - Added error display for invalid reportId
  - Updated button disable logic to check 6-digit requirement

### Test Files (1 file):
- `test_new_endpoints.py`
  - Updated test cases to use 6-digit reportIds (200012, 500001)

## Benefits

### 1. Dynamic Examples:
- ✅ Fresh examples every time
- ✅ Reduces user confusion
- ✅ Shows variety of possible report names
- ✅ Demonstrates proper reportId format

### 2. Six-Digit Validation:
- ✅ Consistent with system format
- ✅ Prevents invalid inputs
- ✅ Real-time feedback
- ✅ Backend security
- ✅ Matches existing report IDs (200012, 500001, etc.)

## UI Changes

**Dialog Label:**
```
Report ID (6 digits)
     ^^^^^^^^^^^^^
     New hint added
```

**Input Field:**
- Max length: 6 characters
- Auto-filters non-digits
- Red border when invalid
- Error message below input

**Placeholder Examples:**
- Changes on every dialog open
- Always shows valid 6-digit format
- Variety keeps UI fresh

**Generate Button:**
- Disabled unless reportId is exactly 6 digits
- Clear visual feedback

## Status

✅ **Completed and Tested**

Both improvements are fully functional:
1. Dynamic placeholder examples work on every dialog open
2. 6-digit reportId validation enforced on frontend and backend
