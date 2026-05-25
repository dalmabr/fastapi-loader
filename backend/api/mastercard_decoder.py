import binascii
import json
from typing import Dict, Any, Optional, List, Tuple

# =============================================================================
# CONFIGURAÇÃO DE CAMPOS (Ajuste conforme sua especificação IPM)
# =============================================================================
MC_FIELDS = {
    0:  {'len': 4,  'type': 'fixed', 'enc': 'cp500', 'desc': 'MTI'},
    1:  {'len': 8,  'type': 'bitmap', 'enc': 'binary', 'desc': 'Primary Bitmap'},
    2:  {'max': 19, 'type': 'llvar', 'enc': 'cp500', 'desc': 'PAN'},
    3:  {'len': 6,  'type': 'fixed', 'enc': 'cp500', 'desc': 'Processing Code'},
    4:  {'len': 12, 'type': 'fixed', 'enc': 'cp500', 'desc': 'Amount'},
    7:  {'len': 10, 'type': 'fixed', 'enc': 'cp500', 'desc': 'Transmission DateTime'},
    11: {'len': 6,  'type': 'fixed', 'enc': 'cp500', 'desc': 'STAN'},
    12: {'len': 6,  'type': 'fixed', 'enc': 'cp500', 'desc': 'Local Time'},
    13: {'len': 4,  'type': 'fixed', 'enc': 'cp500', 'desc': 'Local Date'},
    15: {'len': 4,  'type': 'fixed', 'enc': 'cp500', 'desc': 'Settlement Date'},
    18: {'len': 4,  'type': 'fixed', 'enc': 'cp500', 'desc': 'MCC'},
    22: {'len': 3,  'type': 'fixed', 'enc': 'cp500', 'desc': 'POS Entry Mode'},
    32: {'max': 11, 'type': 'llvar', 'enc': 'cp500', 'desc': 'Acquirer ID'},
    37: {'len': 12, 'type': 'fixed', 'enc': 'cp500', 'desc': 'RRN'},
    38: {'len': 6,  'type': 'fixed', 'enc': 'cp500', 'desc': 'Auth ID'},
    39: {'len': 2,  'type': 'fixed', 'enc': 'cp500', 'desc': 'Response Code'},
    41: {'len': 8,  'type': 'fixed', 'enc': 'ascii', 'desc': 'Terminal ID'},
    42: {'len': 15, 'type': 'fixed', 'enc': 'ascii', 'desc': 'Merchant ID'},
    43: {'len': 40, 'type': 'fixed', 'enc': 'ascii', 'desc': 'Merchant Name/Location'},
    48: {'max': 999, 'type': 'lllvar', 'enc': 'ascii', 'desc': 'Additional Data (TLV)'},
    49: {'len': 3,  'type': 'fixed', 'enc': 'cp500', 'desc': 'Currency Code'},
    64: {'len': 8,  'type': 'fixed', 'enc': 'binary', 'desc': 'MAC'},
}

def _decode_bytes(raw: bytes, enc: str) -> str:
    if enc == 'cp500':
        return raw.decode('cp500')
    elif enc == 'ascii':
        return raw.decode('ascii', errors='replace')
    elif enc == 'binary':
        return binascii.hexlify(raw).decode().upper()
    return raw.decode('utf-8', errors='replace')

def parse_tlv(data: str, tag_len: int = 2, len_len: int = 2) -> List[Dict[str, str]]:
    """Parser genérico para subcampos TLV (ex: Bit 48 Mastercard)"""
    subfields = []
    i = 0
    while i < len(data):
        if i + tag_len + len_len > len(data):
            break
        tag = data[i:i+tag_len]
        length = int(data[i+tag_len:i+tag_len+len_len])
        value = data[i+tag_len+len_len:i+tag_len+len_len+length]
        subfields.append({"tag": tag, "length": length, "value": value})
        i += tag_len + len_len + length
    return subfields

