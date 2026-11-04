import { useEffect, useState } from 'react';
import { asset } from '../asset.js';

const timelines = {
  experience: [
    {
      logo: 'img/eccclogo.png',
      alt: 'Environment & Climate Change Canada',
      title: 'Part-Time Software Developer',
      lines: ['Environment & Climate Change Canada', 'Oct 2023 - May 2024'],
    },
    {
      logo: 'img/eccclogo.png',
      alt: 'Environment & Climate Change Canada',
      title: 'Software Developer Intern',
      lines: ['Environment & Climate Change Canada', 'May 2022 - Aug 2023'],
    },
  ],
  education: [
    {
      logo: 'img/tmulogo.png',
      alt: 'Toronto Metropolitan University',
      title: 'Bachelor of Science, Computer Science',
      lines: ['Minor in Mathematics', 'Toronto Metropolitan University', 'Sept 2020 – June 2025'],
    },
  ],
};

const tabs = [
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
];

export default function WorkEdu() {
  const [active, setActive] = useState('experience'); // highlighted button
  const [shown, setShown] = useState('experience'); // panel currently rendered
  const [visible, setVisible] = useState(true);

  // Fade the new panel in once it has been rendered at opacity 0
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [shown]);

  const select = (id) => {
    if (id === active) return;
    setActive(id);
    setVisible(false);
  };

  const handleTransitionEnd = () => {
    if (!visible) setShown(active);
  };

  return (
    <section id="workedu" className="container section none">
      <div className="toggle-buttons mb-4 text-center">
        {tabs.map(({ id, label }, i) => (
          <button
            key={id}
            id={`${id}btn`}
            className={`btn btn-outline-light pointerall ${i === 0 ? 'me-2' : ''} ${active === id ? 'active' : ''}`}
            onClick={() => select(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        id={shown}
        className="workedu-panel mx-auto border border-light rounded-3 ps-3 pb-0 pt-0"
        style={{ opacity: visible ? 1 : 0 }}
        onTransitionEnd={handleTransitionEnd}
      >
        {timelines[shown].map((item) => (
          <div className="row" key={item.title}>
            <div className="col-2 col-md-1 col-lg-1">
              <div className="timeline">
                <div className="tracking-icon">
                  <img src={asset(item.logo)} alt={item.alt} className="icon-image" />
                </div>
              </div>
            </div>
            <div className="tracking-item col-10 col-md-11 col-lg-11">
              <div className="bg-transparent">
                {item.title}
                {item.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
