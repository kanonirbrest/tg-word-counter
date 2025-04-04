const express = require('express');
const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Функция для логирования
function log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    if (data) {
        console.log('Данные:', JSON.stringify(data, null, 2));
    }
    
    // Сохраняем логи в файл
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }
    
    const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logMessage + '\n');
    if (data) {
        fs.appendFileSync(logFile, 'Данные: ' + JSON.stringify(data, null, 2) + '\n');
    }
}

// Логирование всех переменных окружения
log('=== Environment Variables ===');
log('BOT_TOKEN:', process.env.BOT_TOKEN ? 'Установлен' : 'Отсутствует');
log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Установлен' : 'Отсутствует');
log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Установлен' : 'Отсутствует');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Настройка Cloudinary
log('Настройка Cloudinary...');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Проверка настроек Cloudinary
log('=== Cloudinary Configuration ===');
log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Установлен' : 'Отсутствует');
log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Установлен' : 'Отсутствует');

// Настройка сессий
log('Настройка сессий...');
bot.use(session());

// Создаем временную директорию для аудиофайлов, если её нет
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    log('Создание временной директории...');
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
    },
    {
        id: '8',
        title: 'Автотюн',
        description: 'Добавить эффект автотюна к голосу',
        messageText: '🎤 Выберите эффект для голосового сообщения',
        replyMarkup: {
            inline_keyboard: [[
                { text: '🎤 Записать голосовое', callback_data: 'record_autotune' }
            ]]
        }
    }
];

// Функция для скачивания файла
async function downloadFile(fileId, fileName) {
    log('Начало скачивания файла', { fileId, fileName });
    try {
        const file = await bot.telegram.getFile(fileId);
        log('Получена информация о файле', file);
        
        const filePath = file.file_path;
        const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
        
        log('Скачивание файла по URL', { url });
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });
        
        const writer = fs.createWriteStream(fileName);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                log('Файл успешно скачан', { fileName, size: fs.statSync(fileName).size });
                resolve();
            });
            writer.on('error', (err) => {
                log('Ошибка при скачивании файла', { error: err.message });
                reject(err);
            });
        });
    } catch (error) {
        log('Ошибка при скачивании файла', { error: error.message, stack: error.stack });
        throw error;
    }
}

