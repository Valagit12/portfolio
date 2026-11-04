import { useEffect } from 'react';

export default function ProjectModal({ project, onClose }) {
  const open = project !== null;

  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id="projectModal"
      className="modal show backdrop-blur"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content backdrop-blur text-light" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <span className="close" role="button" aria-label="Close" onClick={onClose}>
          &times;
        </span>
        <h3 id="modalTitle">{project.title}</h3>
        {/* detailsHTML is authored content from src/data/projects.json */}
        <div id="modalBody" dangerouslySetInnerHTML={{ __html: project.detailsHTML ?? '' }} />
        <div id="modalLinks">
          {project.links.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
              {link.text}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
