"""
Person detection SMS/WhatsApp notifications via Twilio.

Sends alerts when persons are detected on a camera. Throttled to avoid spam.
Set env vars to enable: TWILIO_*, NOTIFY_PHONE, etc.
"""

import os
from datetime import datetime, timedelta

# Throttle: don't send more than once per camera per THROTTLE_SECONDS
THROTTLE_SECONDS = 60
_last_sent: dict[str, datetime] = {}
_enabled: dict[str, bool] = {}


def set_notifications_enabled(camera_id: str, enabled: bool) -> None:
    _enabled[camera_id] = enabled


def get_notifications_enabled(camera_id: str) -> bool:
    return _enabled.get(camera_id, False)


def _can_send(camera_id: str) -> bool:
    if camera_id not in _last_sent:
        return True
    return datetime.now() - _last_sent[camera_id] > timedelta(seconds=THROTTLE_SECONDS)


def notify_person_detected(camera_name: str, camera_id: str, person_count: int) -> None:
    """Send SMS and/or WhatsApp when persons detected. Requires Twilio env vars."""
    if person_count < 1:
        return
    if not get_notifications_enabled(camera_id):
        return
    if not _can_send(camera_id):
        return

    try:
        from twilio.rest import Client
    except ImportError:
        print("[NOTIFY] Install twilio: pip install twilio")
        return

    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    to_phone = os.getenv("NOTIFY_PHONE")
    sms_from = os.getenv("TWILIO_PHONE_SMS") or os.getenv("TWILIO_PHONE_NUMBER")
    whatsapp_from = os.getenv("TWILIO_WHATSAPP_FROM")
    use_sms = os.getenv("NOTIFY_SMS", "true").lower() == "true"
    use_whatsapp = os.getenv("NOTIFY_WHATSAPP", "false").lower() == "true"

    if not sid or not token or not to_phone:
        print("[NOTIFY] Missing env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or NOTIFY_PHONE")
        return
    if use_sms and not sms_from:
        print("[NOTIFY] NOTIFY_SMS=true but TWILIO_PHONE_SMS / TWILIO_PHONE_NUMBER not set")
        return

    msg = f"Nexxau Alert: {person_count} person(s) detected on camera '{camera_name}'."
    sent = False

    if use_sms and sms_from:
        try:
            client = Client(sid, token)
            client.messages.create(body=msg, from_=sms_from, to=to_phone)
            sent = True
            print(f"[NOTIFY] SMS sent to {to_phone}: {camera_name} — {person_count} person(s)")
        except Exception as e:
            err = str(e)
            if "63038" in err or "50 daily" in err:
                print("[NOTIFY] Twilio daily limit (50 msgs) reached. Add credit or wait until tomorrow.")
            else:
                print(f"[NOTIFY] SMS failed: {err[:200]}")
            if "21608" in err or "verified" in err.lower():
                print("[NOTIFY] Verify destination at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified")

    if use_whatsapp and whatsapp_from:
        try:
            client = Client(sid, token)
            to_wa = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
            client.messages.create(body=msg, from_=whatsapp_from, to=to_wa)
            sent = True
            print(f"[NOTIFY] WhatsApp sent: {camera_name} — {person_count} person(s)")
        except Exception as e:
            print(f"[NOTIFY] WhatsApp failed: {e}")

    _last_sent[camera_id] = datetime.now()
