import { useEffect, useRef, useState } from 'react';
import projects from '../data/projects.json';
import { useProjectMorph } from './projectMorph.js';

// Clicking a card turns the grid into one big box with that project's details (see
// projectMorph.js for the sequence). Close (×, Esc) plays it back.

function Card({ project, onOpen }) {
  return (
    <article
      className="project-card pointerall"
      role="button"
      tabIndex={0}
      aria-label={`${project.title}: show details`}
      onClick={(e) => onOpen(project, e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(project, e.currentTarget);
        }
      }}
    >
      <h3>{project.title}</h3>
      <p>{project.summary}</p>
      <p className="tech-stack text-secondary">
        <strong>Stack:</strong> {project.techStack.join(', ')}
      </p>
    </article>
  );
}

function Details({ project, onClose, closeRef }) {
  return (
    <article className="project-detail pointerall" aria-labelledby="projectDetailTitle">
      <button ref={closeRef} type="button" className="project-close" aria-label="Close project details" onClick={onClose}>
        ×
      </button>
      <h3 id="projectDetailTitle">{project.title}</h3>
      {/* detailsHTML is authored content from src/data/projects.json */}
      <div className="project-detail-body" dangerouslySetInnerHTML={{ __html: project.detailsHTML ?? '' }} />
      <div className="project-detail-links">
        {project.links.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
            {link.text}
          </a>
        ))}
      </div>
    </article>
  );
}

export default function Projects() {
  const [shown, setShown] = useState(null); // project in the big box (kept while it closes)
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const gridRef = useRef(null);
  const detailRef = useRef(null);
  const closeRef = useRef(null);
  const cardRef = useRef(null); // the card that opened it, to return focus there
  const morph = useProjectMorph({ rootRef, fromRef: gridRef, toRef: detailRef }, [shown]);

  const openProject = (project, card) => {
    // Mid-animation the stage ignores the mouse (pointer-events: none); ignore the keyboard too,
    // so Tab + Enter on another card can't cut the animation short.
    if (rootRef.current.classList.contains('is-animating')) return;
    cardRef.current = card;
    setOpen(true);
    // Same project: its box is already rendered, so just play. A new one: render it first.
    if (project === shown) morph.set(true, card);
    else {
      morph.request(true, card);
      setShown(project);
    }
    // bring the top of the section into view if the card was further down
    const top = rootRef.current.getBoundingClientRect().top;
    if (top < 0) window.scrollBy({ top: top - 96, behavior: 'smooth' });
  };

  const close = () => {
    setOpen(false);
    morph.set(false);
  };

  // Once it has finished: focus the × when opened, the card that opened it when closed.
  useEffect(() => {
    const root = rootRef.current;
    const onEnd = (e) => (e.detail.open ? closeRef : cardRef).current?.focus({ preventScroll: true });
    root.addEventListener('morphend', onEnd);
    return () => root.removeEventListener('morphend', onEnd);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <section id="projects" className="container section none">
      <h1 className="text-center text-secondary">Personal Projects</h1>
      <div ref={rootRef} className="projects-stage swap-stage">
        <div ref={gridRef} className="swap-pane swap-from projects-grid">
          {projects.map((project) => (
            <Card key={project.title} project={project} onOpen={openProject} />
          ))}
        </div>
        <div ref={detailRef} className="swap-pane swap-to">
          {shown && <Details project={shown} onClose={close} closeRef={closeRef} />}
        </div>
      </div>
    </section>
  );
}
