const express = require('express');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Функция для подсчета частоты слов
function getWordFrequency(text) {
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

  return sortedWords;
}

// Функция для получения сообщений за период
async function getMessagesForPeriod(ctx, period) {
  const now = new Date();
  let startDate;
  
  switch(period) {
    case 'day':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 24 * 60 * 60 * 1000);
  }

  try {
    // Получаем историю сообщений
    const messages = await ctx.telegram.getChatHistory(ctx.chat.id, {
      limit: 100, // Максимальное количество сообщений
      offset: 0
    });

    // Фильтруем сообщения по дате
    const filteredMessages = messages.filter(msg => 
      new Date(msg.date * 1000) >= startDate
    );

    // Собираем весь текст
    const allText = filteredMessages
      .map(msg => msg.text || '')
      .join(' ');

    return allText;
  } catch (error) {
    console.error('Ошибка при получении истории сообщений:', error);
    return '';
  }
}

// Обработка inline запросов
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  
  if (query) {
    // Анализируем текст запроса
    const frequency = getWordFrequency(query);
    let response = '📊 Топ-15 самых частых слов:\n\n';
    frequency.forEach(([word, count], index) => {
      response += `${index + 1}. "${word}" - ${count} раз\n`;
    });

    await ctx.answerInlineQuery([
      {
        type: 'article',
        id: '1',
        title: 'Топ-15 слов за день',
        description: 'Анализ сообщений за последние 24 часа',
        input_message_content: {
          message_text: '📊 Анализ сообщений за последние 24 часа...'
        }
      },
      {
        type: 'article',
        id: '2',
        title: 'Топ-15 слов за неделю',
        description: 'Анализ сообщений за последнюю неделю',
        input_message_content: {
          message_text: '📊 Анализ сообщений за последнюю неделю...'
        }
      },
      {
        type: 'article',
        id: '3',
        title: 'Топ-15 слов за месяц',
        description: 'Анализ сообщений за последний месяц',
        input_message_content: {
          message_text: '📊 Анализ сообщений за последний месяц...'
        }
      }
    ]);
  } else {
    await ctx.answerInlineQuery([{
      type: 'article',
      id: '1',
      title: 'Анализ сообщений в чате',
      description: 'Выберите период для анализа',
      input_message_content: {
        message_text: 'Пожалуйста, выберите период для анализа сообщений в чате'
      }
    }]);
  }
});

// Обработка выбора периода
bot.on('chosen_inline_result', async (ctx) => {
  const resultId = ctx.chosenInlineResult.result_id;
  let period;
  
  switch(resultId) {
    case '1':
      period = 'day';
      break;
    case '2':
      period = 'week';
      break;
    case '3':
      period = 'month';
      break;
  }

  if (period) {
    const messages = await getMessagesForPeriod(ctx, period);
    const frequency = getWordFrequency(messages);
    
    let response = `📊 Топ-15 самых частых слов за ${period === 'day' ? 'последние 24 часа' : period === 'week' ? 'последнюю неделю' : 'последний месяц'}:\n\n`;
    frequency.forEach(([word, count], index) => {
      response += `${index + 1}. "${word}" - ${count} раз\n`;
    });

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      ctx.chosenInlineResult.inline_message_id,
      null,
      response
    );
  }
});

// Обработка команды /start
bot.command('start', async (ctx) => {
  await ctx.reply(
    'Привет! Я бот для анализа сообщений в чате. Используйте меня следующим образом:\n\n' +
    '1. Напишите @имя_бота в чате\n' +
    '2. Выберите период анализа (день/неделя/месяц)\n' +
    '3. Я проанализирую все сообщения за выбранный период и покажу топ-15 самых частых слов'
  );
});

// Обработка команды /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    'Как использовать бота:\n\n' +
    '1. Напишите @имя_бота в чате\n' +
    '2. Выберите период анализа:\n' +
    '   - За день (последние 24 часа)\n' +
    '   - За неделю\n' +
    '   - За месяц\n' +
    '3. Я проанализирую все сообщения за выбранный период и покажу топ-15 самых частых слов'
  );
});

// Запуск бота
bot.launch();

// Включаем graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 