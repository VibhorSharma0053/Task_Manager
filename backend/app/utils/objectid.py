from bson import ObjectId


def str_id(doc: dict) -> dict:
    """Convert MongoDB document _id to string id."""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def is_valid_objectid(value: str) -> bool:
    """Check if a string is a valid MongoDB ObjectId."""
    return ObjectId.is_valid(value)