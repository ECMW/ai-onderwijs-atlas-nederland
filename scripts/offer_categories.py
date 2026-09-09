"""Editorial offer forms; these categories are not safety or quality labels."""

OFFER_CATEGORIES = {"software", "materials", "knowledge"}


def offer_category_errors(record):
    value = record.get("offerCategory")
    if value is not None and (not isinstance(value, str) or value not in OFFER_CATEGORIES):
        return [f"{record.get('id', '<zonder-id>')}: ongeldige offerCategory"]
    return []
