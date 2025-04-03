const express = require('express');
const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Логирование всех переменных окружения
console.log('=== Environment Variables ===');
console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? 'Установлен' : 'Отсутствует');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Установлен' : 'Отсутствует');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Установлен' : 'Отсутствует');
console.log('=============================');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Настройка Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Проверка настроек Cloudinary
console.log('=== Cloudinary Configuration ===');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Установлен' : 'Отсутствует');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Установлен' : 'Отсутствует');
console.log('=============================');

// Настройка сессий
bot.use(session());

// Создаем временную директорию для аудиофайлов, если её нет
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Определение опций для inline запросов
const inlineQueryOptions = [
    {
        id: '1',
        title: 'Усилить бас',
        description: 'Наложить фильтр усиления баса на голосовое сообщение',
        messageText: '🎵 Выберите эффект для голосового сообщения',
        replyMarkup: {
            inline_keyboard: [[
                { text: '🎤 Записать голосовое', callback_data: 'record_bass' }
            ]]
        }
    },
    {
        id: '2',
        title: 'Усилить высокие частоты',
        description: 'Наложить фильтр усиления высоких частот на голосовое сообщение',
        messageText: '🎵 Выберите эффект для голосового сообщения',
        replyMarkup: {
            inline_keyboard: [[
                { text: '🎤 Записать голосовое', callback_data: 'record_treble' }
            ]]
        }
    },
    {
        id: '3',
        title: 'Добавить эхо',
        description: 'Наложить фильтр эхо на голосовое сообщение',
        messageText: '🎵 Выберите эффект для голосового сообщения',
        replyMarkup: {
            inline_keyboard: [[
                { text: '🎤 Записать голосовое', callback_data: 'record_echo' }
            ]]
        }
    },
    {
        id: '4',
        title: 'Добавить реверберацию',
        description: 'Наложить фильтр реверберации на голосовое сообщение',
        messageText: '🎵 Выберите эффект для голосового сообщения',
        replyMarkup: {
            inline_keyboard: [[
                { text: '🎤 Записать голосовое', callback_data: 'record_reverb' }
            ]]
        }
    },
    {
        id: '5',
        title: 'Ускорить воспроизведение',
        description: 'Ускорить воспроизведение голосового сообщения',
        messageText: '🎵 Выберите эффект для голосового сообщения',
        replyMarkup: {
            inline_keyboard: [[
                { text: '🎤 Записать голосовое', callback_data: 'record_speed' }
            ]]
        }
    },
    {
        id: '6',
        title: 'Усилить громкость',
        description: 'Усилить громкость голосового сообщения',
        messageText: '🎵 Выберите эффект для голосового сообщения',
        replyMarkup: {
            inline_keyboard: [[
                { text: '🎤 Записать голосовое', callback_data: 'record_volume' }
            ]]
        }
    },
    {
        id: '7',
        title: 'Грубый голос',
        description: 'Добавить эффект искажения голоса',
        messageText: '🎵 Выберите эффект для голосового сообщения',
        replyMarkup: {
            inline_keyboard: [[
                { text: '🎤 Записать голосовое', callback_data: 'record_distortion' }
            ]]
        }
    }
];

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
        console.log('=== Начало обработки аудио ===');
        console.log('Входной файл:', inputFile);
        console.log('Тип фильтра:', filterType);
        
        // Проверяем, что входной файл существует
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Входной файл не найден: ${inputFile}`);
        }
        
        // Проверяем размер входного файла
        const stats = fs.statSync(inputFile);
        console.log('Размер входного файла:', stats.size, 'байт');
        
        // Загружаем файл в Cloudinary
        console.log('Загружаю файл в Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(inputFile, {
            resource_type: 'video',
            format: 'ogg'
        });
        console.log('Файл загружен в Cloudinary:', uploadResult.public_id);
        
        // Применяем фильтр
        console.log('Применяю фильтр в Cloudinary...');
        const result = await cloudinary.video(uploadResult.public_id, {
            resource_type: 'video',
            format: 'ogg',
            audio_codec: 'libvorbis',
            audio_effects: filterType
        });
        console.log('Фильтр применен, URL результата:', result);
        
        // Скачиваем обработанный файл
        console.log('Скачиваю обработанный файл...');
        const response = await axios({
            method: 'GET',
            url: result,
            responseType: 'stream'
        });
        
        const outputFile = path.join(tempDir, `processed_${path.basename(inputFile)}`);
        console.log('Сохраняю в файл:', outputFile);
        
        const writer = fs.createWriteStream(outputFile);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('Файл успешно сохранен:', outputFile);
                // Проверяем размер выходного файла
                const outputStats = fs.statSync(outputFile);
                console.log('Размер выходного файла:', outputStats.size, 'байт');
                resolve(outputFile);
            });
            writer.on('error', (err) => {
                console.error('Ошибка при сохранении файла:', err);
                reject(err);
            });
        });
    } catch (error) {
        console.error('Ошибка при обработке аудио:', error);
        console.error('Стек ошибки:', error.stack);
        throw error;
    }
}

// Функции для работы с сессиями
function getSession(userId) {
    console.log('=== Получение сессии ===');
    console.log('ID пользователя:', userId);
    
    try {
        if (fs.existsSync('sessions.json')) {
            const sessions = JSON.parse(fs.readFileSync('sessions.json', 'utf8'));
            console.log('Найдена сессия:', sessions[userId] || { filterType: 'volume' });
            return sessions[userId] || { filterType: 'volume' };
        }
        console.log('Файл сессий не найден, возвращаю сессию по умолчанию');
        return { filterType: 'volume' };
    } catch (error) {
        console.error('Ошибка при чтении сессии:', error);
        console.error('Стек ошибки:', error.stack);
        return { filterType: 'volume' };
    }
}

function saveSession(userId, session) {
    console.log('=== Сохранение сессии ===');
    console.log('ID пользователя:', userId);
    console.log('Данные сессии:', session);
    
    try {
        let sessions = {};
        if (fs.existsSync('sessions.json')) {
            sessions = JSON.parse(fs.readFileSync('sessions.json', 'utf8'));
        }
        sessions[userId] = session;
        fs.writeFileSync('sessions.json', JSON.stringify(sessions, null, 2));
        console.log('Сессия успешно сохранена');
    } catch (error) {
        console.error('Ошибка при сохранении сессии:', error);
        console.error('Стек ошибки:', error.stack);
    }
}

// Обработка всех входящих сообщений
bot.on('message', async (ctx) => {
    console.log('\n=== НОВОЕ СООБЩЕНИЕ ===');
    console.log('Время получения:', new Date().toISOString());
    console.log('Тип сообщения:', ctx.message ? Object.keys(ctx.message).filter(key => key !== 'from' && key !== 'chat' && key !== 'date') : 'неизвестно');
    console.log('От пользователя:', ctx.from.id);
    console.log('В чате:', ctx.chat.id);
    console.log('Тип чата:', ctx.chat.type);
    
    // Проверяем наличие голосового сообщения
    if (ctx.message.voice) {
        console.log('!!! ОБНАРУЖЕНО ГОЛОСОВОЕ СООБЩЕНИЕ !!!');
        console.log('Длина сообщения:', ctx.message.voice.duration, 'секунд');
        console.log('File ID:', ctx.message.voice.file_id);
        console.log('MIME тип:', ctx.message.voice.mime_type);
        console.log('Полные данные голосового сообщения:', JSON.stringify(ctx.message.voice, null, 2));
    }
    
    console.log('Данные сообщения:', JSON.stringify(ctx.message, null, 2));
    console.log('========================\n');

    // Если это голосовое сообщение, обрабатываем его
    if (ctx.message.voice) {
        console.log('=== VOICE MESSAGE RECEIVED ===');
        console.log('Длина сообщения:', ctx.message.voice.duration, 'секунд');
        console.log('Полные данные голосового сообщения:', JSON.stringify(ctx.message.voice, null, 2));
        
        try {
            // Получаем информацию о сессии
            const session = getSession(ctx.from.id);
            console.log('Текущая сессия:', session);
            
            if (!session || !session.filterType) {
                console.log('Нет активной сессии или типа фильтра');
                await ctx.reply('Пожалуйста, сначала выберите эффект');
                return;
            }
            
            // Скачиваем голосовое сообщение
            console.log('Скачиваю голосовое сообщение...');
            const file = await ctx.telegram.getFile(ctx.message.voice.file_id);
            const filePath = file.file_path;
            const fileName = path.join(tempDir, `${ctx.message.voice.file_id}.ogg`);
            
            console.log('Путь к файлу:', filePath);
            console.log('Сохраняю в:', fileName);
            
            const response = await axios({
                method: 'GET',
                url: `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`,
                responseType: 'stream'
            });
            
            const writer = fs.createWriteStream(fileName);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            
            console.log('Файл успешно скачан');
            
            // Применяем фильтр
            console.log('Применяю фильтр:', session.filterType);
            const processedFile = await applyAudioFilter(fileName, session.filterType);
            console.log('Файл обработан:', processedFile);
            
            // Отправляем обработанное сообщение
            console.log('Отправляю обработанное сообщение...');
            await ctx.replyWithVoice({ source: processedFile });
            console.log('Сообщение отправлено');
            
            // Очищаем временные файлы
            console.log('Удаляю временные файлы...');
            fs.unlinkSync(fileName);
            fs.unlinkSync(processedFile);
            console.log('Временные файлы удалены');
            
        } catch (error) {
            console.error('Ошибка при обработке голосового сообщения:', error);
            console.error('Стек ошибки:', error.stack);
            await ctx.reply('Произошла ошибка при обработке голосового сообщения');
        }
    }
});

// Обработка inline запросов
bot.on('inline_query', async (ctx) => {
  console.log('=== INLINE QUERY START ===');
  console.log('Получен inline запрос:', ctx.inlineQuery.query);
  console.log('От пользователя:', ctx.from.id);
  
  try {
    const results = inlineQueryOptions.map(option => ({
      type: 'article',
      id: option.id,
      title: option.title,
      description: option.description,
      input_message_content: {
        message_text: option.messageText
      },
      reply_markup: option.replyMarkup
    }));

    console.log('Подготовлено результатов:', results.length);
    console.log('Отправляю результаты inline запроса');
    await ctx.answerInlineQuery(results);
    console.log('=== INLINE QUERY END ===');
  } catch (error) {
    console.error('Ошибка при обработке inline запроса:', error);
    console.error('Стек ошибки:', error.stack);
  }
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

// Обработка callback запросов
bot.on('callback_query', async (ctx) => {
    console.log('=== Начало обработки callback запроса ===');
    console.log('Callback данные:', JSON.stringify(ctx.callbackQuery, null, 2));
    
    try {
        const data = ctx.callbackQuery.data;
        console.log('Получен callback запрос:', data);
        
        if (data.startsWith('record_')) {
            const filterType = data.replace('record_', '');
            console.log('Устанавливаю тип фильтра в сессию:', filterType);
            
            // Сохраняем тип фильтра в сессии
            const session = getSession(ctx.from.id);
            session.filterType = filterType;
            saveSession(ctx.from.id, session);
            console.log('Сессия после установки:', session);
            
            // Отвечаем на callback запрос
            await ctx.answerCbQuery(`Выбран эффект: ${filterType}`);
            
            // Проверяем, является ли это inline запросом
            if (!ctx.callbackQuery.inline_message_id) {
                // Если это не inline запрос, отправляем сообщение
                await ctx.telegram.sendMessage(ctx.from.id, '🎤 Пожалуйста, отправьте голосовое сообщение для обработки');
            }
        }
    } catch (error) {
        console.error('Ошибка при обработке callback запроса:', error);
        console.error('Стек ошибки:', error.stack);
        await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    }
});

// Запуск бота
const startBot = async () => {
    try {
        // Проверяем, что все необходимые переменные окружения установлены
        if (!process.env.BOT_TOKEN) {
            throw new Error('BOT_TOKEN не установлен');
        }
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            throw new Error('CLOUDINARY_CLOUD_NAME не установлен');
        }
        if (!process.env.CLOUDINARY_API_KEY) {
            throw new Error('CLOUDINARY_API_KEY не установлен');
        }
        if (!process.env.CLOUDINARY_API_SECRET) {
            throw new Error('CLOUDINARY_API_SECRET не установлен');
        }

        console.log('Запускаю бота...');
        
        // Обработка сигналов завершения
        process.on('SIGTERM', async () => {
            console.log('Получен сигнал SIGTERM, завершаю работу...');
            await bot.stop('SIGTERM');
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            console.log('Получен сигнал SIGINT, завершаю работу...');
            await bot.stop('SIGINT');
            process.exit(0);
        });

        // Запуск бота с повторными попытками
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                await bot.launch();
                console.log('Бот успешно запущен');
                break;
            } catch (error) {
                retryCount++;
                if (error.description && error.description.includes('Conflict: terminated by other getUpdates request')) {
                    console.log(`Обнаружен конфликт с другим экземпляром бота. Попытка ${retryCount} из ${maxRetries}`);
                    if (retryCount < maxRetries) {
                        // Увеличиваем время ожидания с каждой попыткой
                        await new Promise(resolve => setTimeout(resolve, 5000 * retryCount));
                    } else {
                        console.log('Превышено максимальное количество попыток. Завершаю работу.');
                        process.exit(1);
                    }
                } else {
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка при запуске бота:', error);
        process.exit(1);
    }
};

// Запускаем бота
startBot(); 