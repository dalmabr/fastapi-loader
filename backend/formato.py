def format_field(value, field):
    size = field["size"]
    text = str(value or "")

    if field["type"] == "char":
        return text.ljust(size)[:size]

    elif field["type"] == "decimal":
        scale = int(field.get("scale", 0))
        sign = "-" if text.strip().startswith("-") else " "
        normalized = text.strip().replace(",", ".").replace("-", "")

        if "." in normalized:
            integer_part, fraction_part = normalized.split(".", 1)
        else:
            integer_part, fraction_part = normalized, ""

        integer_digits = "".join(char for char in integer_part if char.isdigit())
        fraction_digits = "".join(char for char in fraction_part if char.isdigit())
        total_digits = max(size - 2, 0)
        integer_size = max(total_digits - scale, 0)

        integer_value = integer_digits.zfill(integer_size)[-integer_size:] if integer_size else ""
        fraction_value = fraction_digits.ljust(scale, "0")[:scale]

        return f"{sign}{integer_value}.{fraction_value}".ljust(size)[:size]

    return ""
