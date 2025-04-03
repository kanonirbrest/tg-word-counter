const express = require('express');
const { Telegraf, session } = require('telegraf');
const LocalSession = require('telegraf-session-local');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
require('dotenv').config();

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Настройка сессий
bot.use(session());
bot.use(new LocalSession({ database: 'sessions.json' }).middleware());

// Создаем временную директорию для аудиофайлов, если её нет
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Функция для скачивания файла
async function downloadFile(fileId, fileName) {
  try {
    const file = await bot.telegram.getFile(fileId);
    const filePath = file.file_path;
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(fileName);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Ошибка при скачивании файла:', error);
    throw error;
  }
}

// Функция для применения аудиофильтра
async function applyAudioFilter(inputFile, outputFile, filterType) {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputFile);
    
    // Выбираем фильтр в зависимости от типа
    switch (filterType) {
      case 'bass':
        command = command.audioFilters([
          'bass=g=20:f=110:w=0.3',
          'volume=1.5'
        ]);
        break;
      case 'treble':
        command = command.audioFilters([
          'treble=g=20:f=3000:w=0.3',
          'volume=1.5'
        ]);
        break;
      case 'echo':
        command = command.audioFilters([
          'aecho=0.8:0.99:10:0.8',
          'volume=1.5'
        ]);
        break;
      case 'reverb':
        command = command.audioFilters([
          'areverse',
          'aecho=0.8:0.99:10:0.8',
          'areverse',
          'volume=1.5'
        ]);
        break;
      case 'speed':
        command = command.audioFilters([
          'atempo=2.0',
          'volume=1.5'
        ]);
        break;
      default:
        command = command.audioFilters([
          'volume=3.0'
        ]);
    }
    
    command
      .output(outputFile)
      .audioCodec('libopus')
      .audioBitrate('128k')
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

// Обработка inline запросов
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  
  // Показываем доступные фильтры
  await ctx.answerInlineQuery([
    {
      type: 'article',
      id: '1',
      title: 'Усилить бас',
      description: 'Наложить фильтр усиления баса на голосовое сообщение',
      input_message_content: {
        message_text: '🎵 Нажмите на кнопку ниже, чтобы записать голосовое сообщение для усиления баса',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', switch_inline_query_current_chat: 'bass' }
          ]]
        }
      }
    },
    {
      type: 'article',
      id: '2',
      title: 'Усилить высокие частоты',
      description: 'Наложить фильтр усиления высоких частот на голосовое сообщение',
      input_message_content: {
        message_text: '🎵 Нажмите на кнопку ниже, чтобы записать голосовое сообщение для усиления высоких частот',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', switch_inline_query_current_chat: 'treble' }
          ]]
        }
      }
    },
    {
      type: 'article',
      id: '3',
      title: 'Добавить эхо',
      description: 'Наложить фильтр эхо на голосовое сообщение',
      input_message_content: {
        message_text: '🎵 Нажмите на кнопку ниже, чтобы записать голосовое сообщение для добавления эхо',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', switch_inline_query_current_chat: 'echo' }
          ]]
        }
      }
    },
    {
      type: 'article',
      id: '4',
      title: 'Добавить реверберацию',
      description: 'Наложить фильтр реверберации на голосовое сообщение',
      input_message_content: {
        message_text: '🎵 Нажмите на кнопку ниже, чтобы записать голосовое сообщение для добавления реверберации',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', switch_inline_query_current_chat: 'reverb' }
          ]]
        }
      }
    },
    {
      type: 'article',
      id: '5',
      title: 'Ускорить воспроизведение',
      description: 'Ускорить воспроизведение голосового сообщения',
      input_message_content: {
        message_text: '🎵 Нажмите на кнопку ниже, чтобы записать голосовое сообщение для ускорения воспроизведения',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', switch_inline_query_current_chat: 'speed' }
          ]]
        }
      }
    },
    {
      type: 'article',
      id: '6',
      title: 'Усилить громкость',
      description: 'Усилить громкость голосового сообщения',
      input_message_content: {
        message_text: '🎵 Нажмите на кнопку ниже, чтобы записать голосовое сообщение для усиления громкости',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', switch_inline_query_current_chat: 'volume' }
          ]]
        }
      }
    }
  ]);
});

// Обработка команд
bot.command('bass', async (ctx) => {
  await ctx.reply('🎵 Отправьте голосовое сообщение для усиления баса');
  ctx.session = { filterType: 'bass' };
});

