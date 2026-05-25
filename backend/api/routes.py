from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from api.mastercard_decoder import decode_iso8583

router = APIRouter()

class IsoRequest(BaseModel):
    hex_message: str

@router.post("/decode")
def decode(req: IsoRequest):
    try:
        return decode_iso8583(req.hex_message)
    except Exception as e:
        raise HTTPException(400, str(e))