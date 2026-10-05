import { useStore } from "zustand";
import { FIELD } from "../constants/toolkit.ts";
import { useViewedProject } from "../hooks/useViewedProject.ts";
import { feedViewStore } from "../store/feed-view-store.ts";

/**
 * Whose journal the page shows: every project keeps its own. The project open in the plugin comes first; another one
 * opens its journal for looking.
 */
export function ProjectSwitch() {
  const { projects, shown, picked } = useViewedProject();
  const setProject = useStore(feedViewStore, (state) => state.setProject);
  const current = picked ?? shown?.id ?? null;
  const options = [
    ...(shown === null || projects.some((project) => project.id === shown.id) ? [] : [shown]),
    ...projects,
  ];

  // One project needs no switch: the page header names it already.
  if (options.length < 2) {
    return null;
  }

  return (
    <select
      aria-label="Project"
      className={FIELD}
      value={current ?? ""}
      onChange={(event) => setProject(event.target.value === shown?.id ? null : event.target.value)}
    >
      {options.map((project) => (
        <option key={project.id} value={project.id}>
          {project.id === shown?.id ? `${project.name} (open in Framer)` : project.name}
        </option>
      ))}
    </select>
  );
}
