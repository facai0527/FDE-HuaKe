import SiteNavigation from './components/SiteNavigation';
import HomePage from './pages/HomePage';
import ActivityPage from './pages/ActivityPage';
import ProjectsPage from './pages/ProjectsPage';
import StudentCasesPage from './pages/StudentCasesPage';
import AboutPage from './pages/AboutPage';
import StoryExperience from './components/StoryExperience';

export default function App() {
  return (
    <StoryExperience>
      <SiteNavigation />
      <main className="site-shell">
        <HomePage />
        <ActivityPage />
        <ProjectsPage />
        <StudentCasesPage />
        <AboutPage />
      </main>
    </StoryExperience>
  );
}
