import bcrypt


# Bcrypt has a hard limit of 72 bytes — we truncate safely.
MAX_BCRYPT_BYTES = 72


def _truncate(password: str) -> bytes:
    """Encode and truncate password to 72 bytes (bcrypt limit)."""
    return password.encode("utf-8")[:MAX_BCRYPT_BYTES]


def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt."""
    hashed = bcrypt.hashpw(_truncate(password), bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the hashed one."""
    try:
        return bcrypt.checkpw(_truncate(plain_password), hashed_password.encode("utf-8"))
    except Exception:
        return False