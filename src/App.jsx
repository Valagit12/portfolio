import { useState } from 'react';
import About from './components/About.jsx';
import FluidBackground from './components/FluidBackground.jsx';
import WorkEdu from './components/WorkEdu.jsx';
import Projects from './components/Projects.jsx';
import ProjectModal from './components/ProjectModal.jsx';

export default function App() {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <>
      <About />
      <main>
        <FluidBackground />
        <WorkEdu />
        <Projects onSelect={setSelectedProject} />
      </main>
      <p className="space-hint" aria-hidden="true">press space</p>
      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </>
  );
}
