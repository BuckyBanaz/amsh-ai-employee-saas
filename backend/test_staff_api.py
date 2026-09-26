import sys, json
sys.path.insert(0, '/app')
import httpx

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOnsic3ViIjoicGFyaWtzaGl0QGFtc2guYWkiLCJ1c2VyX2lkIjoiNTE0OTExNDItMDBkNi00OGY3LTkwMGMtZjcxZWUxNzQ4ZGRjIn0sImV4cCI6MTc5MTA0NTc3Nn0.DuHlWht7in-xIAY171qdLrSjw64dm2tXNC3QwtcXLa8"
BIZ_ID = "703b13dc-3d6b-4052-806f-04bceb1e5aa9"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# Test staff list
r = httpx.get(f"http://localhost:8000/api/businesses/{BIZ_ID}/staff", headers=HEADERS, timeout=5)
print(f"GET /staff -> {r.status_code}")
print(json.dumps(r.json(), indent=2))
