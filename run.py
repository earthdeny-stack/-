import os
import asyncio
import logging
import uvicorn
from proxy_checker import MTProtoProxyChecker
from channel_parser import TelegramUserChannelScanner
from server import app

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("MasterRunner")

async def run_fastapi_server():
    try:
        port = int(os.getenv("PORT", 80))
        logger.info(f"🌐 Запуск FastAPI WebApp сервера на порту {port}...")
        config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
        server = uvicorn.Server(config)
        await server.serve()
    except Exception as e:
        logger.error(f"❌ Ошибка сервера FastAPI: {e}")

async def run_scanner_loop():
    try:
        checker = MTProtoProxyChecker()
        scanner = TelegramUserChannelScanner(checker)
        await scanner.start_background_monitoring()
    except Exception as e:
        logger.error(f"❌ Ошибка в цикле сканера: {e}")

async def main():
    logger.info("🚀 Запуск единой системы: FastAPI WebApp + Proxy Scanner...")
    # Using return_exceptions=True so a background network task failure NEVER crashes the app!
    await asyncio.gather(
        run_fastapi_server(),
        run_scanner_loop(),
        return_exceptions=True
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Завершение работы системы.")
