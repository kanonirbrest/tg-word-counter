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
  
  // Создаем результаты для inline меню
  const results = [
    {
      type: 'article',
      id: '1',
      title: 'Подсчитать слова в этом чате',
      description: 'Проанализировать все сообщения в текущем чате',
      input_message_content: {
        message_text: '🔍 Анализ сообщений в этом чате...'
      }
    },
    {
      type: 'article',
      id: '2',
      title: 'Топ-15 частых слов',
      description: 'Показать самые часто используемые слова',
      input_message_content: {
        message_text: '📊 Анализ частоты слов...'
      }
    },
    {
      type: 'article',
      id: '3',
      title: 'Подсчитать слова за последний месяц',
      description: 'Проанализировать сообщения за последние 30 дней',
      input_message_content: {
        message_text: '📈 Анализ сообщений за последний месяц...'
      }
    }
  ];

  // Отправляем результаты inline запроса
  await ctx.answerInlineQuery(results);
});

// Обработка выбора опции
bot.on('chosen_inline_result', async (ctx) => {
  const resultId = ctx.chosenInlineResult.result_id;
  const chatId = ctx.chosenInlineResult.from.id;
  
  let response = '';
  
  switch(resultId) {
    case '1':
      response = 'Анализирую все сообщения в этом чате...';
      break;
    case '2':
      response = 'Анализирую частоту слов...';
      break;
    case '3':
      response = 'Анализирую сообщения за последний месяц...';
      break;
  }
  
  // Отправляем сообщение о начале анализа
  await ctx.telegram.sendMessage(chatId, response);
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
    'Привет! Я бот для анализа текста. Отправьте мне любой текст, и я покажу топ-15 самых частых слов в нем.'
  );
});

// Обработка команды /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    'Как использовать бота:\n\n' +
    '1. Отправьте мне любой текст\n' +
    '2. Я проанализирую его и покажу топ-15 самых частых слов\n' +
    '3. Также вы можете использовать меня в любом чате, написав @имя_бота'
  );
});

// Запуск бота
bot.launch();

// Включаем graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 