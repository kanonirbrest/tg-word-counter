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

// Функция для применения аудиофильтра через FFmpeg
async function applyAudioFilter(inputFile, filterType) {
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
                ffmpegCommand += '-af "acrusher=level_in=8:level_out=18:bits=8:mode=log:aa=1" ';
                break;
            case 'volume':
                ffmpegCommand += '-af "volume=0.1" ';
                break;
            case 'echo':
                ffmpegCommand += '-af "aecho=0.8:0.8:1000:0.5" ';
                break;
            case 'autotune':
                ffmpegCommand += '-af "asetrate=44100*0.7,aresample=44100" ';
                break;
            case 'robot':
                ffmpegCommand += '-af "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75" ';
                break;
            case 'high_pitch':
                // Эффект тонкого голоса - делаем голос выше и тоньше
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
        
        return processedFile;
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

// Добавляем обработчик ошибок
bot.catch((err, ctx) => {
    console.error('⚠️ Ошибка в боте:', err);
    console.error('Контекст ошибки:', ctx);
});

// Обработка всех входящих сообщений
bot.on('message', async (ctx) => {
    console.log('\n');
    console.log('****************************************');
    console.log('************ НОВОЕ СООБЩЕНИЕ ***********');
    console.log('****************************************');
    console.log('Время получения:', new Date().toISOString());
    console.log('Тип сообщения:', ctx.message ? Object.keys(ctx.message).filter(key => key !== 'from' && key !== 'chat' && key !== 'date') : 'неизвестно');
    console.log('От пользователя:', ctx.from.id);
    console.log('В чате:', ctx.chat.id);
    console.log('Тип чата:', ctx.chat.type);
    console.log('Контекст чата:', ctx.chat.type === 'private' ? 'личные сообщения' : 'групповой чат');
    
    // Выводим полное содержимое сообщения для отладки
    console.log('Полное содержимое сообщения:', JSON.stringify(ctx.message, null, 2));
    
    // Проверяем наличие голосового сообщения
    if (ctx.message && ctx.message.voice) {
        console.log('\n!!! ОБНАРУЖЕНО ГОЛОСОВОЕ СООБЩЕНИЕ !!!');
        console.log('----------------------------------------');
        console.log('Длина сообщения:', ctx.message.voice.duration, 'секунд');
        console.log('File ID:', ctx.message.voice.file_id);
        console.log('MIME тип:', ctx.message.voice.mime_type);
        console.log('Полные данные голосового сообщения:', JSON.stringify(ctx.message.voice, null, 2));
        
        try {
            // Получаем информацию о сессии
            console.log('\n=== Проверка сессии ===');
            const session = getSession(ctx.from.id);
            console.log('Текущая сессия:', session);
            
            if (!session || !session.filterType) {
                console.log('❌ Нет активной сессии или типа фильтра');
                await ctx.reply('Пожалуйста, сначала выберите эффект через @имя_бота');
                return;
            }
            
            // Скачиваем голосовое сообщение
            console.log('\n=== Начало обработки голосового сообщения ===');
            console.log('Получаю информацию о файле...');
            
            // Получаем информацию о файле
            const file = await ctx.telegram.getFile(ctx.message.voice.file_id);
            console.log('Информация о файле:', JSON.stringify(file, null, 2));
            
            const filePath = file.file_path;
            const fileName = path.join(tempDir, `${ctx.message.voice.file_id}.ogg`);
            
            console.log('Путь к файлу:', filePath);
            console.log('Сохраняю в:', fileName);
            
            // Скачиваем файл
            console.log('Скачиваю файл...');
            const response = await axios({
                method: 'GET',
                url: `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`,
                responseType: 'stream'
            });
            
            console.log('Файл успешно скачан, размер:', response.headers['content-length'], 'байт');
            
            const writer = fs.createWriteStream(fileName);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log('✅ Файл успешно сохранен на диск');
                    const stats = fs.statSync(fileName);
                    console.log('Размер сохраненного файла:', stats.size, 'байт');
                    resolve();
                });
                writer.on('error', (err) => {
                    console.error('❌ Ошибка при сохранении файла:', err);
                    reject(err);
                });
            });
            
            // Применяем фильтр
            console.log('\n=== Применение фильтра ===');
            console.log('Тип фильтра:', session.filterType);
            console.log('Начинаю обработку файла...');
            const processedFile = await applyAudioFilter(fileName, session.filterType);
            console.log('✅ Файл обработан:', processedFile);
            
            // Отправляем обработанное сообщение
            console.log('\n=== Отправка обработанного сообщения ===');
            console.log('Отправляю обработанное голосовое сообщение...');
            
            // Определяем, куда отправлять сообщение
            const targetChatId = session.chatId || ctx.from.id;
            console.log('Отправка в чат:', targetChatId);
            console.log('Тип чата:', ctx.chat.type);
            
            await ctx.telegram.sendVoice(targetChatId, { source: processedFile });
            console.log('✅ Сообщение отправлено в чат:', targetChatId);
            
            // Очищаем временные файлы
            console.log('\n=== Очистка временных файлов ===');
            console.log('Удаляю временные файлы...');
            fs.unlinkSync(fileName);
            fs.unlinkSync(processedFile);
            console.log('✅ Временные файлы удалены');
            
        } catch (error) {
            console.error('\n❌❌❌ ОШИБКА ПРИ ОБРАБОТКЕ ГОЛОСОВОГО СООБЩЕНИЯ ❌❌❌');
            console.error('Описание ошибки:', error.message);
            console.error('Стек ошибки:', error.stack);
            try {
                await ctx.reply('Произошла ошибка при обработке голосового сообщения');
                console.log('✅ Сообщение об ошибке отправлено');
            } catch (error) {
                console.error('❌ Ошибка при отправке сообщения об ошибке:', error);
            }
        }
    } else {
        console.log('Сообщение не содержит голосового сообщения');
        console.log('Типы сообщения:', Object.keys(ctx.message || {}));
    }
    
    console.log('\n****************************************');
    console.log('********** КОНЕЦ ОБРАБОТКИ *************');
    console.log('****************************************\n');
});

