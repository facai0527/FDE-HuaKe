import SiteNavigation from './components/SiteNavigation';
import HomePage from './pages/HomePage';
import TeamPage from './pages/TeamPage';
import ActivityPage from './pages/ActivityPage';
import ProjectsPage from './pages/ProjectsPage';
import StudentCasesPage from './pages/StudentCasesPage';
import StudentPortfolioPage from './pages/StudentPortfolioPage';
import AboutPage from './pages/AboutPage';
import StoryExperience from './components/StoryExperience';
import ScrollCue from './components/ScrollCue';

export default function App() {
  if (window.location.pathname === '/student-portfolio' || window.location.pathname === '/student-portfolio/') {
    return <StudentPortfolioPage />;
  }

  return (
    <StoryExperience>
      <SiteNavigation />
      <main className="site-shell">
        <HomePage />
        <TeamPage />
        <ProjectsPage />
        <StudentCasesPage />
        <ActivityPage />
        <AboutPage />
      </main>
      <ScrollCue />
    </StoryExperience>
  );
}
