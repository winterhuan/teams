import type { Project } from "../domain/project.ts";
import type {
  ProjectDetailReadModel,
  ProjectGridReadModel,
} from "../application/contracts.ts";

export function toProjectGridItem(project: Project) {
  return {
    projectId: project.projectId,
    name: project.name,
    updatedAt: project.updatedAt,
    defaultSection: "chat" as const,
  };
}

export function toProjectDetail(project: Project): ProjectDetailReadModel {
  return {
    projectId: project.projectId,
    name: project.name,
    rootPath: project.rootPath,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    defaultSection: "chat",
  };
}

export function emptyProjectGrid(): ProjectGridReadModel {
  return { projects: [] };
}
