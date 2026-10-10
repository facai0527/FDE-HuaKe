import { createContext, useContext } from 'react';

export const StoryContext = createContext(null);

export function useStory() {
  return useContext(StoryContext);
}

export const STORY_PAGES = [
  { id: 'home', label: '首页', direction: 'left' },
  { id: 'team', label: '理念', direction: 'right' },
  { id: 'projects', label: '项目', direction: 'up' },
  { id: 'student-cases', label: '学生案例', direction: 'down' },
  { id: 'activity', label: '活动区域', direction: 'right' },
  { id: 'about', label: '关于', direction: null },
];

// Team work and student work are two content stages of the Projects chapter.
export const chapterIdFor = id => id === 'student-cases' ? 'projects' : id;
export const STORY_CHAPTERS = STORY_PAGES.filter(page => page.id !== 'student-cases');
