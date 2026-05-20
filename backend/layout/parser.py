import re
from math import ceil


def normalize_field_name(name):
    return name.rstrip(".").replace("-", "_").upper()


def get_level(line):
    match = re.match(r"^(\d+)\s+", line)
    return int(match.group(1)) if match else None


def parse_pic(pic):
    clean_pic = pic.upper().replace("S", "")

    if "X" in clean_pic:
        size_match = re.search(r"X\((\d+)\)", clean_pic)
        return {
            "type": "char",
            "size": int(size_match.group(1)) if size_match else 1,
            "scale": 0,
            "digits": 0,
        }

    digit_groups = [int(value) for value in re.findall(r"9\((\d+)\)", clean_pic)]
    explicit_digits = len(re.findall(r"9(?!\()", clean_pic))
    digits = sum(digit_groups) + explicit_digits

    scale = 0
    scale_match = re.search(r"V9(?:\((\d+)\))?", clean_pic)
    if scale_match:
        scale = int(scale_match.group(1) or "1")

    display_size = digits + 2

    return {
        "type": "decimal",
        "size": display_size,
        "scale": scale,
        "digits": digits,
    }


def storage_size(field_info, usage):
    if field_info["type"] == "char":
        return field_info["size"]

    digits = field_info["digits"]
    normalized_usage = usage.upper()

    if "COMP-3" in normalized_usage:
        return ceil((digits + 1) / 2)

    if "COMP" in normalized_usage:
        if digits <= 4:
            return 2
        if digits <= 9:
            return 4
        return 8

    return field_info["size"]


def parse_cobol_layout(text):
    fields = []
    active_group = None

    def flush_group():
        nonlocal active_group
        if not active_group:
            return

        fields.append({
            "name": f"{active_group['name']}_HEX",
            "cobolName": active_group["originalName"],
            "type": "char",
            "size": active_group["storageSize"] * 2,
            "scale": 0,
            "storage": "hex",
            "storageSize": active_group["storageSize"],
            "source": "hex_group",
        })
        active_group = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        level = get_level(line)

        if not line or not level:
            continue

        parts = line.split()
        if len(parts) < 2:
            continue

        raw_name = parts[1].rstrip(".")
        normalized_name = normalize_field_name(raw_name)

        if active_group and level <= active_group["level"]:
            flush_group()

        if "PIC" not in line.upper():
            if normalized_name in {"DATADI", "DATADI2"}:
                active_group = {
                    "level": level,
                    "name": normalized_name,
                    "originalName": raw_name,
                    "storageSize": 0,
                }
            continue

        pic_match = re.search(r"PIC\s+([SX9\(\)V0-9]+)", line, re.IGNORECASE)
        if not pic_match:
            continue

        pic = pic_match.group(1)
        field_info = parse_pic(pic)
        usage = line[pic_match.end():]
        field_storage_size = storage_size(field_info, usage)

        if active_group and level > active_group["level"]:
            active_group["storageSize"] += field_storage_size
            continue

        storage = "display"
        if "COMP-3" in usage.upper():
            storage = "comp-3"
        elif "COMP" in usage.upper():
            storage = "comp"

        fields.append({
            "name": normalized_name,
            "cobolName": raw_name,
            "type": field_info["type"],
            "size": field_info["size"],
            "scale": field_info["scale"],
            "storage": storage,
            "storageSize": field_storage_size,
        })

    flush_group()
    return fields
