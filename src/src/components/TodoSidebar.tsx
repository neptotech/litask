import { useTodo } from "@/contexts/TodoContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ViewMode } from "@/types/view";
import { PROJECT_COLORS, PROJECT_COLOR_CLASSES } from "@/lib/project-colors";
import {
  CheckCircle2,
  Calendar,
  CalendarClock,
  Inbox,
  Plus,
  Folder,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type TodoSidebarProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

export function TodoSidebar({ viewMode, onViewModeChange }: TodoSidebarProps) {
  const {
    activeFilter,
    setActiveFilter,
    activeProjectId,
    setActiveProjectId,
    projects,
    addProject,
    tasks,
    searchQuery,
    setSearchQuery,
  } = useTodo();

  const [newProjectName, setNewProjectName] = useState("");
  const [showProjectInput, setShowProjectInput] = useState(false);

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      const randomColor =
        PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
      addProject(newProjectName.trim(), randomColor);
      setNewProjectName("");
      setShowProjectInput(false);
    }
  };

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const todayTasks = incompleteTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()
  );
  const upcomingTasks = incompleteTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) > new Date() && !todayTasks.includes(t)
  );
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">Todo</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 p-2">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewModeChange("list")}
          >
            Task list
          </Button>
          <Button
            variant={viewMode === "board" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveFilter("all");
              setActiveProjectId(null);
              onViewModeChange("board");
            }}
          >
            Board
          </Button>
          <Button
            variant={viewMode === "projects" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveFilter("all");
              setActiveProjectId(null);
              onViewModeChange("projects");
            }}
          >
            Projects overview
          </Button>
        </div>

        <div className="space-y-1 p-2">
          <Button
            variant={activeFilter === "all" && !activeProjectId ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => {
              setActiveFilter("all");
              setActiveProjectId(null);
            }}
          >
            <Inbox className="h-4 w-4" />
            All Tasks
            <span className="ml-auto text-xs text-muted-foreground">
              {incompleteTasks.length}
            </span>
          </Button>

          <Button
            variant={activeFilter === "today" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => {
              setActiveFilter("today");
              setActiveProjectId(null);
            }}
          >
            <Calendar className="h-4 w-4" />
            Today
            <span className="ml-auto text-xs text-muted-foreground">
              {todayTasks.length}
            </span>
          </Button>

          <Button
            variant={activeFilter === "upcoming" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => {
              setActiveFilter("upcoming");
              setActiveProjectId(null);
            }}
          >
            <CalendarClock className="h-4 w-4" />
            Upcoming
            <span className="ml-auto text-xs text-muted-foreground">
              {upcomingTasks.length}
            </span>
          </Button>

          <Button
            variant={activeFilter === "completed" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => {
              setActiveFilter("completed");
              setActiveProjectId(null);
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Completed
            <span className="ml-auto text-xs text-muted-foreground">
              {completedTasks.length}
            </span>
          </Button>
        </div>

        <Separator className="my-4" />

        <div className="space-y-1 p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <h3 className="text-sm font-semibold text-foreground">Projects</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowProjectInput(!showProjectInput)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {showProjectInput && (
            <div className="px-2 py-1">
              <Input
                placeholder="New project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                onBlur={handleAddProject}
                autoFocus
                className="h-8"
              />
            </div>
          )}

          {projects.map((project) => {
            const projectTaskCount = tasks.filter(
              (t) => t.projectId === project.id && !t.completed
            ).length;

            return (
              <Button
                key={project.id}
                variant={activeProjectId === project.id ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => {
                  setActiveProjectId(project.id);
                  setActiveFilter("all");
                }}
              >
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    PROJECT_COLOR_CLASSES[project.color]
                  )}
                />
                <span className="truncate">{project.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {projectTaskCount}
                </span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
