import logging
import asyncio
import os
from typing import List, Dict
from config import BOT_TOKEN, REQUIRED_CHANNEL, WEBAPP_URL
from proxy_checker import load_proxies_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ProxyBot")

# Aiogram 3 Integration Blueprint
AIOGRAM_BOT_CODE = """
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from config import BOT_TOKEN, REQUIRED_CHANNEL, WEBAPP_URL
from proxy_checker import load_proxies_db, MTProtoProxyChecker, save_proxies_db

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
checker = MTProtoProxyChecker()

async def check_user_subscription(user_id: int) -> bool:
    try:
        member = await bot.get_chat_member(chat_id=REQUIRED_CHANNEL, user_id=user_id)
        return member.status in ["creator", "administrator", "member"]
    except Exception as e:
        logging.error(f"Error checking sub for {user_id}: {e}")
        return True # Default fallback if channel check fails

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    is_sub = await check_user_subscription(user_id)

    if not is_sub:
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📢 Подписаться на èkb", url=f"https://t.me/{REQUIRED_CHANNEL.replace('@', '')}")],
            [InlineKeyboardButton(text="🔄 Проверить подписку", callback_data="check_sub")]
        ])
        await message.answer(
            f"⚠️ **Для использования бота необходимо подписаться на канал:**\\n\\n"
            f"👉 {REQUIRED_CHANNEL}\\n\\n"
            f"После подписки нажмите кнопку **Проверить подписку**.",
            reply_markup=kb,
            parse_mode="Markdown"
        )
        return

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Открыть Telegram Proxy", web_app=WebAppInfo(url=WEBAPP_URL))]
    ])
    await message.answer(
        "👋 **Добро пожаловать в Telegram Proxy - @Rage_Kill!**\\n\\n"
        "Нажмите кнопку ниже, чтобы открыть список самых быстрых MTProto прокси с минимальным пингом.",
        reply_markup=kb,
        parse_mode="Markdown"
    )

@dp.callback_query(F.data == "check_sub")
async def cb_check_sub(query: types.CallbackQuery):
    is_sub = await check_user_subscription(query.from_user.id)
    if is_sub:
        await query.message.delete()
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🚀 Открыть Telegram Proxy", web_app=WebAppInfo(url=WEBAPP_URL))]
        ])
        await query.message.answer("✅ **Подписка подтверждена!** Открывайте список прокси ниже:", reply_markup=kb, parse_mode="Markdown")
    else:
        await query.answer("❌ Вы ещё не подписались на канал!", show_alert=True)

# Emergency Fallback Handler (If user proxy dies, bot sends fastest proxy link)
@dp.message(Command("emergency"))
async def cmd_emergency(message: types.Message):
    proxies = load_proxies_db()
    if not proxies:
        await message.answer("❌ В базе пока нет доступных прокси.")
        return

    best = sorted(proxies, key=lambda x: x.get('ping', 999))[0]
    url = f"tg://proxy?server={best['server']}&port={best['port']}&secret={best['secret']}"
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚡ Подключить резервный прокси", url=url)]
    ])
    await message.answer(
        f"🚨 **Экстренный Авто-Прокси**\\n\\n"
        f"🇩🇪 Локация: **{best['country']}**\\n"
        f"⚡ Пинг: **{best['ping']} ms**\\n"
        f"🛡️ Тип: **{best['secret_type']}**\\n\\n"
        f"Нажмите кнопку ниже для подключения:",
        reply_markup=kb,
        parse_mode="Markdown"
    )

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
"""

def print_bot_info():
  logger.info("🤖 Bot Engine initialized with Aiogram 3 structure & WebApp integration.")

if __name__ == "__main__":
  print_bot_info()
