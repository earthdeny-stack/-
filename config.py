import os

# Telegram Bot Configuration
BOT_TOKEN = os.getenv("BOT_TOKEN", "1234567890:YOUR_TELEGRAM_BOT_TOKEN")
REQUIRED_CHANNEL = os.getenv("REQUIRED_CHANNEL", "@Rage_Kill") # Channel required for subscription
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-domain.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "qpalmASSDE")

# Telegram User Account Client (Telethon / Pyrogram) Configuration for parsing channels
API_ID = int(os.getenv("API_ID", "123456")) # Obtain from my.telegram.org
API_HASH = os.getenv("API_HASH", "your_api_hash_here")
USER_SESSION_STRING = os.getenv("USER_SESSION_STRING", "") # Telethon/Pyrogram String Session

# Checker Settings
PING_TIMEOUT = float(os.getenv("PING_TIMEOUT", "3.0")) # seconds max for ping test
MAX_TERRIBLE_PING = float(os.getenv("MAX_TERRIBLE_PING", "1000.0")) # Remove proxy if ping > 1000 ms

# File Paths
CHANNELS_FILE = os.path.join(os.path.dirname(__file__), "channels.txt")
DATABASE_FILE = os.path.join(os.path.dirname(__file__), "proxies_db.json")
