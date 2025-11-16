import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { Task, Project, FilterType, Priority, ProjectColor } from "@/types/todo";
import { isToday, isFuture } from "date-fns";
import { loadPersistedState, persistState } from "@/lib/persistence";

type CreateTaskPayload = {
  title: string;
  description?: string;
  completed?: boolean;
  priority: Priority;
  dueDate?: Date;
  tags?: string[];
  projectId?: string;
  subtasks?: Task["subtasks"];
};

type TodoContextType = {
  tasks: Task[];
  projects: Project[];
  activeFilter: FilterType;
  activeProjectId: string | null;
  searchQuery: string;
  addTask: (task: CreateTaskPayload) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  reorderProjectTasks: (projectId: string | null, orderedTaskIds: string[]) => void;
  moveTaskToProject: (
    taskId: string,
    projectId: string | null,
    targetIndex: number
  ) => void;
  addProject: (name: string, color: ProjectColor) => void;
  deleteProject: (id: string) => void;
  setActiveFilter: (filter: FilterType) => void;
  setActiveProjectId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  filteredTasks: Task[];
};

const TodoContext = createContext<TodoContextType | undefined>(undefined);

const getProjectKey = (projectId?: string | null) => projectId ?? null;

const normalizeSubtasks = (subtasks?: Task["subtasks"]) => {
  if (!subtasks) return [];
  return subtasks.map((subtask) => ({
    id: subtask.id || crypto.randomUUID(),
    title: subtask.title?.trim() || "",
    completed: Boolean(subtask.completed),
  }));
};

