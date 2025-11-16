import { ProjectColor } from "@/types/todo";

export const PROJECT_COLORS: ProjectColor[] = [
  "primary",
  "secondary",
  "solarized-orange",
  "solarized-violet",
  "solarized-magenta",
];

export const PROJECT_COLOR_CLASSES: Record<ProjectColor, string> = {
  primary: "project-dot-primary",
  secondary: "project-dot-secondary",
  "solarized-orange": "project-dot-solarized-orange",
  "solarized-violet": "project-dot-solarized-violet",
  "solarized-magenta": "project-dot-solarized-magenta",
};

const LEGACY_COLOR_VALUES: Record<string, ProjectColor> = {
  "hsl(var(--primary))": "primary",
  "hsl(var(--secondary))": "secondary",
  "hsl(var(--solarized-orange))": "solarized-orange",
  "hsl(var(--solarized-violet))": "solarized-violet",
  "hsl(var(--solarized-magenta))": "solarized-magenta",
};

export const resolveProjectColorToken = (value?: string): ProjectColor => {
  if (!value) return "primary";
  if ((PROJECT_COLORS as string[]).includes(value)) {
    return value as ProjectColor;
  }
  return LEGACY_COLOR_VALUES[value] ?? "primary";
};
