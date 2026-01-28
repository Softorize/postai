import hashlib
import hmac
import re

HMAC_SECRET = b'postai-license-key-secret-2024'
KEY_PATTERN = re.compile(r'^POSTAI-([0-9A-Fa-f]{5})-([0-9A-Fa-f]{5})-([0-9A-Fa-f]{5})-([0-9A-Fa-f]{5})$')


def validate_license_key(key: str) -> bool:
    match = KEY_PATTERN.match(key.strip())
    if not match:
        return False

    groups = match.groups()
    hex_chars = ''.join(groups).lower()
    payload = hex_chars[:16]
    check = hex_chars[16:20]

    digest = hmac.new(HMAC_SECRET, payload.encode(), hashlib.sha256).hexdigest()
    return digest[:4].lower() == check.lower()


def generate_license_key() -> str:
    """Generate a valid license key (for testing/admin use)."""
    import secrets
    payload = secrets.token_hex(8)  # 16 hex chars
    digest = hmac.new(HMAC_SECRET, payload.encode(), hashlib.sha256).hexdigest()
    check = digest[:4]
    raw = payload + check
    return f'POSTAI-{raw[0:5]}-{raw[5:10]}-{raw[10:15]}-{raw[15:20]}'.upper()
