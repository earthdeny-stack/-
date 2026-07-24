import os
import asyncio
import logging
from typing import List
from config import API_ID, API_HASH, USER_SESSION_STRING, CHANNELS_FILE
from proxy_checker import MTProtoProxyChecker, load_proxies_db, save_proxies_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ChannelParser")

def read_channels_from_file() -> List[str]:
  """
  Reads channel usernames and URLs from channels.txt file
  """
  channels = []
  if os.path.exists(CHANNELS_FILE):
    with open(CHANNELS_FILE, "r", encoding="utf-8") as f:
      for line in f:
        cleaned = line.strip()
        if cleaned and not cleaned.startswith("#"):
          # Clean username or link
          if "t.me/" in cleaned:
            cleaned = "@" + cleaned.split("t.me/")[-1].strip("/")
          if not cleaned.startswith("@"):
            cleaned = "@" + cleaned
          channels.append(cleaned)
  return channels

class TelegramUserChannelScanner:
  """
  Account Channel Scanner (Telethon/Pyrogram integration structure)
  Scans channels from channels.txt, parses text links & inline button URLs,
  measures ping and automatically posts working proxies to WebApp database.
  """
  def __init__(self, checker: MTProtoProxyChecker):
    self.checker = checker
    self.target_channels = read_channels_from_file()

  async def process_raw_message_data(self, text: str, button_urls: List[str] = None):
    """
    Smart Parser: extracts proxies from text + inline buttons,
    runs latency check, and adds working proxies to DB.
    """
    extracted = self.checker.extract_proxies_from_content(text, button_urls)
    if not extracted:
      return

    logger.info(f"🔎 Найдено {len(extracted)} потенциальных MTProto прокси! Проверяем пинг...")
    live_proxies = await self.checker.run_full_reping_cycle(extracted)

    if live_proxies:
      db_proxies = load_proxies_db()
      existing_keys = {f"{p['server']}:{p['port']}" for p in db_proxies}
      
      added_count = 0
      for lp in live_proxies:
        key = f"{lp['server']}:{lp['port']}"
        if key not in existing_keys:
          db_proxies.insert(0, lp)
          existing_keys.add(key)
          added_count += 1

      if added_count > 0:
        save_proxies_db(db_proxies)
        logger.info(f"✅ Успешно добавлено {added_count} новых рабочих прокси в WebApp!")

  async def start_background_monitoring(self):
    """
    Periodic channel scan loop simulation & live monitoring
    """
    logger.info(f"📡 Аккаунт-сканер запущен! Мониторим {len(self.target_channels)} каналов: {self.target_channels}")
    
    # Telethon / Pyrogram Client Code Blueprint
    """
    from telethon import TelegramClient, events
    
    client = TelegramClient('user_session', API_ID, API_HASH)
    
    @client.on(events.NewMessage(chats=self.target_channels))
    async def handler(event):
        text = event.message.text or ""
        button_urls = []
        if event.message.reply_markup and hasattr(event.message.reply_markup, 'rows'):
            for row in event.message.reply_markup.rows:
                for btn in row.buttons:
                    if hasattr(btn, 'url') and btn.url:
                        button_urls.append(btn.url)
        await self.process_raw_message_data(text, button_urls)
        
    await client.start()
    await client.run_until_disconnected()
    """
    
    while True:
      # Periodic maintenance and reping of existing proxies in DB
      try:
        db_proxies = load_proxies_db()
        if db_proxies:
          logger.info("🔄 Автоматическая проверка задержки (Re-Ping) всех прокси в базе...")
          updated_proxies = await self.checker.run_full_reping_cycle(db_proxies)
          save_proxies_db(updated_proxies)
          logger.info(f"📊 В базе осталось {len(updated_proxies)} активных серверов.")
      except Exception as e:
        logger.error(f"Error in scanner loop: {e}")

      await asyncio.sleep(60) # Re-ping every 60 seconds