// Обработка inline запросов
bot.on('inline_query', async (ctx) => {
    console.log('\n=== INLINE QUERY START ===');
    console.log('Получен inline запрос от пользователя:', ctx.from.id);
    console.log('Данные запроса:', JSON.stringify(ctx.inlineQuery, null, 2));
    
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
    
    console.log('Подготовлено результатов:', results.length);
    console.log('Отправляю результаты inline запроса...');
    try {
        await ctx.answerInlineQuery(results, {
            cache_time: 0,
            is_personal: true
        });
        console.log('✅ Результаты успешно отправлены');
    } catch (error) {
        console.error('❌ Ошибка при отправке результатов:', error);
        console.error('Стек ошибки:', error.stack);
    }
    console.log('=== INLINE QUERY END ===\n');
});

// Обработка callback запросов
bot.on('callback_query', async (ctx) => {
    console.log('\n=== Начало обработки callback запроса ===');
    console.log('Callback данные:', JSON.stringify(ctx.callbackQuery, null, 2));
    console.log('От пользователя ID:', ctx.from.id);
    console.log('Имя пользователя:', ctx.from.username);
    
    try {
        const data = ctx.callbackQuery.data;
        console.log('Получен callback запрос:', data);
        
        if (data.startsWith('record_')) {
            const filterType = data.replace('record_', '');
            console.log('Устанавливаю тип фильтра в сессию:', filterType);
            
            // Сохраняем тип фильтра в сессии
            const session = getSession(ctx.from.id);
            console.log('Текущая сессия до изменения:', session);
            session.filterType = filterType;
            
            // Определяем тип чата и сохраняем соответствующий chatId
            if (ctx.callbackQuery.chat_type === 'private') {
                // В личной переписке используем ID пользователя
                session.chatId = ctx.from.id;
                console.log('Это личная переписка, сохраняю chatId:', session.chatId);
            } else if (ctx.chat) {
                // В групповом чате используем ID чата
                session.chatId = ctx.chat.id;
                console.log('Это групповой чат, сохраняю chatId:', session.chatId);
            } else {
                // В inline режиме используем ID пользователя
                session.chatId = ctx.from.id;
                console.log('Это inline режим, сохраняю chatId:', session.chatId);
            }
            
            saveSession(ctx.from.id, session);
            console.log('Сессия после установки:', session);
            
            // Отвечаем на callback запрос
            console.log('Отправляю ответ на callback запрос...');
            await ctx.answerCbQuery(`Готов к обработке голосового сообщения с эффектом: ${filterType}`);
            console.log('✅ Ответ на callback запрос отправлен');
            
            // Проверяем, является ли это inline запросом
            const isInlineQuery = ctx.callbackQuery.inline_message_id !== undefined;
            console.log('Это inline запрос:', isInlineQuery);
            
            if (isInlineQuery) {
                // Обновляем сообщение в inline режиме
                console.log('Обновляю сообщение в inline режиме...');
                try {
                    await ctx.editMessageText('🎤 Выбран эффект: ' + filterType + '\n\nОтправьте голосовое сообщение для обработки');
                    console.log('✅ Сообщение успешно обновлено');
                    
                    // Отправляем сообщение пользователю в личные сообщения только если это не личная переписка
                    if (ctx.callbackQuery.chat_type !== 'private') {
                        console.log('Отправляю сообщение пользователю в личные сообщения...');
                        try {
                            await ctx.telegram.sendMessage(ctx.from.id, '🎤 Выбран эффект: ' + filterType + '\n\nОтправьте голосовое сообщение для обработки');
                            console.log('✅ Сообщение отправлено в личные сообщения');
                        } catch (error) {
                            console.error('❌ Ошибка при отправке сообщения в личные сообщения:', error);
                            console.error('Стек ошибки:', error.stack);
                        }
                    }
                } catch (error) {
                    console.error('❌ Ошибка при обновлении сообщения:', error);
                    console.error('Стек ошибки:', error.stack);
                }
            }
        }
    } catch (error) {
        console.error('❌ Ошибка при обработке callback запроса:', error);
        console.error('Стек ошибки:', error.stack);
        try {
            await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
            console.log('✅ Ответ об ошибке отправлен');
        } catch (error) {
            console.error('❌ Ошибка при отправке ответа об ошибке:', error);
        }
    }
    console.log('=== КОНЕЦ ОБРАБОТКИ CALLBACK ЗАПРОСА ===\n');
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