// Функция для применения аудиофильтра через FFmpeg
async function applyAudioFilter(inputFile, filterType) {
    log('Начало применения аудиофильтра', { inputFile, filterType });
    try {
        console.log('\n=== Начало обработки аудио ===');
        console.log('Входной файл:', inputFile);
        console.log('Тип фильтра:', filterType);
        
        // Проверяем, что входной файл существует
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Входной файл не найден: ${inputFile}`);
        }
        
        // Проверяем размер входного файла
        const stats = fs.statSync(inputFile);
        console.log('Размер входного файла:', stats.size, 'байт');
        
        // Создаем временный файл для обработанного аудио
        const processedFile = path.join(tempDir, `processed_${path.basename(inputFile)}`);
        
        // Применяем эффекты через FFmpeg
        let ffmpegCommand = 'ffmpeg -i ' + inputFile + ' ';
        
        switch(filterType) {
            case 'distortion':
                log('Применение эффекта искажения');
                ffmpegCommand += '-af "acrusher=level_in=8:level_out=18:bits=8:mode=log:aa=1" ';
                break;
            case 'volume':
                ffmpegCommand += '-af "volume=0.1" ';
                break;
            case 'echo':
                ffmpegCommand += '-af "aecho=0.8:0.8:1000:0.5" ';
                break;
            case 'autotune':
                log('Применение эффекта автотюна');
                ffmpegCommand += '-c:a libopus -b:a 48k -af "asetrate=48000*0.7,aresample=48000,volume=1.5" ';
                break;
            case 'robot':
                log('Применение эффекта робота');
                ffmpegCommand += '-af "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75" ';
                break;
            case 'high_pitch':
                log('Применение эффекта тонкого голоса');
                ffmpegCommand += '-af "asetrate=44100*1.5,aresample=44100" ';
                break;
            default:
                ffmpegCommand += '-af "volume=1.0" ';
        }
        
        ffmpegCommand += processedFile;
        
        console.log('Выполняю команду FFmpeg:', ffmpegCommand);
        
        // Запускаем FFmpeg
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
            exec(ffmpegCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('Ошибка FFmpeg:', error);
                    reject(error);
                    return;
                }
                console.log('FFmpeg stdout:', stdout);
                console.log('FFmpeg stderr:', stderr);
                resolve();
            });
        });
        
        // Проверяем, что файл создан
        if (!fs.existsSync(processedFile)) {
            throw new Error('Обработанный файл не создан');
        }
        
        const processedStats = fs.statSync(processedFile);
        console.log('Размер обработанного файла:', processedStats.size, 'байт');
        
        log('Аудиофильтр применен успешно', { processedFile });
        return processedFile;
    } catch (error) {
        console.error('Ошибка при обработке аудио:', error);
        console.error('Стек ошибки:', error.stack);
        throw error;
    }
}

// Функции для работы с сессиями
function getSession(userId) {
    log('Получение сессии', { userId });
    console.log('=== Получение сессии ===');
    console.log('ID пользователя:', userId);
    
    try {
        if (fs.existsSync('sessions.json')) {
            const sessions = JSON.parse(fs.readFileSync('sessions.json', 'utf8'));
            const session = sessions[userId] || { filterType: 'volume' };
            console.log('Найдена сессия:', session);
            log('Найдена сессия', session);
            return session;
        }
        console.log('Файл сессий не найден, возвращаю сессию по умолчанию');
        log('Файл сессий не найден, возвращаю сессию по умолчанию');
        return { filterType: 'volume' };
    } catch (error) {
        console.error('Ошибка при чтении сессии:', error);
        console.error('Стек ошибки:', error.stack);
        log('Ошибка при чтении сессии', { error: error.message, stack: error.stack });
        return { filterType: 'volume' };
    }
}

function saveSession(userId, session) {
    log('Сохранение сессии', { 
        userId, 
        session,
        chatId: session.chatId,
        chatType: session.chatType
    });
    
    console.log('=== Сохранение сессии ===');
    console.log('ID пользователя:', userId);
    console.log('Данные сессии:', session);
    console.log('chatId:', session.chatId);
    console.log('chatType:', session.chatType);
    
    try {
        let sessions = {};
        if (fs.existsSync('sessions.json')) {
            sessions = JSON.parse(fs.readFileSync('sessions.json', 'utf8'));
        }
        sessions[userId] = session;
        fs.writeFileSync('sessions.json', JSON.stringify(sessions, null, 2));
        console.log('Сессия успешно сохранена');
        log('Сессия успешно сохранена', { 
            savedSession: sessions[userId],
            chatId: sessions[userId].chatId
        });
    } catch (error) {
        console.error('Ошибка при сохранении сессии:', error);
        console.error('Стек ошибки:', error.stack);
        log('Ошибка при сохранении сессии', { error: error.message, stack: error.stack });
    }
}

// Добавляем обработчик ошибок
bot.catch((err, ctx) => {
    console.error('⚠️ Ошибка в боте:', err);
    console.error('Контекст ошибки:', ctx);
});

// Обработка всех входящих сообщений
bot.on('message', async (ctx) => {
    log('Получено новое сообщение', {
        userId: ctx.from.id,
        chatId: ctx.chat.id,
        chatType: ctx.chat.type,
        messageType: ctx.message ? Object.keys(ctx.message).filter(key => key !== 'from' && key !== 'chat' && key !== 'date') : 'неизвестно',
        message: ctx.message
    });
    
    if (ctx.message && ctx.message.voice) {
        log('=== Начало обработки голосового сообщения ===', {
            userId: ctx.from.id,
            chatId: ctx.chat.id,
            chatType: ctx.chat.type,
            messageId: ctx.message.message_id,
            fileId: ctx.message.voice.file_id,
            duration: ctx.message.voice.duration
        });
        
        try {
            const session = getSession(ctx.from.id);
            log('Проверка сессии', { 
                session,
                chatId: session?.chatId,
                filterType: session?.filterType,
                chatType: session?.chatType
            });
            
            if (!session?.filterType) {
                log('ОШИБКА: Тип фильтра не установлен в сессии');
                await ctx.reply('Пожалуйста, сначала выберите эффект через inline режим.');
                return;
            }
            
            // Скачиваем файл
            log('Начало скачивания файла', {
                fileId: ctx.message.voice.file_id
            });
            
            const file = await ctx.telegram.getFile(ctx.message.voice.file_id);
            const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
            
            log('Получена информация о файле', {
                fileUrl,
                filePath: file.file_path
            });
            
            const inputPath = await downloadFile(fileUrl);
            log('Файл успешно скачан', { inputPath });
            
            // Применяем эффект
            log('Начало применения эффекта', { 
                filterType: session.filterType,
                inputPath
            });
            
            const outputPath = await applyAudioFilter(inputPath, session.filterType);
            log('Эффект успешно применен', { 
                outputPath,
                filterType: session.filterType
            });
            
            // Загружаем на Cloudinary
            log('Начало загрузки на Cloudinary', { outputPath });
            
            const result = await cloudinary.uploader.upload(outputPath, {
                resource_type: 'video',
                folder: 'audio_effects'
            });
            
            log('Файл успешно загружен на Cloudinary', { 
                url: result.secure_url
            });
            
            // Отправляем обработанное аудио
            log('Отправка обработанного аудио', {
                chatId: ctx.chat.id,
                chatType: ctx.chat.type,
                url: result.secure_url
            });
            
            await ctx.replyWithVoice(result.secure_url);
            log('Обработанное аудио успешно отправлено');
            
            // Очищаем временные файлы
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
            log('Временные файлы удалены');
            
            log('=== Обработка голосового сообщения завершена успешно ===');
            
        } catch (error) {
            log('ОШИБКА при обработке голосового сообщения', { 
                error: error.message, 
                stack: error.stack,
                chatId: ctx.chat.id,
                chatType: ctx.chat.type
            });
            await ctx.reply('Произошла ошибка при обработке голосового сообщения. Пожалуйста, попробуйте еще раз.');
        }
    }
});

// Обработка inline запросов
bot.on('inline_query', async (ctx) => {
    log('Получен inline запрос', {
        userId: ctx.from.id,
        query: ctx.inlineQuery.query,
        chatType: ctx.inlineQuery.chat_type,
        chatInstance: ctx.inlineQuery.chat_instance,
        fullData: ctx.inlineQuery
    });
    
    const session = getSession(ctx.from.id);
    log('Текущая сессия до изменений', { 
        session,
        chatId: session.chatId
    });
    
    // Определяем chatId в зависимости от типа чата
    if (ctx.inlineQuery.chat_type === 'private') {
        session.chatId = ctx.from.id;
    } else {
        // Для каналов и групп используем chat_instance
        session.chatId = ctx.inlineQuery.chat_instance;
    }
    
    // Сохраняем тип чата для дальнейшего использования
    session.chatType = ctx.inlineQuery.chat_type;
    
    log('Определен chatId для сессии', {
        chatId: session.chatId,
        chatType: session.chatType,
        chatInstance: ctx.inlineQuery.chat_instance
    });
    
    saveSession(ctx.from.id, session);
    log('Сохранена сессия для inline запроса', {
        session,
        chatId: session.chatId,
        chatType: session.chatType
    });
    
    const results = [
        {
            type: 'article',
            id: 'distortion',
            title: 'Грубый голос',
            description: 'Сделать голос более грубым',
            input_message_content: {
                message_text: '🎤 Выбран эффект: Грубый голос\n\nОтправьте голосовое сообщение для обработки'
            },
            reply_markup: {
                inline_keyboard: [[{ 
                    text: '🎤 Отправить голосовое', 
                    callback_data: 'record_distortion'
                }]]
            }
        },
        {
            type: 'article',
            id: 'autotune',
            title: 'Автотюн',
            description: 'Добавить эффект автотюна к голосу',
            input_message_content: {
                message_text: '🎤 Выбран эффект: Автотюн\n\nОтправьте голосовое сообщение для обработки'
            },
            reply_markup: {
                inline_keyboard: [[{ 
                    text: '🎤 Отправить голосовое', 
                    callback_data: 'record_autotune'
                }]]
            }
        },
        {
            type: 'article',
            id: 'robot',
            title: '🤖 Робот',
            description: 'Сделать голос роботизированным',
            input_message_content: {
                message_text: '🎤 Выбран эффект: Робот\n\nОтправьте голосовое сообщение для обработки'
            },
            reply_markup: {
                inline_keyboard: [[{ 
                    text: '🎤 Отправить голосовое', 
                    callback_data: 'record_robot'
                }]]
            }
        },
        {
            type: 'article',
            id: 'high_pitch',
            title: '🎵 Тонкий голос',
            description: 'Сделать голос более тонким',
            input_message_content: {
                message_text: '🎤 Выбран эффект: Тонкий голос\n\nОтправьте голосовое сообщение для обработки'
            },
            reply_markup: {
                inline_keyboard: [[{ 
                    text: '🎤 Отправить голосовое', 
                    callback_data: 'record_high_pitch'
                }]]
            }
        }
    ];
    
    log('Отправка результатов inline запроса', { resultsCount: results.length });
    try {
        await ctx.answerInlineQuery(results, {
            cache_time: 0,
            is_personal: true
        });
        log('Результаты inline запроса успешно отправлены');
    } catch (error) {
        log('Ошибка при отправке результатов inline запроса', { error: error.message, stack: error.stack });
    }
});

// Обработка callback запросов
bot.on('callback_query', async (ctx) => {
    log('Получен callback запрос', {
        userId: ctx.from.id,
        data: ctx.callbackQuery.data,
        chatType: ctx.callbackQuery.chat_type,
        message: ctx.callbackQuery.message
    });
    
    try {
        const data = ctx.callbackQuery.data;
        
        if (data.startsWith('record_')) {
            const filterType = data.replace('record_', '');
            log('Установка типа фильтра', { filterType });
            
            const session = getSession(ctx.from.id);
            session.filterType = filterType;
            
            // Если chatId не установлен, устанавливаем его
            if (!session.chatId) {
                if (ctx.callbackQuery.message) {
                    // Если есть сообщение, берем chatId из него
                    session.chatId = ctx.callbackQuery.message.chat.id;
                } else {
                    // Если сообщения нет (inline режим), используем chat_instance
                    session.chatId = ctx.callbackQuery.chat_instance;
                }
            }
            
            log('Сохранение сессии с новым типом фильтра', {
                session,
                chatId: session.chatId,
                currentChatType: ctx.callbackQuery.chat_type
            });
            
            saveSession(ctx.from.id, session);
            
            await ctx.answerCbQuery(`Готов к обработке голосового сообщения с эффектом: ${filterType}`);
            log('Отправлен ответ на callback запрос');
            
            const isInlineQuery = ctx.callbackQuery.inline_message_id !== undefined;
            if (isInlineQuery) {
                log('Обновление сообщения в inline режиме');
                try {
                    await ctx.editMessageText('🎤 Выбран эффект: ' + filterType + '\n\nОтправьте голосовое сообщение для обработки');
                    log('Сообщение в inline режиме успешно обновлено');
                } catch (error) {
                    log('Ошибка при обновлении сообщения в inline режиме', { error: error.message, stack: error.stack });
                }
            }
        }
    } catch (error) {
        log('Ошибка при обработке callback запроса', { error: error.message, stack: error.stack });
        try {
            await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
            log('Отправлен ответ об ошибке');
        } catch (error) {
            log('Ошибка при отправке ответа об ошибке', { error: error.message, stack: error.stack });
        }
    }
});

// Запускаем бота
console.log('Запускаю бота...');
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
                // Указываем, какие типы обновлений мы хотим получать
                await bot.launch({
                    allowed_updates: ['message', 'callback_query', 'inline_query']
                });
                console.log('Бот успешно запущен');
                console.log('Получаем обновления: message, callback_query, inline_query');
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