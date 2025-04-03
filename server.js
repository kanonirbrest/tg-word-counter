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

// Обработка inline запросов
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  
  if (query) {
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
        description: 'Анализ частоты слов за последние 24 часа',
        input_message_content: {
          message_text: response + '\n\n📅 Период: последние 24 часа'
        }
      },
      {
        type: 'article',
        id: '2',
        title: 'Топ-15 слов за неделю',
        description: 'Анализ частоты слов за последнюю неделю',
        input_message_content: {
          message_text: response + '\n\n📅 Период: последняя неделя'
        }
      },
      {
        type: 'article',
        id: '3',
        title: 'Топ-15 слов за месяц',
        description: 'Анализ частоты слов за последний месяц',
        input_message_content: {
          message_text: response + '\n\n📅 Период: последний месяц'
        }
      }
    ]);
  } else {
    await ctx.answerInlineQuery([{
      type: 'article',
      id: '1',
      title: 'Введите текст для анализа',
      description: 'Напишите текст после @имя_бота',
      input_message_content: {
        message_text: 'Пожалуйста, введите текст для анализа после @имя_бота'
      }
    }]);
  }
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const frequency = getWordFrequency(text);
  
  let response = '📊 Топ-15 самых частых слов:\n\n';
  frequency.forEach(([word, count], index) => {
    response += `${index + 1}. "${word}" - ${count} раз\n`;
  });
  
  await ctx.reply(response);
});

// Обработка команды /start
bot.command('start', async (ctx) => {
  await ctx.reply(
    'Привет! Я бот для анализа текста. Отправьте мне любой текст, и я покажу топ-15 самых частых слов в нем.\n\n' +
    'Также вы можете использовать меня в любом чате:\n' +
    '1. Напишите @имя_бота\n' +
    '2. Введите текст для анализа\n' +
    '3. Выберите период анализа (день/неделя/месяц)'
  );
});

// Обработка команды /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    'Как использовать бота:\n\n' +
    '1. Отправьте мне любой текст\n' +
    '2. Я проанализирую его и покажу топ-15 самых частых слов\n' +
    '3. Также вы можете использовать меня в любом чате:\n' +
    '   - Напишите @имя_бота\n' +
    '   - Введите текст для анализа\n' +
    '   - Выберите период анализа (день/неделя/месяц)'
  );
});

// Запуск бота
bot.launch();

// Включаем graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 