def decode_iso8583(hex_msg: str) -> Dict[str, Any]:
    raw = binascii.unhexlify(hex_msg)
    result = {"fields": {}, "raw_bitmap": "", "secondary_bitmap": ""}
    offset = 0

    # MTI
    cfg = MC_FIELDS[0]
    result["fields"][0] = _decode_bytes(raw[offset:offset+cfg["len"]], cfg["enc"])
    offset += cfg["len"]

    # Bitmap Primário
    bmp1 = raw[offset:offset+8]
    result["raw_bitmap"] = binascii.hexlify(bmp1).decode().upper()
    offset += 8

    def bit_is_set(bitmap: bytes, bit: int) -> bool:
        idx = (bit - 1) // 8
        pos = 7 - ((bit - 1) % 8)
        return bool(bitmap[idx] & (1 << pos))

    # Função recursiva para percorrer bitmaps
    def parse_bitmap(bitmap: bytes, start_bit: int, field_map: Dict):
        nonlocal offset
        for bit in range(1, 65):
            abs_bit = start_bit + bit - 1
            if abs_bit == 0 or abs_bit > 128: continue
            if not bit_is_set(bitmap, bit): continue
            if abs_bit not in field_map:
                result["fields"][abs_bit] = "[CAMPO NÃO MAPEADO]"
                continue

            cfg = field_map[abs_bit]
            val = b""
            try:
                if cfg["type"] == "fixed":
                    val = raw[offset:offset+cfg["len"]]
                    offset += cfg["len"]
                elif cfg["type"] == "llvar":
                    ln = int(_decode_bytes(raw[offset:offset+2], "cp500"))
                    offset += 2
                    val = raw[offset:offset+ln]
                    offset += ln
                elif cfg["type"] == "lllvar":
                    ln = int(_decode_bytes(raw[offset:offset+3], "cp500"))
                    offset += 3
                    val = raw[offset:offset+ln]
                    offset += ln

                decoded = _decode_bytes(val, cfg["enc"])
                
                # Parser TLV automático para Bit 48 (ou configure outros)
                if abs_bit == 48 and decoded:
                    result["fields"][abs_bit] = {
                        "raw": decoded,
                        "tlv": parse_tlv(decoded)
                    }
                else:
                    result["fields"][abs_bit] = decoded

            except Exception as e:
                result["fields"][abs_bit] = f"[ERRO] {str(e)}"

    # Parse primário (bits 2-64)
    parse_bitmap(bmp1, 2, MC_FIELDS)

    # Bitmap Secundário (se bit 1 do primário = 1)
    if bit_is_set(bmp1, 1):
        bmp2 = raw[offset:offset+8]
        result["secondary_bitmap"] = binascii.hexlify(bmp2).decode().upper()
        offset += 8
        parse_bitmap(bmp2, 65, MC_FIELDS)

    # Meta
    result["mti"] = result["fields"].get(0, "")
    result["status"] = "success"
    return result

# =============================================================================
# EXEMPLO DE USO
# =============================================================================
if __name__ == "__main__":
    HEX_MSG = "F0F1F2F0FEE744010261E11A0000000000000090F1F6F5F0F0F0F0F0F0F0F0F6F4F1F1F2F7F1F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F5F1F9F1F4F1F8F3F9F6F1F0F0F0F0F0F0F6F5F0F6F2F0F0F0F2F9F9F8F8F2F3F3F1F0F0F5F1F9F0F5F1F8F5F9F6F9F0F1F0F0F6F0F1F5F6F1F1F0F5C3C1D9C440C1C3C3D7E340C9C4C340849396838193609799968460F0F0F16DC399A4954B4B40E2A34B40D396A489A24040404040E4E2C1F1F1F6E3F2F6F0F3F3F2F7F3F3F6F0F0F1F0F1C8F0F2F1F6F5F4F5F4F3F4F3F1F8F3F9F0F2F3F9F8F0F3F0F4F2F9F0F6F0F5F0F2F1F0F0F6F1F1F5F0F1F0F3F6F5F1F1F8F1F0F8F0F2F0F3F7F1F0F4F1F8C340F7F5F3F2F0F1F0F3F7F3F4F0F2F0F2F5F3F0F3F0F3F7F3F4F0F4F0F2F5F3F0F5F0F2F0F0F8F4F0F8F4F0F9F8F6F0F3F7F0F1F3F3F0F1F2F9F5F0F0F1F8E6E8E2D5F8C8F4D2D9E3C4E6D4F5C3C4D7C5C9F5F0E9D9E7F0F6F0F1F0F5F1F7F0F1C4C5C3D3C9D5C540404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040F0F2F6F1F0F2F5F1F0F9F0F0F0F0F0F0F8F4F0F6F3F3F6F84040404040F0F0F9D4C3C7C7D1D6F0F2F8F0F0F6F0F0F0F0F0F0F1F9F84040F0F0404040404040404040404040404040404040404040F0F04040404040404040404040404040404040404040404040404040F0F0404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F04040404040404040404040404040404040404040"
    
    decoded = decode_iso8583(HEX_MSG)
    print(json.dumps(decoded, indent=2, ensure_ascii=False))