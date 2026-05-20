def format_field(value, field):
    if field["type"] == "char":
        return str(value).ljust(field["size"])[:field["size"]]
    elif field["type"] == "decimal":
        return str(value).zfill(field["size"])[:field["size"]]
    return ""

def generate_line(record, layout):
    return "".join(
        format_field(record.get(f["name"], ""), f)
        for f in layout
    )