bot.command('treble', async (ctx) => {
  await ctx.reply('🎵 Отправьте голосовое сообщение для усиления высоких частот');
  ctx.session = { filterType: 'treble' };
});

bot.command('echo', async (ctx) => {
  await ctx.reply('🎵 Отправьте голосовое сообщение для добавления эхо');
  ctx.session = { filterType: 'echo' };
});

bot.command('reverb', async (ctx) => {
  await ctx.reply('🎵 Отправьте голосовое сообщение для добавления реверберации');
  ctx.session = { filterType: 'reverb' };
});

bot.command('speed', async (ctx) => {
  await ctx.reply('🎵 Отправьте голосовое сообщение для ускорения воспроизведения');
  ctx.session = { filterType: 'speed' };
});

bot.command('volume', async (ctx) => {
  await ctx.reply('🎵 Отправьте голосовое сообщение для усиления громкости');
  ctx.session = { filterType: 'volume' };
});

// Обработка голосовых сообщений
bot.on('voice', async (ctx) => {
  try {
    const voice = ctx.message.voice;
    const fileId = voice.file_id;
    const fileName = `${Date.now()}_${fileId}.ogg`;
    const inputPath = path.join(tempDir, fileName);
    const outputPath = path.join(tempDir, `processed_${fileName}`);
    
    // Отправляем сообщение о начале обработки
    const processingMsg = await ctx.reply('🎵 Обрабатываю голосовое сообщение...');
    
    // Скачиваем голосовое сообщение
    await downloadFile(fileId, inputPath);
    
    // Определяем тип фильтра из сессии или текста сообщения
    let filterType = 'volume'; // По умолчанию усиливаем громкость
    
    if (ctx.session && ctx.session.filterType) {
      filterType = ctx.session.filterType;
    } else {
      const text = ctx.message.text || '';
      if (text.includes('bass')) {
        filterType = 'bass';
      } else if (text.includes('treble')) {
        filterType = 'treble';
      } else if (text.includes('echo')) {
        filterType = 'echo';
      } else if (text.includes('reverb')) {
        filterType = 'reverb';
      } else if (text.includes('speed')) {
        filterType = 'speed';
      }
    }
    
    // Применяем фильтр
    await applyAudioFilter(inputPath, outputPath, filterType);
    
    // Отправляем обработанное аудио
    await ctx.replyWithVoice({ source: outputPath });
    
    // Удаляем временные файлы
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    
    // Удаляем сообщение о обработке
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    
    // Очищаем сессию
    ctx.session = null;
  } catch (error) {
    console.error('Ошибка при обработке голосового сообщения:', error);
    await ctx.reply('❌ Произошла ошибка при обработке голосового сообщения. Пожалуйста, попробуйте еще раз.');
  }
});

// Обработка команды /start
bot.command('start', async (ctx) => {
  await ctx.reply(
    'Привет! Я бот для обработки голосовых сообщений. Используйте меня:\n\n' +
    '1. В любом чате напишите @имя_бота\n' +
    '2. Выберите тип фильтра\n' +
    '3. Отправьте голосовое сообщение\n\n' +
    'Или используйте команды:\n' +
    '/bass - усилить бас\n' +
    '/treble - усилить высокие частоты\n' +
    '/echo - добавить эхо\n' +
    '/reverb - добавить реверберацию\n' +
    '/speed - ускорить воспроизведение\n' +
    '/volume - усилить громкость'
  );
});

// Обработка команды /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    'Как использовать бота:\n\n' +
    '1. В любом чате напишите @имя_бота\n' +
    '2. Выберите тип фильтра:\n' +
    '   - Усилить бас\n' +
    '   - Усилить высокие частоты\n' +
    '   - Добавить эхо\n' +
    '   - Добавить реверберацию\n' +
    '   - Ускорить воспроизведение\n' +
    '   - Усилить громкость\n' +
    '3. Отправьте голосовое сообщение\n\n' +
    'Или используйте команды:\n' +
    '/bass - усилить бас\n' +
    '/treble - усилить высокие частоты\n' +
    '/echo - добавить эхо\n' +
    '/reverb - добавить реверберацию\n' +
    '/speed - ускорить воспроизведение\n' +
    '/volume - усилить громкость'
  );
});

// Запуск бота
bot.launch();

// Включаем graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 