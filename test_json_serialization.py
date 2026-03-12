"""Test JSON serialization with datetime objects."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from datetime import datetime
from pydantic import BaseModel
import json

class TestModel(BaseModel):
    name: str
    created_at: datetime
    updated_at: datetime

# Test data
test_obj = TestModel(
    name="Test Report",
    created_at=datetime(2024, 1, 15, 10, 30, 0),
    updated_at=datetime(2024, 2, 10, 14, 45, 30)
)

print("Testing JSON serialization with datetime objects:")
print()

# Method 1: model_dump() + json.dumps() - FAILS
print("Method 1: model_dump() + json.dumps()")
try:
    data = test_obj.model_dump()
    json_str = json.dumps(data, indent=2)
    print("[FAIL] This shouldn't work - datetime objects not serializable")
except TypeError as e:
    print(f"[EXPECTED ERROR] {e}")

print()

# Method 2: model_dump_json() - WORKS
print("Method 2: model_dump_json()")
try:
    json_str = test_obj.model_dump_json(indent=2)
    print("[OK] Successfully serialized with model_dump_json()")
    print("Output:")
    print(json_str)
except Exception as e:
    print(f"[ERROR] {e}")

print()

# Method 3: model_dump(mode='json') + json.dumps() - WORKS
print("Method 3: model_dump(mode='json') + json.dumps()")
try:
    data = test_obj.model_dump(mode='json')
    json_str = json.dumps(data, indent=2)
    print("[OK] Successfully serialized with model_dump(mode='json')")
    print("Output:")
    print(json_str)
except Exception as e:
    print(f"[ERROR] {e}")

print()
print("Test completed! The download-all endpoint now uses method 2 (model_dump_json()) for proper datetime handling.")
