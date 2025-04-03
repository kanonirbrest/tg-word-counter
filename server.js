const express = require('express');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

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
      title: 'Подсчитать слова за последнюю неделю',
      description: 'Проанализировать сообщения за последние 7 дней',
      input_message_content: {
        message_text: '📊 Анализ сообщений за последнюю неделю...'
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
  
  // Здесь будет логика анализа сообщений
  let response = '';
  
  switch(resultId) {
    case '1':
      response = 'Анализирую все сообщения в этом чате...';
      break;
    case '2':
      response = 'Анализирую сообщения за последнюю неделю...';
      break;
    case '3':
      response = 'Анализирую сообщения за последний месяц...';
      break;
  }
  
  // Отправляем сообщение о начале анализа
  await ctx.telegram.sendMessage(chatId, response);
});

// Запуск бота
bot.launch();

// Включаем graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 