const normalizeProjectOrder = (tasks: Task[], projectId: string | null) => {
  const orderedIds = tasks
    .filter((task) => getProjectKey(task.projectId) === projectId)
    .sort((a, b) => a.order - b.order)
    .map((task) => task.id);

  return tasks.map((task) => {
    if (getProjectKey(task.projectId) !== projectId) return task;
    const newIndex = orderedIds.indexOf(task.id);
    return newIndex === -1 || task.order === newIndex
      ? task
      : { ...task, order: newIndex };
  });
};

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const persisted = await loadPersistedState();
      if (cancelled) return;
      setTasks(persisted.tasks);
      setProjects(persisted.projects);
      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    void persistState({ tasks, projects });
  }, [tasks, projects, isHydrated]);

  const addTask = (taskInput: CreateTaskPayload) => {
    setTasks((prev) => {
      const projectKey = getProjectKey(taskInput.projectId);
      const projectTaskCount = prev.filter(
        (t) => getProjectKey(t.projectId) === projectKey
      ).length;

      const newTask: Task = {
        id: crypto.randomUUID(),
        title: taskInput.title,
        description: taskInput.description,
        completed: taskInput.completed ?? false,
        priority: taskInput.priority,
        dueDate: taskInput.dueDate,
        tags: taskInput.tags ?? [],
        projectId: taskInput.projectId,
        order: projectTaskCount,
        subtasks: normalizeSubtasks(taskInput.subtasks),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return [newTask, ...prev];
    });
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const normalizedSubtasks =
          updates.subtasks !== undefined
            ? normalizeSubtasks(updates.subtasks)
            : task.subtasks;

        const nextOrder =
          typeof updates.order === "number" ? updates.order : task.order;

        return {
          ...task,
          ...updates,
          order: nextOrder,
          subtasks: normalizedSubtasks,
          updatedAt: new Date(),
        };
      })
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => {
      const target = prev.find((task) => task.id === id);
      if (!target) return prev;
      const remaining = prev.filter((task) => task.id !== id);
      return normalizeProjectOrder(remaining, getProjectKey(target.projectId));
    });
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed, updatedAt: new Date() }
          : task
      )
    );
  };

  const reorderProjectTasks = (
    projectId: string | null,
    orderedTaskIds: string[]
  ) => {
    setTasks((prev) => {
      const projectKey = getProjectKey(projectId);
      const projectTasks = prev.filter(
        (task) => getProjectKey(task.projectId) === projectKey
      );
      const missingTaskIds = projectTasks
        .map((task) => task.id)
        .filter((id) => !orderedTaskIds.includes(id));
      const fullOrder = [...orderedTaskIds, ...missingTaskIds];

      return prev.map((task) => {
        if (getProjectKey(task.projectId) !== projectKey) return task;
        const newIndex = fullOrder.indexOf(task.id);
        if (newIndex === -1 || task.order === newIndex) return task;
        return { ...task, order: newIndex, updatedAt: new Date() };
      });
    });
  };

  const moveTaskToProject = (
    taskId: string,
    projectId: string | null,
    targetIndex: number
  ) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;

      const sourceProjectKey = getProjectKey(task.projectId);
      const destinationProjectKey = getProjectKey(projectId);

      const sourceOrder = prev
        .filter((t) => getProjectKey(t.projectId) === sourceProjectKey && t.id !== taskId)
        .sort((a, b) => a.order - b.order)
        .map((t) => t.id);

      const destinationOrder = prev
        .filter((t) => getProjectKey(t.projectId) === destinationProjectKey && t.id !== taskId)
        .sort((a, b) => a.order - b.order)
        .map((t) => t.id);

      const clampedIndex = Math.min(Math.max(targetIndex, 0), destinationOrder.length);
      destinationOrder.splice(clampedIndex, 0, taskId);

      return prev.map((t) => {
        if (t.id === taskId) {
          const newIndex = destinationOrder.indexOf(taskId);
          return {
            ...t,
            projectId: projectId || undefined,
            order: newIndex,
            updatedAt: new Date(),
          };
        }

        if (getProjectKey(t.projectId) === sourceProjectKey) {
          const newIndex = sourceOrder.indexOf(t.id);
          if (newIndex === -1 || t.order === newIndex) return t;
          return { ...t, order: newIndex, updatedAt: new Date() };
        }

        if (getProjectKey(t.projectId) === destinationProjectKey) {
          const newIndex = destinationOrder.indexOf(t.id);
          if (newIndex === -1 || t.order === newIndex) return t;
          return { ...t, order: newIndex, updatedAt: new Date() };
        }

        return t;
      });
    });
  };

  const addProject = (name: string, color: ProjectColor) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      color,
      createdAt: new Date(),
    };
    setProjects((prev) => [...prev, newProject]);
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
    // Move tasks into inbox and append to end
    setTasks((prev) => {
      const inboxCount = prev.filter(
        (task) => getProjectKey(task.projectId) === null
      ).length;
      let nextOrder = inboxCount;

      return prev.map((task) => {
        if (task.projectId !== id) return task;
        const reassignedTask = {
          ...task,
          projectId: undefined,
          order: nextOrder++,
          updatedAt: new Date(),
        };
        return reassignedTask;
      });
    });
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const matchesFilters = (task: Task) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      if (activeProjectId && task.projectId !== activeProjectId) {
        return false;
      }

      if (activeFilter === "completed") {
        return task.completed;
      }

      if (task.completed && activeFilter !== "all") {
        return false;
      }

      if (activeFilter === "today") {
        return task.dueDate ? isToday(task.dueDate) : false;
      }

      if (activeFilter === "upcoming") {
        return task.dueDate ? isFuture(task.dueDate) && !isToday(task.dueDate) : false;
      }

      return true;
    };

    return tasks
      .filter(matchesFilters)
      .sort((a, b) => {
        const projectA = getProjectKey(a.projectId) ?? "";
        const projectB = getProjectKey(b.projectId) ?? "";
        if (projectA === projectB) {
          return a.order - b.order;
        }
        return projectA.localeCompare(projectB);
      });
  }, [tasks, activeFilter, activeProjectId, searchQuery]);

  return (
    <TodoContext.Provider
      value={{
        tasks,
        projects,
        activeFilter,
        activeProjectId,
        searchQuery,
        addTask,
        updateTask,
        deleteTask,
        toggleTask,
        reorderProjectTasks,
        moveTaskToProject,
        addProject,
        deleteProject,
        setActiveFilter,
        setActiveProjectId,
        setSearchQuery,
        filteredTasks,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
}

export function useTodo() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error("useTodo must be used within TodoProvider");
  }
  return context;
}
