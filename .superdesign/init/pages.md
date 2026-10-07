# Page dependency trees

Global for every page: src/App.jsx, src/components/SiteNavigation.jsx and .css, src/styles.css.

## /#home
- src/pages/HomePage.jsx
  - src/pages/HomePage.css

## /#activity
- src/pages/ActivityPage.jsx
  - src/components/AccordionGallery.jsx
    - src/components/AccordionGallery.css
  - src/pages/ActivityPage.css

## /#projects
- src/pages/ProjectsPage.jsx
  - src/components/TiltedCard.jsx
    - src/components/TiltedCard.css
  - src/pages/ProjectsPage.css

## /#student-cases
- src/pages/StudentCasesPage.jsx
  - src/pages/StudentCasesPage.css
  - src/data/studentCases.js
  - src/components/TearTicket.jsx
    - src/components/TearTicket.css

## /#about
- src/pages/AboutPage.jsx
  - src/components/BounceCards.jsx
    - src/components/BounceCards.css
