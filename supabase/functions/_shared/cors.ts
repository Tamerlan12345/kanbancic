export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Для разработки, в продакшене лучше указать ваш домен
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Явно указываем разрешенные методы
};