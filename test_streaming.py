import asyncio
import io
import openpyxl
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from httpx import AsyncClient

app = FastAPI()

@app.post("/generate")
async def generate():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws['A1'] = 'test'
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=test.xlsx"}
    )

async def test():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/generate")
        print(response.status_code)
        if response.status_code != 200:
            print(response.text)

if __name__ == "__main__":
    asyncio.run(test())
