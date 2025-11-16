import { resolveProjectColorToken } from "@/lib/project-colors";
import type { Project, Task } from "@/types/todo";
import { invokeTauri, isTauriRuntime } from "@/lib/tauri-bridge";

const TASKS_KEY = "tasks";
const PROJECTS_KEY = "projects";

export type PersistedState = {
  tasks: Task[];
  projects: Project[];
};

type SerializedSubtask = {
  id?: string;
  title?: string;
  completed?: boolean;
};

type SerializedTask = Omit<
  Task,
  "dueDate" | "createdAt" | "updatedAt" | "subtasks" | "tags"
> & {
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  subtasks?: SerializedSubtask[];
};

type SerializedProject = Omit<Project, "createdAt" | "color"> & {
  createdAt: string;
  color: string;
};

type PersistedPayload = {
  tasks: SerializedTask[];
  projects: SerializedProject[];
};

const EMPTY_PAYLOAD: PersistedPayload = { tasks: [], projects: [] };

const hasWindow = () => typeof window !== "undefined";

const isEmptyState = (payload: PersistedPayload | PersistedState) =>
  payload.tasks.length === 0 && payload.projects.length === 0;

const parsePayloadString = (raw?: string | null): PersistedPayload => {
  if (!raw) return EMPTY_PAYLOAD;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return EMPTY_PAYLOAD;
    }
    return {
      tasks: Array.isArray((parsed as PersistedPayload).tasks)
        ? (parsed as PersistedPayload).tasks
        : [],
      projects: Array.isArray((parsed as PersistedPayload).projects)
        ? (parsed as PersistedPayload).projects
        : [],
    };
  } catch (error) {
    console.error("Failed to parse Litask data", error);
    return EMPTY_PAYLOAD;
  }
};

const sanitizeSubtasks = (subtasks?: SerializedSubtask[]): Task["subtasks"] => {
  if (!Array.isArray(subtasks)) return [];
  return subtasks.map((subtask) => ({
    id: subtask.id || crypto.randomUUID(),
    title: (subtask.title || "").trim(),
    completed: Boolean(subtask.completed),
  }));
};

const deserializeTask = (task: SerializedTask, index: number): Task => ({
  id: task.id || crypto.randomUUID(),
  title: task.title?.trim() || "Untitled",
  description: task.description,
  completed: Boolean(task.completed),
  priority: task.priority,
  dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
  tags: Array.isArray(task.tags) ? task.tags : [],
  projectId: task.projectId,
  order: typeof task.order === "number" ? task.order : index,
  subtasks: sanitizeSubtasks(task.subtasks),
  createdAt: new Date(task.createdAt),
  updatedAt: new Date(task.updatedAt),
});

const deserializeProject = (project: SerializedProject): Project => ({
  id: project.id || crypto.randomUUID(),
  name: project.name?.trim() || "Untitled Project",
  color: resolveProjectColorToken(project.color),
  createdAt: new Date(project.createdAt),
});

const serializeTask = (task: Task): SerializedTask => ({
  id: task.id,
  title: task.title,
  description: task.description,
  completed: task.completed,
  priority: task.priority,
  dueDate: task.dueDate?.toISOString() ?? null,
  tags: task.tags,
  projectId: task.projectId,
  order: task.order,
  subtasks: task.subtasks.map((subtask) => ({
    id: subtask.id,
    title: subtask.title,
    completed: subtask.completed,
  })),
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
});

const serializeProject = (project: Project): SerializedProject => ({
  id: project.id,
  name: project.name,
  color: project.color,
  createdAt: project.createdAt.toISOString(),
});

const toPayload = (state: PersistedState): PersistedPayload => ({
  tasks: state.tasks.map(serializeTask),
  projects: state.projects.map(serializeProject),
});

const fromPayload = (payload: PersistedPayload): PersistedState => ({
  tasks: Array.isArray(payload.tasks)
    ? payload.tasks.map(deserializeTask)
    : [],
  projects: Array.isArray(payload.projects)
    ? payload.projects.map(deserializeProject)
    : [],
});

const readLocalStorage = (): PersistedPayload | null => {
  if (!hasWindow()) return null;
  try {
    const tasksRaw = window.localStorage.getItem(TASKS_KEY);
    const projectsRaw = window.localStorage.getItem(PROJECTS_KEY);

    if (!tasksRaw && !projectsRaw) return null;

    return {
      tasks: tasksRaw ? JSON.parse(tasksRaw) : [],
      projects: projectsRaw ? JSON.parse(projectsRaw) : [],
    };
  } catch (error) {
    console.error("Failed to parse localStorage data", error);
    return null;
  }
};

const writeLocalStorage = (payload: PersistedPayload) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(payload.tasks));
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(payload.projects));
};

export const loadPersistedState = async (): Promise<PersistedState> => {
  const localSnapshot = readLocalStorage();

  if (isTauriRuntime()) {
    try {
      const fileContents = await invokeTauri<string>("load_litask_data");
      const payload = parsePayloadString(fileContents);
      if (isEmptyState(payload) && localSnapshot) {
        return fromPayload(localSnapshot);
      }
      return fromPayload(payload);
    } catch (error) {
      console.warn("Falling back to localStorage data", error);
      if (localSnapshot) {
        return fromPayload(localSnapshot);
      }
      return fromPayload(EMPTY_PAYLOAD);
    }
  }

  if (localSnapshot) {
    return fromPayload(localSnapshot);
  }

  return fromPayload(EMPTY_PAYLOAD);
};

export const persistState = async (state: PersistedState) => {
  const payload = toPayload(state);
  writeLocalStorage(payload);

  if (!isTauriRuntime()) return;

  try {
    await invokeTauri("save_litask_data", { content: JSON.stringify(payload) });
  } catch (error) {
    console.error("Unable to save Litask data to disk", error);
  }
};
