import projects from '../data/projects.json';

export default function Projects({ onSelect }) {
  return (
    <section id="projects" className="container section none">
      <h1 className="mt-4 text-center text-secondary">Personal Projects</h1>
      <div className="projects-grid">
        {projects.map((project) => (
          <article
            key={project.title}
            className="project-card none pointerall"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(project)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(project);
              }
            }}
          >
            <h3>{project.title}</h3>
            <p>{project.summary}</p>
            <p className="tech-stack text-secondary">
              <strong>Stack:</strong> {project.techStack.join(', ')}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
