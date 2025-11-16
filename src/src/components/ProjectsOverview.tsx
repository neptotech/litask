import { Project, Task } from "@/types/todo";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Inbox, Layers } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type ProjectsOverviewProps = {
  projects: Project[];
  tasks: Task[];
  onSelectProject: (projectId: string | null) => void;
};

const buildStats = (projectId: string | null, tasks: Task[]) => {
  const projectTasks = tasks.filter(
    (task) => (task.projectId ?? null) === projectId
  );
  const completed = projectTasks.filter((task) => task.completed).length;
  const pending = projectTasks.length - completed;
  const upcoming = projectTasks
    .filter((task) => !task.completed && task.dueDate)
    .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));
  const nextDue = upcoming[0]?.dueDate;
  const completion = projectTasks.length
    ? Math.round((completed / projectTasks.length) * 100)
    : 0;

  return {
    total: projectTasks.length,
    completed,
    pending,
    completion,
    nextDue,
  };
};

export function ProjectsOverview({ projects, tasks, onSelectProject }: ProjectsOverviewProps) {
  const inboxStats = buildStats(null, tasks);
  const projectCards = projects.map((project) => ({
    project,
    stats: buildStats(project.id, tasks),
  }));

  const activeProjects = projectCards.filter(
    (card) => card.stats.pending > 0 || card.stats.total === 0
  );
  const finishedProjects = projectCards.filter(
    (card) => card.stats.total > 0 && card.stats.pending === 0
  );

  return (
    <div className="space-y-8 p-6">
      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <p className="text-sm text-muted-foreground">Inbox</p>
              <CardTitle className="text-2xl">{inboxStats.total} tasks</CardTitle>
            </div>
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={inboxStats.completion} />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>{inboxStats.completed} done</span>
              <span>{inboxStats.pending} remaining</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => onSelectProject(null)}>
              View inbox
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Active projects</h3>
            <p className="text-sm text-muted-foreground">
              {activeProjects.length} in progress
            </p>
          </div>
        </div>
        {activeProjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-muted-foreground">
            Everything is wrapped up! Create a project to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeProjects.map(({ project, stats }) => (
              <ProjectCard
                key={project.id}
                title={project.name}
                stats={stats}
                onSelect={() => onSelectProject(project.id)}
              />
            ))}
          </div>
        )}
      </section>

      {finishedProjects.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Completed projects
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {finishedProjects.map(({ project, stats }) => (
              <ProjectCard
                key={project.id}
                title={project.name}
                stats={stats}
                onSelect={() => onSelectProject(project.id)}
                completed
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type ProjectCardProps = {
  title: string;
  stats: ReturnType<typeof buildStats>;
  onSelect: () => void;
  completed?: boolean;
};

function ProjectCard({ title, stats, onSelect, completed }: ProjectCardProps) {
  const badgeLabel = completed ? "Completed" : `${stats.pending} remaining`;
  const badgeVariant = completed ? "secondary" : "outline";

  return (
    <Card className={cn("flex flex-col", completed && "border-primary/40 bg-primary/5")}> 
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {stats.completed} of {stats.total || 0} done
            </p>
          </div>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="h-4 w-4" />
          {stats.total} total tasks
        </div>
        <Progress value={stats.completion} />
        {stats.nextDue && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Next due {format(stats.nextDue, "MMM d")}
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto">
        <Button variant="ghost" className="w-full" onClick={onSelect}>
          Open project
        </Button>
      </CardFooter>
    </Card>
  );
}
