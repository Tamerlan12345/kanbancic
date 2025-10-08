// src/composables/useLogger.js
import { supabase } from '../services/supabaseService';

// Уровни логирования
const LOG_LEVELS = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

// Уровень по умолчанию (можно вынести в .env)
const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

/**
 * Отправляет лог в Supabase
 * @param {string} level - Уровень лога ('INFO', 'WARN', 'ERROR').
 * @param {string} message - Сообщение лога.
 * @param {object} metadata - Дополнительные данные (например, ошибка, компонент).
 */
async function sendLogToServer(level, message, metadata = {}) {
  if (!supabase) {
    console.log(`[OFFLINE LOG] ${level}: ${message}`, metadata);
    return;
  }

  try {
    const browserMetadata = {};
    // Check if running in a browser environment before accessing window/navigator
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      browserMetadata.currentUrl = window.location.href;
      browserMetadata.userAgent = navigator.userAgent;
    }

    const { error } = await supabase.from('logs').insert([
      {
        level,
        message,
        metadata: { ...metadata, ...browserMetadata },
      },
    ]);

    if (error) {
      console.error('Failed to send log to server:', error);
    }
  } catch (e) {
    console.error('Catastrophic failure in logging service:', e);
  }
}

// Экспортируем функции логгера
export function useLogger() {
  const log = (level, message, metadata) => {
    // Логируем в консоль в любом случае
    switch (level) {
      case 'ERROR':
        console.error(message, metadata);
        break;
      case 'WARN':
        console.warn(message, metadata);
        break;
      default:
        console.log(message, metadata);
    }

    // Отправляем на сервер, если уровень лога достаточный
    if (LOG_LEVELS[level.toUpperCase()] >= CURRENT_LOG_LEVEL) {
      sendLogToServer(level, message, metadata);
    }
  };

  return {
    info: (message, metadata) => log('INFO', message, metadata),
    warn: (message, metadata) => log('WARN', message, metadata),
    error: (message, error) => {
        const metadata = {
            errorMessage: error.message,
            stack: error.stack,
        };
        log('ERROR', message, metadata);
    },
  };
}