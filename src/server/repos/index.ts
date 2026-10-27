import { Repos } from "./types";
import { createMemoryRepos } from "./memory";

let repos: Repos | null = null;

export function getRepos(): Repos {
  if (!repos) {
    repos = createMemoryRepos();
  }
  return repos;
}
