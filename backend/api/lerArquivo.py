from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from api.auth import router as auth_router

app = FastAPI()

# CORS middleware para aceitar requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth router
app.include_router(auth_router)

# layout fixo
layout = [
    {"name": "CODENT", "type": "char", "size": 4},
    {"name": "TIPOMSGON", "type": "char", "size": 4},
    {"name": "CODPROON", "type": "decimal", "size": 4},
]

class Record(BaseModel):
    data: Dict[str, str]

def format_field(value, field):
    if field["type"] == "char":
        return str(value).ljust(field["size"])[:field["size"]]
    elif field["type"] == "decimal":
        return str(value).zfill(field["size"])[:field["size"]]
    return ""

def generate_line(record):
    line = ""
    for field in layout:
        value = record.get(field["name"], "")
        line += format_field(value, field)
    return line

@app.post("/generate")
def generate(records: List[Record]):
    lines = [generate_line(r.data) for r in records]
    content = "\n".join(lines)

    # Salvar arquivo
    with open("output.txt", "w") as f:
        f.write(content)

    return {
        "file": "output.txt",
        "preview": content[:200]
    }
