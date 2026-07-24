import os

# Telegram Bot Configuration
BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
REQUIRED_CHANNEL = os.getenv("REQUIRED_CHANNEL", "@Rage_Kill").strip()
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-domain.com").strip()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "qpalmASSDE").strip()

# Telegram User Account Client Configuration
try:
    API_ID = int(os.getenv("API_ID", "0"))
except Exception:
    API_ID = 0

API_HASH = os.getenv("API_HASH", "").strip()
USER_SESSION_STRING = os.getenv("USER_SESSION_STRING", "").strip()

# Checker Settings (5.0 sec timeout for cloud environments)
PING_TIMEOUT = float(os.getenv("PING_TIMEOUT", "5.0"))
MAX_TERRIBLE_PING = float(os.getenv("MAX_TERRIBLE_PING", "1500.0"))

# File Paths
BASE_DIR = os.path.dirname(__file__)
CHANNELS_FILE = os.path.join(BASE_DIR, "channels.txt")
DATABASE_FILE = os.path.join(BASE_DIR, "proxies_db.json")
