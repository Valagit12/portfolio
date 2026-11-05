import About from './components/About.jsx';
import FluidBackground from './components/FluidBackground.jsx';
import WorkEdu from './components/WorkEdu.jsx';
import Projects from './components/Projects.jsx';

export default function App() {
  return (
    <>
      <FluidBackground />
      <About />
      <main>
        <WorkEdu />
        <Projects />
      </main>
      <p className="space-hint" aria-hidden="true">press space</p>
    </>
  );
}
