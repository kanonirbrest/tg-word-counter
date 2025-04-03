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
    try {
      // Получаем информацию о чате
      const chat = await ctx.telegram.getChat(ctx.chat.id);
      
      // Получаем последние сообщения через метод getUpdates
      const updates = await ctx.telegram.getUpdates({
        offset: -1,
        limit: 100,
        timeout: 0
      });
      
      // Фильтруем сообщения по периоду
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
      }

      // Фильтруем сообщения из нужного чата и за нужный период
      const chatMessages = updates
        .filter(update => 
          update.message && 
          update.message.chat.id === chat.id &&
          new Date(update.message.date * 1000) >= startDate
        )
        .map(update => update.message.text || '');

      // Собираем весь текст
      const allText = chatMessages.join(' ');

      const frequency = getWordFrequency(allText);
      
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
    } catch (error) {
      console.error('Ошибка при получении сообщений:', error);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.chosenInlineResult.inline_message_id,
        null,
        '❌ Ошибка при получении сообщений. Убедитесь, что бот является администратором чата.'
      );
    }
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