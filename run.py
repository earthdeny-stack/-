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
    # Amvera Cloud Envoy expects application to listen on Port 80
    port = int(os.getenv("PORT", 80))
    logger.info(f"🌐 Запуск FastAPI сервера на 0.0.0.0:{port}...")
    config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()

async def run_scanner_loop():
    checker = MTProtoProxyChecker()
    scanner = TelegramUserChannelScanner(checker)
    await scanner.start_background_monitoring()

async def main():
    logger.info("🚀 Запуск единой системы: FastAPI WebApp + MTProto Scanner + Re-Ping Checker...")
    await asyncio.gather(
        run_fastapi_server(),
        run_scanner_loop()
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Завершение работы системы.")
