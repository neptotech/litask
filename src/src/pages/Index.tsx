import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TodoProvider, useTodo } from "@/contexts/TodoContext";
import { TodoSidebar } from "@/components/TodoSidebar";
import { SortableTaskItem } from "@/components/TaskItem";
import { TaskDialog } from "@/components/TaskDialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Sun, Moon } from "lucide-react";
import { Task } from "@/types/todo";
import { ViewMode } from "@/types/view";
import { cn } from "@/lib/utils";
import { ProjectsOverview } from "@/components/ProjectsOverview";
import { MadeByBadge } from "@/components/MadeByBadge";

const getProjectKey = (projectId?: string | null) => projectId ?? null;

function TodoApp() {
  const {
    filteredTasks,
    activeFilter,
    activeProjectId,
    projects,
    tasks,
    reorderProjectTasks,
    moveTaskToProject,
    setActiveProjectId,
    setActiveFilter,
  } = useTodo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const { theme, setTheme } = useTheme();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const boardColumns = useMemo(
    () => [
      { id: "inbox", title: "Inbox", projectId: null },
      ...projects.map((project) => ({
        id: project.id,
        title: project.name,
        projectId: project.id,
      })),
    ],
    [projects]
  );

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    boardColumns.forEach((column) => {
      map[column.id] = tasks
        .filter((task) => getProjectKey(task.projectId) === column.projectId)
        .sort((a, b) => a.order - b.order);
    });
    return map;
  }, [tasks, boardColumns]);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingTask(null);
    }
  };

  const handleProjectSelect = (projectId: string | null) => {
    setActiveProjectId(projectId);
    setActiveFilter("all");
    setViewMode("list");
  };

  const incompleteTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);
  const displayTasks = activeFilter === "completed" ? completedTasks : filteredTasks;

  const getTitle = () => {
    if (viewMode === "projects") {
      return "Projects overview";
    }
    if (viewMode === "board") {
      return "Projects board";
    }
    if (activeProjectId) {
      const project = projects.find((p) => p.id === activeProjectId);
      return project?.name || "Tasks";
    }

    switch (activeFilter) {
      case "today":
        return "Today";
      case "upcoming":
        return "Upcoming";
      case "completed":
        return "Completed";
      default:
        return "All Tasks";
    }
  };

  const getSubtitle = () => {
    if (viewMode === "projects") {
      const completedProjects = projects.filter((project) => {
        const projectTasks = tasks.filter((task) => task.projectId === project.id);
        return projectTasks.length > 0 && projectTasks.every((task) => task.completed);
      }).length;
      return `${projects.length} projects • ${completedProjects} complete`;
    }

    if (viewMode === "board") {
      return `${tasks.length} tasks across ${projects.length + 1} lanes`;
    }

    const completedLabel =
      completedTasks.length > 0 ? ` • ${completedTasks.length} completed` : "";
    return `${incompleteTasks.length} active${completedLabel}`;
  };

  const handleListDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = displayTasks.find((task) => task.id === active.id);
    const overTask = displayTasks.find((task) => task.id === over.id);
    if (!activeTask || !overTask) return;

    const projectKey = getProjectKey(activeTask.projectId);
    if (projectKey !== getProjectKey(overTask.projectId)) return;

    const projectTasks = displayTasks.filter(
      (task) => getProjectKey(task.projectId) === projectKey
    );
    const orderedIds = arrayMove(
      projectTasks.map((task) => task.id),
      projectTasks.findIndex((task) => task.id === activeTask.id),
      projectTasks.findIndex((task) => task.id === overTask.id)
    );
    reorderProjectTasks(projectKey, orderedIds);
  };

  const handleBoardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !over.data.current) return;

    const activeTaskId = String(active.id);
    const activeProjectKey = active.data.current?.projectId ?? null;
    const destinationProjectKey = over.data.current?.projectId ?? null;
    const destinationColumnId = destinationProjectKey ?? "inbox";
    const destinationTasks = tasksByColumn[destinationColumnId] ?? [];
    const destinationTaskIds = destinationTasks.map((task) => task.id);

    if (over.data.current?.type === "task") {
      const overTaskId = String(over.id);
      const targetIndex = destinationTaskIds.indexOf(overTaskId);
      if (activeProjectKey === destinationProjectKey) {
        const newOrder = arrayMove(
          destinationTaskIds,
          destinationTaskIds.indexOf(activeTaskId),
          targetIndex
        );
        reorderProjectTasks(destinationProjectKey, newOrder);
        return;
      }
      moveTaskToProject(activeTaskId, destinationProjectKey, targetIndex);
      return;
    }

    if (activeProjectKey === destinationProjectKey) {
      const currentOrder = destinationTaskIds;
      const currentIndex = currentOrder.indexOf(activeTaskId);
      if (currentIndex === -1) return;
      const updatedOrder = arrayMove(currentOrder, currentIndex, currentOrder.length - 1);
      reorderProjectTasks(destinationProjectKey, updatedOrder);
      return;
    }

    moveTaskToProject(activeTaskId, destinationProjectKey, destinationTaskIds.length);
  };

  const viewTabs: { id: ViewMode; label: string }[] = [
    { id: "list", label: "List" },
    { id: "board", label: "Board" },
    { id: "projects", label: "Projects" },
  ];

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 flex-shrink-0">
        <TodoSidebar viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      <div className="flex flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{getTitle()}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{getSubtitle()}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background/80 p-1">
              {viewTabs.map((tab) => (
                <Button
                  key={tab.id}
                  size="sm"
                  variant={viewMode === tab.id ? "secondary" : "ghost"}
                  onClick={() => setViewMode(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {viewMode === "projects" ? (
            <ScrollArea className="h-full">
              <ProjectsOverview
                projects={projects}
                tasks={tasks}
                onSelectProject={handleProjectSelect}
              />
            </ScrollArea>
          ) : viewMode === "board" ? (
            <div className="h-full overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleBoardDragEnd}
              >
                <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                  {boardColumns.map((column) => (
                    <ProjectColumn
                      key={column.id}
                      column={column}
                      tasks={tasksByColumn[column.id] || []}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </DndContext>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-3">
                {displayTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-muted p-6">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">No tasks yet</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Get started by creating your first task
                    </p>
                    <Button onClick={() => setDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Task
                    </Button>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleListDragEnd}
                  >
                    <SortableContext
                      items={displayTasks.map((task) => task.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {displayTasks.map((task) => (
                          <SortableTaskItem key={task.id} task={task} onEdit={handleEdit} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        task={editingTask}
      />
      <MadeByBadge />
    </div>
  );
}

type BoardColumn = {
  id: string;
  title: string;
  projectId: string | null;
  color?: string;
};

type ProjectColumnProps = {
  column: BoardColumn;
  tasks: Task[];
  onEdit: (task: Task) => void;
};

function ProjectColumn({ column, tasks, onEdit }: ProjectColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", projectId: column.projectId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[280px] flex-col gap-3 rounded-xl border border-border bg-card/80 p-3",
        isOver && "border-primary/60 bg-primary/10"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{column.title}</p>
          <p className="text-xs text-muted-foreground">{tasks.length} tasks</p>
        </div>
      </div>
      <SortableContext
        id={column.id}
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-4 text-center text-sm text-muted-foreground">
              Drop tasks here
            </div>
          )}
          {tasks.map((task) => (
            <SortableTaskItem key={task.id} task={task} onEdit={onEdit} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

const Index = () => {
  return (
    <TodoProvider>
      <TodoApp />
    </TodoProvider>
  );
};

export default Index;
