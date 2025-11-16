export type Priority = "low" | "medium" | "high";

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  dueDate?: Date;
  tags: string[];
  projectId?: string;
  order: number;
  subtasks: Subtask[];
  createdAt: Date;
  updatedAt: Date;
};

export type Project = {
  id: string;
  name: string;
  color: ProjectColor;
  createdAt: Date;
};

export type ProjectColor =
  | "primary"
  | "secondary"
  | "solarized-orange"
  | "solarized-violet"
  | "solarized-magenta";

export type FilterType = "all" | "today" | "upcoming" | "completed";
