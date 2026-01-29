import hashlib
import hmac
import re

HMAC_SECRET = b'postai-license-key-secret-2024'
ROW_SIGN_SECRET = b'postai-row-integrity-8f3k2m9x'
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


def compute_row_signature(trial_started_at: str, license_key: str, activated_at: str) -> str:
    """Compute HMAC signature over the license row's critical fields."""
    message = f'{trial_started_at}|{license_key}|{activated_at}'
    return hmac.new(ROW_SIGN_SECRET, message.encode(), hashlib.sha256).hexdigest()


def sign_license(instance) -> None:
    """Compute and store the row signature on a License instance."""
    instance.row_signature = compute_row_signature(
        str(instance.trial_started_at.isoformat()) if instance.trial_started_at else '',
        instance.license_key or '',
        str(instance.activated_at.isoformat()) if instance.activated_at else '',
    )


def verify_license(instance) -> bool:
    """Verify that a License row has not been tampered with."""
    if not instance.row_signature:
        return False
    expected = compute_row_signature(
        str(instance.trial_started_at.isoformat()) if instance.trial_started_at else '',
        instance.license_key or '',
        str(instance.activated_at.isoformat()) if instance.activated_at else '',
    )
    return hmac.compare_digest(instance.row_signature, expected)
