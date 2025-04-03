const express = require('express');
const { Telegraf, session } = require('telegraf');
const LocalSession = require('telegraf-session-local');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Настройка Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

// Функция для применения аудиофильтра через Cloudinary
async function applyAudioFilter(inputFile, filterType) {
  try {
    console.log(`Загружаю файл в Cloudinary: ${inputFile}`);
    const uploadResult = await cloudinary.uploader.upload(inputFile, {
      resource_type: 'video',
      format: 'ogg'
    });
    
    console.log('Файл загружен, применяю фильтр:', filterType);
    let transformation = [];
    
    switch (filterType) {
      case 'bass':
        transformation = [
          { audio_codec: 'aac', audio_bitrate: '128k' },
          { audio_frequency: 44100 },
          { audio_effects: 'bass_boost' }
        ];
        break;
      case 'treble':
        transformation = [
          { audio_codec: 'aac', audio_bitrate: '128k' },
          { audio_frequency: 44100 },
          { audio_effects: 'treble_boost' }
        ];
        break;
      case 'echo':
        transformation = [
          { audio_codec: 'aac', audio_bitrate: '128k' },
          { audio_frequency: 44100 },
          { audio_effects: 'echo' }
        ];
        break;
      case 'reverb':
        transformation = [
          { audio_codec: 'aac', audio_bitrate: '128k' },
          { audio_frequency: 44100 },
          { audio_effects: 'reverb' }
        ];
        break;
      case 'speed':
        transformation = [
          { audio_codec: 'aac', audio_bitrate: '128k' },
          { audio_frequency: 44100 },
          { audio_effects: 'speed_up' }
        ];
        break;
      default:
        transformation = [
          { audio_codec: 'aac', audio_bitrate: '128k' },
          { audio_frequency: 44100 },
          { audio_effects: 'volume_up' }
        ];
    }
    
    const result = await cloudinary.utils.generate_transformation_string(transformation);
    const processedUrl = cloudinary.url(uploadResult.public_id, {
      resource_type: 'video',
      format: 'ogg',
      transformation: result
    });
    
    console.log('Фильтр применен, скачиваю результат');
    const response = await axios({
      method: 'GET',
      url: processedUrl,
      responseType: 'stream'
    });
    
    const outputFile = path.join(tempDir, `processed_${path.basename(inputFile)}`);
    const writer = fs.createWriteStream(outputFile);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        // Удаляем загруженный файл из Cloudinary
        cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: 'video' });
        resolve(outputFile);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Ошибка при обработке аудио:', error);
    throw error;
  }
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
    console.log('Получено голосовое сообщение');
    const voice = ctx.message.voice;
    const fileId = voice.file_id;
    const fileName = `${Date.now()}_${fileId}.ogg`;
    const inputPath = path.join(tempDir, fileName);
    
    console.log('Скачиваю файл:', fileId);
    // Отправляем сообщение о начале обработки
    const processingMsg = await ctx.reply('🎵 Обрабатываю голосовое сообщение...');
    
    // Скачиваем голосовое сообщение
    await downloadFile(fileId, inputPath);
    console.log('Файл скачан:', inputPath);
    
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
    
    console.log('Применяю фильтр:', filterType);
    // Применяем фильтр через Cloudinary
    const outputPath = await applyAudioFilter(inputPath, filterType);
    console.log('Фильтр применен, отправляю файл:', outputPath);
    
    // Отправляем обработанное аудио
    await ctx.replyWithVoice({ source: outputPath });
    console.log('Файл отправлен');
    
    // Удаляем временные файлы
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    console.log('Временные файлы удалены');
    
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