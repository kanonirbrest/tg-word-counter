const express = require('express');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
require('dotenv').config();

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

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
        command = command.audioFilters('bass=g=5');
        break;
      case 'treble':
        command = command.audioFilters('treble=g=5');
        break;
      case 'echo':
        command = command.audioFilters('aecho=0.8:0.5:6:0.4');
        break;
      case 'reverb':
        command = command.audioFilters('areverse,aecho=0.8:0.5:6:0.4,areverse');
        break;
      case 'speed':
        command = command.audioFilters('atempo=1.5');
        break;
      default:
        command = command.audioFilters('volume=2');
    }
    
    command
      .output(outputFile)
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
        message_text: '🎵 Выберите голосовое сообщение и нажмите на кнопку "Усилить бас"'
      }
    },
    {
      type: 'article',
      id: '2',
      title: 'Усилить высокие частоты',
      description: 'Наложить фильтр усиления высоких частот на голосовое сообщение',
      input_message_content: {
        message_text: '🎵 Выберите голосовое сообщение и нажмите на кнопку "Усилить высокие частоты"'
      }
    },
    {
      type: 'article',
      id: '3',
      title: 'Добавить эхо',
      description: 'Наложить фильтр эхо на голосовое сообщение',
      input_message_content: {
        message_text: '🎵 Выберите голосовое сообщение и нажмите на кнопку "Добавить эхо"'
      }
    },
    {
      type: 'article',
      id: '4',
      title: 'Добавить реверберацию',
      description: 'Наложить фильтр реверберации на голосовое сообщение',
      input_message_content: {
        message_text: '🎵 Выберите голосовое сообщение и нажмите на кнопку "Добавить реверберацию"'
      }
    },
    {
      type: 'article',
      id: '5',
      title: 'Ускорить воспроизведение',
      description: 'Ускорить воспроизведение голосового сообщения',
      input_message_content: {
        message_text: '🎵 Выберите голосовое сообщение и нажмите на кнопку "Ускорить воспроизведение"'
      }
    },
    {
      type: 'article',
      id: '6',
      title: 'Усилить громкость',
      description: 'Усилить громкость голосового сообщения',
      input_message_content: {
        message_text: '🎵 Выберите голосовое сообщение и нажмите на кнопку "Усилить громкость"'
      }
    }
  ]);
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
    
    // Определяем тип фильтра из текста сообщения
    let filterType = 'volume'; // По умолчанию усиливаем громкость
    const text = ctx.message.text || '';
    
    if (text.includes('бас')) {
      filterType = 'bass';
    } else if (text.includes('высок')) {
      filterType = 'treble';
    } else if (text.includes('эхо')) {
      filterType = 'echo';
    } else if (text.includes('реверб')) {
      filterType = 'reverb';
    } else if (text.includes('ускор')) {
      filterType = 'speed';
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
  } catch (error) {
    console.error('Ошибка при обработке голосового сообщения:', error);
    await ctx.reply('❌ Произошла ошибка при обработке голосового сообщения. Пожалуйста, попробуйте еще раз.');
  }
});

// Обработка команды /start
bot.command('start', async (ctx) => {
  await ctx.reply(
    'Привет! Я бот для обработки голосовых сообщений. Используйте меня в любом чате:\n\n' +
    '1. Напишите @имя_бота\n' +
    '2. Выберите тип фильтра\n' +
    '3. Отправьте голосовое сообщение\n' +
    '4. Я обработаю его и отправлю обратно с выбранным фильтром'
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
    '3. Отправьте голосовое сообщение\n' +
    '4. Я обработаю его и отправлю обратно с выбранным фильтром'
  );
});

// Запуск бота
bot.launch();

// Включаем graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 