import { asset } from '../asset.js';

const socials = [
  { href: 'mailto:valareza.arezehgar@gmail.com', icon: 'bi-envelope-fill', label: 'Email' },
  { href: 'https://www.linkedin.com/in/valareza-arezehgar/', icon: 'bi-linkedin', label: 'LinkedIn' },
  { href: 'https://github.com/Valagit12', icon: 'bi-github', label: 'GitHub' },
];

export default function About() {
  return (
    <header>
      <section className="container my-5 py-5 z-i none">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-center gap-5">
          <div>
            <div
              className="rounded-circle overflow-hidden bg-secondary mx-auto align-items-center"
              style={{ width: 200, height: 200 }}
            >
              <img
                src={asset('img/headshot.webp')}
                alt="Profile Picture"
                className="img-fluid w-100 h-100 object-fit-cover"
              />
            </div>

            <div className="text-center">
              <h1 className="name text-secondary display-4 mb-2 pointerall">
                <span className="replacement">Hi! I'm Vala 🙂</span>
                <span className="original">Valareza Arezehgar</span>
              </h1>

              <p className="text-light fs-5 mb-3">📍 Toronto, Canada</p>

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
