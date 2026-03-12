# Plan: Interactive Upload Flow with Validation Review Loop

## Goal
Change the upload flow so that when errors/warnings are found, the data is NOT saved to MongoDB. Instead, the user reviews findings, makes fixes, re-validates, and only saves when clean (or explicitly confirms).

## Current Flow
```
Upload → Parse → AI Enhance → Validate → Save (always) → Show results
```

## New Flow
```
Upload → Parse → AI Enhance → Validate
  → If errors/warnings: return draft (NOT saved) → User reviews → Fix → Re-validate → loop
  → If clean (or user confirms): Save → Show success
```

---

## Architecture: Server-side Draft Storage

**Approach**: Store parsed data in a server-side in-memory dict keyed by a `draftId` (UUID). This avoids sending large report data back and forth to the client, and avoids polluting MongoDB with unconfirmed data.

- Drafts auto-expire after 30 minutes (simple TTL cleanup)
- Draft contains: `report`, `roles`, `report_config`, `ui_settings`, `validation`, `filename`, `ai_enhanced`, `file_size_mb`, `created_at`

---

## Changes

### 1. Backend: New draft store (`backend/app/services/draft_store.py`) — NEW FILE

Simple in-memory dict with TTL:
```python
class DraftStore:
    drafts: Dict[str, DraftEntry]

    def save(report, roles, config, ui_settings, validation, metadata) -> str (draftId)
    def get(draft_id) -> DraftEntry | None
    def delete(draft_id)
    def cleanup_expired()  # called on save/get
```

### 2. Backend: Modify upload route (`backend/app/routes/upload.py`)

Split the current `POST /api/upload` logic:

**Modified `POST /api/upload`** — Parse + Enhance + Validate, but **conditionally save**:
- If `errorCount == 0 AND warningCount == 0`: save to MongoDB immediately (same as before), return `{ status: "saved", ... }`
- If errors or warnings exist: store in DraftStore, return `{ status: "draft", draftId: "...", ... }` with validation results but NO save

**New `POST /api/upload/confirm/{draft_id}`** — Confirm and save a draft:
- Fetch draft from DraftStore
- Save all 5 collections to MongoDB
- Record migration log
- Delete draft
- Return same response format as current upload success

**New `POST /api/upload/draft/{draft_id}/fix`** — Fix a field on a draft (like QuickFix but on draft, not DB):
- Fetch draft from DraftStore
- Apply fix to the in-memory report object
- Re-validate
- Update draft with new validation
- Return updated validation result
- Same field validation logic as existing `FieldFixService`

**New `POST /api/upload/draft/{draft_id}/revalidate`** — Re-run validation on draft:
- Fetch draft
- Re-validate report
- Return updated validation

### 3. Frontend: New types (`frontend/src/types/index.ts`)

Add to `UploadResponse`:
```typescript
interface UploadResponse {
  // existing fields...
  status: 'saved' | 'draft';  // NEW
  draftId?: string;            // NEW — present when status='draft'
}
```

### 4. Frontend: New API methods (`frontend/src/services/api.ts`)

```typescript
confirmDraft: (draftId: string) => Promise<UploadResponse>
fixDraftField: (draftId: string, data: FixFieldRequest) => Promise<FixFieldResponse>
```

### 5. Frontend: Update upload hook (`frontend/src/hooks/useUpload.ts`)

Add new stages:
```typescript
type UploadStage = 'idle' | 'uploading' | 'review' | 'confirming' | 'success' | 'error';
```

- `review` — draft created, user reviewing validation findings
- `confirming` — user confirmed, saving to DB in progress

New actions:
- `confirmDraft()` — calls `/api/upload/confirm/{draftId}`, transitions to 'success'
- `fixDraftField(field, value)` — calls draft fix endpoint, updates local validation

### 6. Frontend: Update UploadTab.tsx

Add new `ReviewResult` component (similar to `UploadResult` but for draft state):
- Shows validation findings (reuse `ValidationFindings`)
- Shows "Confirm & Save" button (enabled when no errors; shows warning count if warnings remain)
- Shows "Confirm Anyway" button when only warnings remain (no errors)
- Shows "Upload Another" button to discard draft and start over
- QuickFix works on the draft (calls draft fix endpoint instead of DB fix endpoint)

Stage rendering:
- `review` → `ReviewResult` (draft with findings)
- `confirming` → Loading state
- `success` → `UploadResult` (saved, same as current)

### 7. Frontend: Update ValidationFindings + QuickFixDialog

Make `QuickFixDialog` accept an optional `onFixDraft` prop as alternative to `reportService.fixField`. When in draft mode, it calls the draft fix endpoint instead.

Or simpler: pass a `fixFn` callback prop that abstracts the fix API call.

---

## Detailed File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/app/services/draft_store.py` | CREATE | In-memory draft storage with TTL |
| `backend/app/routes/upload.py` | MODIFY | Conditional save vs draft; add confirm + draft-fix endpoints |
| `backend/app/services/__init__.py` | MODIFY | Export DraftStore |
| `frontend/src/types/index.ts` | MODIFY | Add `status`, `draftId` to UploadResponse |
| `frontend/src/services/api.ts` | MODIFY | Add `confirmDraft`, `fixDraftField` methods |
| `frontend/src/hooks/useUpload.ts` | MODIFY | Add `review`/`confirming` stages, confirm/fix actions |
| `frontend/src/components/UploadTab.tsx` | MODIFY | Add `ReviewResult` component for draft review state |
| `frontend/src/components/QuickFixDialog.tsx` | MODIFY | Accept configurable fix function for draft vs DB mode |
| `frontend/src/components/ValidationFindings.tsx` | MODIFY | Pass fix function through to QuickFixDialog |

---

## User Flow (visual)

1. User drops Excel file
2. Backend parses + enhances + validates
3. **If clean** (0 errors, 0 warnings): saved immediately → success screen (same as today)
4. **If issues found**: draft created → Review screen:
   - Shows validation score, findings (errors/warnings/info)
   - User can click "Fix" on each finding → QuickFixDialog (edits draft, not DB)
   - After fixing, validation refreshes automatically
   - When no errors remain → "Confirm & Save" button becomes active
   - User can also "Confirm with Warnings" if only warnings remain
   - User clicks confirm → saved to DB → success screen
5. User can also click "Discard & Start Over" at any point during review
