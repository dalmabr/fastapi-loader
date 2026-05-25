import json
import os
import re
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from formato import format_field
from layout.parser import parse_cobol_layout

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from api.routes import router as iso_router
import json


app = FastAPI()

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LAYOUT_DIR = os.path.join(BASE_DIR, "layout")
DATA_DIR = os.path.join(BASE_DIR, "data")

os.makedirs(LAYOUT_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)


def safe_model_name(name: str) -> str:
    if not name or not re.match(r"^[A-Za-z0-9_-]+$", name):
        raise HTTPException(
            status_code=400,
            detail="Nome do modelo deve conter apenas letras, numeros, _ ou -.",
        )

    return name


def layout_path(model: str) -> str:
    return os.path.join(LAYOUT_DIR, f"{safe_model_name(model)}.json")


def records_path(model: str) -> str:
    return os.path.join(DATA_DIR, f"{safe_model_name(model)}.json")


def load_layout(model: str) -> List[Dict]:
    path = layout_path(model)

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Modelo nao encontrado.")

    with open(path, encoding="utf-8") as file:
        return json.load(file)


@app.get("/")
def home():
    return {"status": "ok"}


@app.post("/upload-layout")
def upload_layout(payload: Dict):
    name = safe_model_name(payload.get("name", ""))
    content = payload.get("content", "")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Conteudo do layout vazio.")

    fields = parse_cobol_layout(content)

    if not fields:
        raise HTTPException(status_code=400, detail="Nenhum campo PIC foi encontrado.")

    with open(layout_path(name), "w", encoding="utf-8") as file:
        json.dump(fields, file, indent=2)

    return {
        "status": "ok",
        "name": name,
        "fields": fields,
    }


@app.get("/models")
def list_models():
    files = os.listdir(LAYOUT_DIR)
    return sorted(f.replace(".json", "") for f in files if f.endswith(".json"))


@app.get("/models/{name}")
def get_model(name: str):
    return load_layout(name)


@app.get("/models/{name}/records")
def get_model_records(name: str):
    path = records_path(name)

    if not os.path.exists(path):
        return []

    with open(path, encoding="utf-8") as file:
        return json.load(file)


@app.post("/models/{name}/records")
def save_model_records(name: str, records: List[Dict]):
    load_layout(name)

    with open(records_path(name), "w", encoding="utf-8") as file:
        json.dump(records, file, indent=2)

    return {
        "status": "ok",
        "count": len(records),
    }


@app.post("/generate/{model}")
def generate(model: str, records: List[Dict]):
    layout = load_layout(model)
    lines = []

    for record in records:
        data = record.get("data", record)
        line = ""

        for field in layout:
            value = data.get(field["name"], "")
            line += format_field(value, field)

        lines.append(line)

    return {"preview": "\n".join(lines)}

class TransactionRequest(BaseModel):
    hex_message: str

app.include_router(iso_router, prefix="/api/iso8583")