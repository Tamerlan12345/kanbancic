-- =================================================================
-- !! ВНИМАНИЕ: СКРИПТ ДЛЯ ПОЛНОЙ ОЧИСТКИ СХЕМЫ "QUANTUM" !!
-- Выполнение этого скрипта приведет к безвозвратному удалению
-- всех таблиц, связанных с "Quantum", и потере данных.
-- =================================================================

-- 1. Удаляем таблицы в порядке, обратном их созданию, чтобы избежать ошибок внешних ключей.
-- Сначала удаляем таблицы, которые ссылаются на другие.
DROP TABLE IF EXISTS public.task_dependencies;
DROP TABLE IF EXISTS public.task_history;
DROP TABLE IF EXISTS public.daily_snapshots;
DROP TABLE IF EXISTS public.team_members;
DROP TABLE IF EXISTS public.workspace_members;

-- Затем удаляем таблицы, на которые были ссылки.
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.issue_types;
DROP TABLE IF EXISTS public.projects;
DROP TABLE IF EXISTS public.teams;
DROP TABLE IF EXISTS public.workspaces;

-- 2. Удаляем колонку 'role' из таблицы 'profiles'.
-- Используем конструкцию `IF EXISTS`, чтобы избежать ошибки, если колонка уже удалена.
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS role;

-- 3. Удаляем пользовательские типы данных (ENUMs).
-- Их можно удалить только после того, как они перестанут использоваться во всех таблицах.
DROP TYPE IF EXISTS public.dependency_type;
DROP TYPE IF EXISTS public.task_priority;
DROP TYPE IF EXISTS public.task_status;
DROP TYPE IF EXISTS public.user_role;

-- Сообщение о завершении. В SQL-комментариях это просто для информации.
-- SELECT 'Скрипт очистки схемы Quantum успешно завершен.' as message;