import { createContext, useContext } from 'react';

export const StoryContext = createContext(null);

export function useStory() {
  return useContext(StoryContext);
}

export const STORY_PAGES = [
  { id: 'home', label: '首页', direction: 'left', next: 'activity', cue: '向左拖动 · 走进自然', arrow: '←' },
  { id: 'activity', label: '活动场域', direction: 'right', next: 'projects', cue: '向右拖动 · 进入机械空间', arrow: '→' },
  { id: 'projects', label: '项目', direction: 'up', next: 'student-cases', cue: '向上拖动 · 穿过云层', arrow: '↑' },
  { id: 'student-cases', label: '学生案例', direction: 'down', next: 'about', cue: '向下拖动 · 进入算力中枢', arrow: '↓' },
  { id: 'about', label: '关于', direction: null, next: null, cue: '轻点背景 · 点亮信号', arrow: '·' },
];
