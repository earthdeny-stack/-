import os
import asyncio
import logging
import urllib.request
import re
import html
from urllib.parse import parse_qs
from typing import List, Dict
from config import API_ID, API_HASH, USER_SESSION_STRING, CHANNELS_FILE
from proxy_checker import MTProtoProxyChecker, load_proxies_db, save_proxies_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ChannelParser")

def read_channels_from_file() -> List[str]:
    channels = []
    if os.path.exists(CHANNELS_FILE):
        with open(CHANNELS_FILE, "r", encoding="utf-8") as f:
            for line in f:
                cleaned = line.strip()
                if cleaned and not cleaned.startswith("#"):
                    channels.append(cleaned)
    return channels

class TelegramUserChannelScanner:
    """
    Dual Engine Channel Scanner:
    1. Telethon UserBot: Connects via USER_SESSION_STRING and listens for live NewMessage events
       (parsing text + inline keyboard buttons in real time).
    2. Web Preview Scraper: Scrapes public channel HTML (https://t.me/s/channel) as fail-safe.
    """
    def __init__(self, checker: MTProtoProxyChecker):
        self.checker = checker
        self.target_channels = read_channels_from_file()
        self.client = None

    async def start_telethon_userbot(self):
        """
        Connects Telethon client using USER_SESSION_STRING if provided
        """
        if not USER_SESSION_STRING or not API_ID or not API_HASH:
            logger.info("ℹ️ USER_SESSION_STRING не задан. Переходим в режим Авто-Скрапинга.")
            return

        try:
            from telethon import TelegramClient, events
            from telethon.sessions import StringSession

            logger.info("📲 Подключение аккаунта Telethon UserBot по USER_SESSION_STRING...")
            self.client = TelegramClient(StringSession(USER_SESSION_STRING), API_ID, API_HASH)
            await self.client.start()

            @self.client.on(events.NewMessage(chats=self.target_channels))
            async def on_new_message(event):
                text = event.message.text or ""
                button_urls = []

                if event.message.reply_markup and hasattr(event.message.reply_markup, 'rows'):
                    for row in event.message.reply_markup.rows:
                        for btn in row.buttons:
                            if hasattr(btn, 'url') and btn.url:
                                button_urls.append(btn.url)

                logger.info(f"📩 [Telethon Live] Новое сообщение в канале! Парсим ссылки и инлайн-кнопки...")
                extracted = self.checker.extract_proxies_from_content(text, button_urls)
                if extracted:
                    live = await self.checker.run_full_reping_cycle(extracted)
                    if live:
                        db_proxies = load_proxies_db()
                        existing_keys = {f"{p['server']}:{p['port']}" for p in db_proxies}
                        added = 0
                        for lp in live:
                            key = f"{lp['server']}:{lp['port']}"
                            if key not in existing_keys:
                                db_proxies.insert(0, lp)
                                existing_keys.add(key)
                                added += 1
                        if added > 0:
                            db_proxies.sort(key=lambda x: x.get('ping', 999))
                            save_proxies_db(db_proxies)
                            logger.info(f"🎉 [Telethon Event] Добавлено {added} новых прокси из живого поста!")

            logger.info("✅ Telethon UserBot успешно подключен и мониторит каналы в реальном времени!")
            await self.client.run_until_disconnected()

        except Exception as e:
            logger.error(f" Ошибка запуска Telethon UserBot: {e}")

    def scrape_web_preview_channel(self, channel_target: str) -> List[Dict[str, str]]:
        if not channel_target.startswith('https://t.me/s/'):
            ch_name = channel_target.replace('https://t.me/', '').replace('@', '').strip('/')
            url = f'https://t.me/s/{ch_name}'
        else:
            url = channel_target

        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )

        found_proxies = []
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                content = html.unescape(resp.read().decode('utf-8'))
                pattern = r'(?:tg://proxy\?|https?://t\.me/proxy\?)([^\s\"\'<>]+)'
                matches = re.findall(pattern, content)

                for query in matches:
                    parsed = parse_qs(query)
                    server = parsed.get('server', [''])[0]
                    port_str = parsed.get('port', [''])[0]
                    secret = parsed.get('secret', [''])[0]

                    if server and port_str and secret:
                        try:
                            port = int(port_str)
                            secret_type = 'TLS Obfuscated' if secret.startswith('ee') or secret.startswith('7g') else 'Fake TLS'
                            found_proxies.append({
                                'id': f"proxy-{hash(server + str(port) + secret) & 0xffffffff}",
                                'country': 'Германия',
                                'city': 'Франкфурт',
                                'flag': '🇩🇪',
                                'server': server,
                                'port': port,
                                'secret': secret,
                                'secret_type': secret_type,
                                'ping': 0,
                                'uptime': 99.9,
                                'sponsor': '@Rage_Kill'
                            })
                        except ValueError:
                            continue
        except Exception as e:
            logger.warning(f"Не удалось распарсить веб-превью {url}: {e}")

        return found_proxies

    async def scan_and_update_all_channels(self):
        all_discovered = []
        for ch in self.target_channels:
            extracted = self.scrape_web_preview_channel(ch)
            if extracted:
                all_discovered.extend(extracted)

        if not all_discovered:
            return

        live_proxies = await self.checker.run_full_reping_cycle(all_discovered)

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
                db_proxies.sort(key=lambda x: x.get('ping', 999))
                save_proxies_db(db_proxies)
                logger.info(f"🎉 Автоматически обновлено и добавлено {added_count} рабочих прокси в WebApp!")

    async def start_background_monitoring(self):
        logger.info(f"📡 Автоматический сканер запущен! Каналы: {self.target_channels}")

        # Start Telethon Live Event Listener in background task if session is set
        if USER_SESSION_STRING:
            asyncio.create_task(self.start_telethon_userbot())

        while True:
            try:
                await self.scan_and_update_all_channels()

                db_proxies = load_proxies_db()
                if db_proxies:
                    logger.info("🔄 Автоматическая Re-Ping перепроверка базы прокси...")
                    updated_proxies = await self.checker.run_full_reping_cycle(db_proxies)
                    save_proxies_db(updated_proxies)
                    logger.info(f"📊 В базе осталось {len(updated_proxies)} активных серверов.")

            except Exception as e:
                logger.error(f"Ошибка в цикле сканера: {e}")

            await asyncio.sleep(35)
