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
    
    console.log('Файл загружен в Cloudinary, public_id:', uploadResult.public_id);
    console.log('Применяю фильтр:', filterType);
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
      case 'distortion':
        transformation = [
          { audio_codec: 'aac', audio_bitrate: '128k' },
          { audio_frequency: 44100 },
          { audio_effects: 'distortion' }
        ];
        break;
      default:
        transformation = [
          { audio_codec: 'aac', audio_bitrate: '128k' },
          { audio_frequency: 44100 },
          { audio_effects: 'volume_up' }
        ];
    }
    
    console.log('Трансформация:', JSON.stringify(transformation));
    const result = await cloudinary.utils.generate_transformation_string(transformation);
    console.log('Строка трансформации:', result);
    
    const processedUrl = cloudinary.url(uploadResult.public_id, {
      resource_type: 'video',
      format: 'ogg',
      transformation: result
    });
    console.log('URL обработанного файла:', processedUrl);
    
    console.log('Скачиваю результат');
    const response = await axios({
      method: 'GET',
      url: processedUrl,
      responseType: 'stream'
    });
    
    const outputFile = path.join(tempDir, `processed_${path.basename(inputFile)}`);
    console.log('Сохраняю в файл:', outputFile);
    const writer = fs.createWriteStream(outputFile);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Файл успешно сохранен');
        // Удаляем загруженный файл из Cloudinary
        cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: 'video' })
          .then(() => console.log('Файл удален из Cloudinary'))
          .catch(err => console.error('Ошибка при удалении файла из Cloudinary:', err));
        resolve(outputFile);
      });
      writer.on('error', (err) => {
        console.error('Ошибка при сохранении файла:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Ошибка при обработке аудио:', error);
    throw error;
  }
}

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
    
    // Проверяем, что файл существует и имеет размер
    const stats = fs.statSync(inputPath);
    console.log('Размер входного файла:', stats.size, 'байт');
    
    // Определяем тип фильтра из сессии
    let filterType = ctx.session?.filterType || 'volume';
    console.log('Тип фильтра из сессии:', filterType);
    
    // Проверяем наличие сессии
    if (!ctx.session) {
      console.log('Сессия не найдена, использую volume по умолчанию');
      ctx.session = { filterType: 'volume' };
    }
    
    console.log('Применяю фильтр:', filterType);
    // Применяем фильтр через Cloudinary
    const outputPath = await applyAudioFilter(inputPath, filterType);
    console.log('Фильтр применен, отправляю файл:', outputPath);
    
    // Проверяем, что выходной файл существует и имеет размер
    const outputStats = fs.statSync(outputPath);
    console.log('Размер выходного файла:', outputStats.size, 'байт');
    
    // Отправляем обработанное аудио
    console.log('Отправляю голосовое сообщение...');
    await ctx.replyWithVoice({ source: outputPath });
    console.log('Голосовое сообщение успешно отправлено');
    
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

// Обработка inline запросов
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  console.log('Получен inline запрос:', query);
  
  // Показываем доступные фильтры
  const results = [
    {
      type: 'article',
      id: '1',
      title: 'Усилить бас',
      description: 'Наложить фильтр усиления баса на голосовое сообщение',
      input_message_content: {
        message_text: '🎵 Выберите эффект для голосового сообщения',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', callback_data: 'record_bass' }
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
        message_text: '🎵 Выберите эффект для голосового сообщения',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', callback_data: 'record_treble' }
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
        message_text: '🎵 Выберите эффект для голосового сообщения',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', callback_data: 'record_echo' }
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
        message_text: '🎵 Выберите эффект для голосового сообщения',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', callback_data: 'record_reverb' }
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
        message_text: '🎵 Выберите эффект для голосового сообщения',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', callback_data: 'record_speed' }
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
        message_text: '🎵 Выберите эффект для голосового сообщения',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', callback_data: 'record_volume' }
          ]]
        }
      }
    },
    {
      type: 'article',
      id: '7',
      title: 'Грубый голос',
      description: 'Добавить эффект искажения голоса',
      input_message_content: {
        message_text: '🎵 Выберите эффект для голосового сообщения',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎤 Записать голосовое', callback_data: 'record_distortion' }
          ]]
        }
      }
    }
  ];
  
  console.log('Отправляю результаты inline запроса');
  await ctx.answerInlineQuery(results);
});

// Обработка команды /start
bot.command('start', async (ctx) => {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🎵 Усилить бас', callback_data: 'record_bass' },
        { text: '🎵 Усилить высокие частоты', callback_data: 'record_treble' }
      ],
      [
        { text: '🎵 Добавить эхо', callback_data: 'record_echo' },
        { text: '🎵 Добавить реверберацию', callback_data: 'record_reverb' }
      ],
      [
        { text: '🎵 Ускорить воспроизведение', callback_data: 'record_speed' },
        { text: '🎵 Усилить громкость', callback_data: 'record_volume' }
      ],
      [
        { text: '🎵 Грубый голос', callback_data: 'record_distortion' }
      ]
    ]
  };
  
  await ctx.reply(
    'Привет! Я бот для обработки голосовых сообщений. Используйте меня:\n\n' +
    '1. В любом чате напишите @имя_бота\n' +
    '2. Выберите тип фильтра\n' +
    '3. Отправьте голосовое сообщение\n\n' +
    'Или выберите эффект ниже:',
    { reply_markup: keyboard }
  );
});

// Обработка команды /help
bot.command('help', async (ctx) => {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🎵 Усилить бас', callback_data: 'record_bass' },
        { text: '🎵 Усилить высокие частоты', callback_data: 'record_treble' }
      ],
      [
        { text: '🎵 Добавить эхо', callback_data: 'record_echo' },
        { text: '🎵 Добавить реверберацию', callback_data: 'record_reverb' }
      ],
      [
        { text: '🎵 Ускорить воспроизведение', callback_data: 'record_speed' },
        { text: '🎵 Усилить громкость', callback_data: 'record_volume' }
      ],
      [
        { text: '🎵 Грубый голос', callback_data: 'record_distortion' }
      ]
    ]
  };
  
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
    '   - Добавить эффект искажения\n' +
    '3. Отправьте голосовое сообщение\n\n' +
    'Или выберите эффект ниже:',
    { reply_markup: keyboard }
  );
});

// Обработка callback запросов от inline кнопок
bot.on('callback_query', async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  console.log('Получен callback запрос:', callbackData);
  
  if (callbackData.startsWith('record_')) {
    const filterType = callbackData.replace('record_', '');
    console.log('Устанавливаю тип фильтра в сессию:', filterType);
    ctx.session = { filterType };
    console.log('Сессия после установки:', ctx.session);
    
    // Отвечаем на callback запрос
    await ctx.answerCbQuery('Теперь отправьте голосовое сообщение');
    
    // Отправляем сообщение с инструкцией
    let effectName = '';
    switch (filterType) {
      case 'bass': effectName = 'усиления баса'; break;
      case 'treble': effectName = 'усиления высоких частот'; break;
      case 'echo': effectName = 'добавления эхо'; break;
      case 'reverb': effectName = 'добавления реверберации'; break;
      case 'speed': effectName = 'ускорения воспроизведения'; break;
      case 'volume': effectName = 'усиления громкости'; break;
      case 'distortion': effectName = 'добавления эффекта искажения'; break;
      default: effectName = filterType;
    }
    
    await ctx.reply(`🎵 Отправьте голосовое сообщение для ${effectName}`);
  }
});

// Запуск бота
bot.launch();

// Включаем graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 