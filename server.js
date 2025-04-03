const express = require('express');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Функция для подсчета частоты слов
function getWordFrequency(text) {
  try {
    // Приводим текст к нижнему регистру и разбиваем на слова
    const words = text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Удаляем специальные символы
      .split(/\s+/)
      .filter(word => word.length > 2); // Игнорируем слова короче 3 букв

    // Подсчитываем частоту каждого слова
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Сортируем слова по частоте
    const sortedWords = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15); // Берем топ-15

    return { success: true, data: sortedWords };
  } catch (error) {
    console.error('Ошибка при подсчете частоты слов:', error);
    return { success: false, error: 'Не удалось проанализировать текст' };
  }
}

// Функция для получения сообщений из чата за определенный период
async function getChatMessages(ctx, period) {
  try {
    const chatId = ctx.chat.id;
    const now = Date.now();
    let startTime;
    
    // Определяем период
    switch(period) {
      case 'day':
        startTime = now - 24 * 60 * 60 * 1000; // 24 часа
        break;
      case 'week':
        startTime = now - 7 * 24 * 60 * 60 * 1000; // 7 дней
        break;
      case 'month':
        startTime = now - 30 * 24 * 60 * 60 * 1000; // 30 дней
        break;
      default:
        throw new Error('Неверный период');
    }

    // Получаем сообщения из чата
    const messages = await ctx.telegram.getChatHistory(chatId, {
      limit: 100, // Ограничиваем количество сообщений
      offset: 0
    });

    // Фильтруем сообщения по времени
    const filteredMessages = messages.filter(msg => {
      const msgDate = msg.date * 1000; // Конвертируем в миллисекунды
      return msgDate >= startTime && msgDate <= now;
    });

    // Собираем текст из сообщений
    const text = filteredMessages
      .map(msg => msg.text || '')
      .filter(text => text.length > 0)
      .join(' ');

    return { success: true, data: text };
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error);
    return { 
      success: false, 
      error: 'Не удалось получить сообщения из чата. Убедитесь, что бот является администратором чата.'
    };
  }
}

// Обработка inline запросов
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  
  if (query) {
    // Определяем период анализа
    let period;
    if (query.includes('день') || query.includes('дня')) {
      period = 'day';
    } else if (query.includes('неделя') || query.includes('неделю')) {
      period = 'week';
    } else if (query.includes('месяц') || query.includes('месяца')) {
      period = 'month';
    } else {
      period = 'day'; // По умолчанию анализируем за день
    }

    // Получаем сообщения из чата
    const messagesResult = await getChatMessages(ctx, period);
    
    if (messagesResult.success) {
      // Анализируем текст
      const result = getWordFrequency(messagesResult.data);
      
      if (result.success) {
        let response = `📊 Топ-15 самых частых слов за ${period === 'day' ? 'день' : period === 'week' ? 'неделю' : 'месяц'}:\n\n`;
        result.data.forEach(([word, count], index) => {
          response += `${index + 1}. "${word}" - ${count} раз\n`;
        });

        await ctx.answerInlineQuery([
          {
            type: 'article',
            id: '1',
            title: 'Анализ сообщений',
            description: `Показать топ-15 самых частых слов за ${period === 'day' ? 'день' : period === 'week' ? 'неделю' : 'месяц'}`,
            input_message_content: {
              message_text: response
            }
          }
        ]);
      } else {
        await ctx.answerInlineQuery([
          {
            type: 'article',
            id: '1',
            title: 'Ошибка анализа',
            description: 'Не удалось проанализировать текст',
            input_message_content: {
              message_text: '❌ ' + result.error
            }
          }
        ]);
      }
    } else {
      await ctx.answerInlineQuery([
        {
          type: 'article',
          id: '1',
          title: 'Ошибка получения сообщений',
          description: 'Не удалось получить сообщения из чата',
          input_message_content: {
            message_text: '❌ ' + messagesResult.error
          }
        }
      ]);
    }
  } else {
    await ctx.answerInlineQuery([
      {
        type: 'article',
        id: '1',
        title: 'Анализ за день',
        description: 'Показать топ-15 слов за последние 24 часа',
        input_message_content: {
          message_text: '📊 Анализ сообщений за последние 24 часа...'
        }
      },
      {
        type: 'article',
        id: '2',
        title: 'Анализ за неделю',
        description: 'Показать топ-15 слов за последнюю неделю',
        input_message_content: {
          message_text: '📊 Анализ сообщений за последнюю неделю...'
        }
      },
      {
        type: 'article',
        id: '3',
        title: 'Анализ за месяц',
        description: 'Показать топ-15 слов за последний месяц',
        input_message_content: {
          message_text: '📊 Анализ сообщений за последний месяц...'
        }
      }
    ]);
  }
});

// Обработка команды /start
bot.command('start', async (ctx) => {
  await ctx.reply(
    'Привет! Я бот для анализа сообщений в чате. Используйте меня в любом чате:\n\n' +
    '1. Напишите @имя_бота\n' +
    '2. Выберите период анализа (день, неделя, месяц)\n' +
    '3. Я проанализирую сообщения и покажу топ-15 самых частых слов'
  );
});

// Обработка команды /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    'Как использовать бота:\n\n' +
    '1. В любом чате напишите @имя_бота\n' +
    '2. Выберите период анализа:\n' +
    '   - За день (последние 24 часа)\n' +
    '   - За неделю (последние 7 дней)\n' +
    '   - За месяц (последние 30 дней)\n' +
    '3. Я проанализирую сообщения и покажу топ-15 самых частых слов\n\n' +
    'Важно: бот должен быть администратором чата для доступа к истории сообщений.'
  );
});

// Запуск бота
bot.launch();

// Включаем graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 