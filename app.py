import os
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Загрузка переменных окружения
load_dotenv()

# Получение токена бота из переменных окружения
TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
    await update.message.reply_text(
        'Привет! Я бот для подсчета слов в переписке. '
        'Отправьте мне сообщение, и я посчитаю количество слов в нем.'
    )

async def count_words(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Подсчет слов в сообщении"""
    text = update.message.text
    words = text.split()
    word_count = len(words)
    
    await update.message.reply_text(
        f'В вашем сообщении {word_count} слов.'
    )

def main():
    """Запуск бота"""
    # Создание приложения
    application = Application.builder().token(TOKEN).build()

    # Добавление обработчиков
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, count_words))

    # Запуск бота
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main() 