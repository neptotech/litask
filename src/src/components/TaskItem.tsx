import React, { useEffect, useRef } from "react";
import { Task, Priority } from "@/types/todo";
import { useTodo } from "@/contexts/TodoContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, MoreVertical, Pencil, Trash2, Flag, GripVertical, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

type DragHandleProps = {
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
};

export type TaskItemProps = {
  task: Task;
  onEdit: (task: Task) => void;
  dragHandleProps?: DragHandleProps;
  dragStyle?: {
    transform?: string;
    transition?: string;
  };
  setNodeRef?: (node: HTMLDivElement | null) => void;
  isDragging?: boolean;
};

const priorityConfig: Record<
  Priority,
  { color: string; label: string; icon: string }
> = {
  low: {
    color: "bg-priority-low",
    label: "Low",
    icon: "text-priority-low",
  },
  medium: {
    color: "bg-priority-medium",
    label: "Medium",
    icon: "text-priority-medium",
  },
  high: {
    color: "bg-priority-high",
    label: "High",
    icon: "text-priority-high",
  },
};

const TaskItemBase = ({
  task,
  onEdit,
  dragHandleProps,
  dragStyle,
  setNodeRef,
  isDragging,
}: TaskItemProps) => {
  const { toggleTask, deleteTask, projects, updateTask } = useTodo();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const project = projects.find((p) => p.id === task.projectId);
  const priorityInfo = priorityConfig[task.priority];
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

  useEffect(() => {
    if (!containerRef.current) return;
    if (dragStyle?.transform) {
      containerRef.current.style.transform = dragStyle.transform;
    } else {
      containerRef.current.style.removeProperty("transform");
    }

    if (dragStyle?.transition) {
      containerRef.current.style.transition = dragStyle.transition;
    } else {
      containerRef.current.style.removeProperty("transition");
    }
  }, [dragStyle]);

  const assignRef = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    setNodeRef?.(node);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((subtask) =>
      subtask.id === subtaskId
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    );
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  return (
    <div
      ref={assignRef}
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-all",
        task.completed && "opacity-60",
        isDragging && "ring-2 ring-primary/40"
      )}
    >
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => toggleTask(task.id)}
          className="mt-1"
        />

        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3
                  className={cn(
                    "font-medium text-foreground",
                    task.completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </h3>
                {dragHandleProps && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 cursor-grab opacity-0 transition group-hover:opacity-100"
                    {...dragHandleProps.attributes}
                    {...dragHandleProps.listeners}
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground leading-snug">
                  {task.description}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => deleteTask(task.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Flag className={cn("h-3 w-3", priorityInfo.icon)} />
              <span className="text-xs text-muted-foreground">
                {priorityInfo.label}
              </span>
            </div>

            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(task.dueDate, "MMM d")}
              </div>
            )}

            {project && (
              <Badge variant="outline" className="gap-1">
                {project.name}
              </Badge>
            )}

            {task.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {task.subtasks.length > 0 && (
            <div className="rounded-md border border-dashed border-border/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <ListChecks className="h-3 w-3" />
                {completedSubtasks}/{task.subtasks.length} subtasks
              </div>
              <div className="space-y-1">
                {task.subtasks.map((subtask) => (
                  <label
                    key={subtask.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={() => handleSubtaskToggle(subtask.id)}
                      className="h-4 w-4"
                    />
                    <span
                      className={cn(
                        "flex-1 truncate",
                        subtask.completed && "line-through text-muted-foreground/80"
                      )}
                    >
                      {subtask.title || "Untitled subtask"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
};

export function TaskItem(props: TaskItemProps) {
  return <TaskItemBase {...props} />;
}

export function SortableTaskItem(props: TaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
    data: {
      type: "task",
      projectId: props.task.projectId ?? null,
    },
  });

  const dragStyle = transform
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : undefined;

  return (
    <TaskItemBase
      {...props}
      setNodeRef={setNodeRef}
      dragStyle={dragStyle}
      isDragging={isDragging}
      dragHandleProps={{ attributes, listeners }}
    />
  );
}
