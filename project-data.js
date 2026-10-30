// Placeholder records shared by the wall frames, project list and certificates.
export const PROJECTS = [
  {
    "id": "project-1",
    "title": "Project One",
    "url": "https://example.com/project-1",
    "subtitle": "[Your project subtitle]",
    "category": "[Your project category]",
    "color": "#234c3e",
    "certificateText": "[Summarize what you designed, built, or contributed to this project.]",
    "intro": "[Describe the problem, your approach, and the final result of this project.]",
    "points": [
      "[Your contribution]",
      "[A feature you built]",
      "[A verified outcome]",
      "[What you learned]"
    ],
    "usedIn": "[Technology One] · [Technology Two] · [Technology Three]"
  },
  {
    "id": "project-2",
    "title": "Project Two",
    "url": "https://example.com/project-2",
    "subtitle": "[Your project subtitle]",
    "category": "[Your project category]",
    "color": "#234c3e",
    "certificateText": "[Summarize what you designed, built, or contributed to this project.]",
    "intro": "[Describe the problem, your approach, and the final result of this project.]",
    "points": [
      "[Your contribution]",
      "[A feature you built]",
      "[A verified outcome]",
      "[What you learned]"
    ],
    "usedIn": "[Technology One] · [Technology Two] · [Technology Three]"
  },
  {
    "id": "project-3",
    "title": "Project Three",
    "url": "https://example.com/project-3",
    "subtitle": "[Your project subtitle]",
    "category": "[Your project category]",
    "color": "#234c3e",
    "certificateText": "[Summarize what you designed, built, or contributed to this project.]",
    "intro": "[Describe the problem, your approach, and the final result of this project.]",
    "points": [
      "[Your contribution]",
      "[A feature you built]",
      "[A verified outcome]",
      "[What you learned]"
    ],
    "usedIn": "[Technology One] · [Technology Two] · [Technology Three]"
  },
  {
    "id": "project-4",
    "title": "Project Four",
    "url": "https://example.com/project-4",
    "subtitle": "[Your project subtitle]",
    "category": "[Your project category]",
    "color": "#234c3e",
    "certificateText": "[Summarize what you designed, built, or contributed to this project.]",
    "intro": "[Describe the problem, your approach, and the final result of this project.]",
    "points": [
      "[Your contribution]",
      "[A feature you built]",
      "[A verified outcome]",
      "[What you learned]"
    ],
    "usedIn": "[Technology One] · [Technology Two] · [Technology Three]"
  },
  {
    "id": "project-5",
    "title": "Project Five",
    "url": "https://example.com/project-5",
    "subtitle": "[Your project subtitle]",
    "category": "[Your project category]",
    "color": "#234c3e",
    "certificateText": "[Summarize what you designed, built, or contributed to this project.]",
    "intro": "[Describe the problem, your approach, and the final result of this project.]",
    "points": [
      "[Your contribution]",
      "[A feature you built]",
      "[A verified outcome]",
      "[What you learned]"
    ],
    "usedIn": "[Technology One] · [Technology Two] · [Technology Three]"
  }
];

export const PROJECT_INFO = Object.fromEntries(PROJECTS.map(project => [project.title, project]));
