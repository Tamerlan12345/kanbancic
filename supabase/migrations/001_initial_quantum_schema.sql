-- Создание пользовательского типа для ролей в системе
CREATE TYPE user_role AS ENUM ('Owner', 'Admin', 'Project Manager', 'Team Lead', 'Member', 'Observer');

-- Создание пользовательского типа для статусов задач
CREATE TYPE task_status AS ENUM ('Backlog', 'To Do', 'In Progress', 'Done', 'Archived');

-- Создание пользовательского типа для приоритетов задач
CREATE TYPE task_priority AS ENUM ('Highest', 'High', 'Medium', 'Low', 'Lowest');

-- Создание пользовательского типа для зависимостей задач
CREATE TYPE dependency_type AS ENUM ('blocks', 'is_blocked_by', 'relates_to');

-- 1. Таблица Организаций (Workspaces)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица Команд (Teams)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица Проектов (Projects)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Расширение таблицы profiles для ролевой модели
-- Примечание: Предполагается, что таблица `profiles` существует.
-- Обычно она создается автоматически при настройке Supabase Auth и связана с `auth.users` через триггер.
ALTER TABLE profiles
ADD COLUMN role user_role DEFAULT 'Member';

-- 4. Таблица-связка для участников организаций (многие-ко-многим)
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

-- 5. Таблица-связка для участников команд (многие-ко-многим)
CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

-- 6. Таблица Типов Задач (Issue Types)
CREATE TABLE issue_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#808080', -- e.g., '#FF5733'
    icon VARCHAR(100), -- e.g., 'bug_report'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Таблица Задач (Tasks) с поддержкой иерархии
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    issue_type_id UUID NOT NULL REFERENCES issue_types(id),
    parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Для иерархии
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'To Do',
    priority task_priority NOT NULL DEFAULT 'Medium',
    assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Таблица Зависимостей Задач (Task Dependencies)
CREATE TABLE task_dependencies (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type dependency_type NOT NULL,
    PRIMARY KEY (task_id, depends_on_task_id)
);

-- 9. Таблица Истории Задач (Task History) для аудита и AI
CREATE TABLE task_history (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    changed_field VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 10. Таблица Ежедневных Срезов (Daily Snapshots) для предиктивной аналитики
CREATE TABLE daily_snapshots (
    id BIGSERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    snapshot_data JSONB NOT NULL, -- { "todo": 10, "in_progress": 5, "done": 20 }
    UNIQUE (project_id, snapshot_date)
);

-- Добавляем комментарии к таблицам и колонкам для ясности
COMMENT ON TABLE workspaces IS 'Глобальное пространство верхнего уровня (Организация).';
COMMENT ON COLUMN tasks.parent_id IS 'Ссылка на родительскую задачу для создания иерархии (Эпик -> Задача -> Подзадача).';
COMMENT ON TABLE task_history IS 'Логирует все изменения задач для анализа и обучения AI.';
COMMENT ON TABLE daily_snapshots IS 'Хранит ежедневные срезы состояния досок для предиктивной аналитики.';
COMMENT ON COLUMN workspace_members.role IS 'Роль пользователя в рамках конкретной организации.';