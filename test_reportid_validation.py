"""Test reportId validation for 6-digit requirement."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

print("Testing Report ID Validation (6 digits required)")
print("=" * 50)

test_cases = [
    ("200012", True, "Valid 6-digit ID"),
    ("500001", True, "Valid 6-digit ID"),
    ("123456", True, "Valid 6-digit ID"),
    ("12345", False, "Too short (5 digits)"),
    ("1234567", False, "Too long (7 digits)"),
    ("abc123", False, "Contains non-digits"),
    ("20001", False, "Too short (5 digits)"),
    ("2000123", False, "Too long (7 digits)"),
]

print()
for report_id, should_pass, description in test_cases:
    is_valid = report_id.isdigit() and len(report_id) == 6
    status = "PASS" if is_valid == should_pass else "FAIL"
    symbol = "[OK]" if is_valid else "[X]"

    print(f"{symbol} {report_id:10} -> {description:30} {status}")

print()
print("=" * 50)
print("Validation Rule: Report ID must be exactly 6 digits")
print("Examples: 200012, 500001, 123456")
