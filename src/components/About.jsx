import { useRef } from 'react';
import { asset } from '../asset.js';
import TransformingName from './TransformingName.jsx';

const socials = [
  { href: 'mailto:valareza.arezehgar@gmail.com', icon: 'bi-envelope-fill', label: 'Email' },
  { href: 'https://www.linkedin.com/in/valareza-arezehgar/', icon: 'bi-linkedin', label: 'LinkedIn' },
  { href: 'https://github.com/Valagit12', icon: 'bi-github', label: 'GitHub' },
];

export default function About() {
  const photoRef = useRef(null); // hovering the photo transforms the name too
  return (
    <header>
      <section className="container mt-5 pt-5 z-i none">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-center gap-5">
          <div>
            <div
              ref={photoRef}
              className="rounded-circle overflow-hidden bg-secondary mx-auto align-items-center pointerall"
              style={{ width: 200, height: 200 }}
            >
              <img
                src={asset('img/headshot.webp')}
                alt="Profile Picture"
                className="img-fluid w-100 h-100 object-fit-cover"
              />
            </div>

            <div className="text-center" style={{ marginTop: '0.75rem' }}>
              <TransformingName
                text="Valareza Arezehgar"
                altText="Hi! I'm Vala 🙂"
                className="text-secondary display-4 mb-2 pointerall"
                triggerRef={photoRef}
              />

              <p className="text-light fs-5 mb-3">
                <i className="bi bi-geo-alt-fill text-secondary me-1"></i>Toronto, Canada
              </p>

              <div className="d-flex justify-content-center gap-3 fs-4 mb-3">
                {socials.map(({ href, icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    className="text-decoration-none text-light pointerall"
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                  >
                    <i className={`bi ${icon}`}></i>
                  </a>
                ))}
              </div>

              <a href={asset('img/resume.pdf')} className="btn btn-outline-secondary z-i pointerall" download>
                Download Resume
              </a>
            </div>
          </div>
        </div>
      </section>
    </header>
  );
}
