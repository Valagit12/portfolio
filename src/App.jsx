import { useState } from 'react';
import About from './components/About.jsx';
import FluidBackground from './components/FluidBackground.jsx';
import WorkEdu from './components/WorkEdu.jsx';
import Projects from './components/Projects.jsx';
import ProjectModal from './components/ProjectModal.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <>
      <About />
      <main>
        <FluidBackground />
        <div className="black none"></div>
        <WorkEdu />
        <Projects onSelect={setSelectedProject} />
      </main>
      <Footer />
      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </>
  );
}
