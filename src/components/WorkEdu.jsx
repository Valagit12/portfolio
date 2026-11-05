import { useRef, useState } from 'react';
import { useSoftWipe } from './softWipe.js';
import { asset } from '../asset.js';

const timelines = {
  experience: [
    {
      logo: 'img/tmulogo.png',
      alt: 'Toronto Metropolitan University',
      title: 'Research Assistant',
      lines: ['Toronto Metropolitan University', 'Oct 2025 - Jun 2026'],
    },
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

function Pane({ items, className, paneRef }) {
  return (
    <div className={`swap-pane ps-3 ${className}`} ref={paneRef}>
      {items.map((item) => (
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
                <span className="tracking-sub" key={line}>
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// The box wipes between the two timelines (softWipe.js).
export default function WorkEdu() {
  const [active, setActive] = useState('experience');
  const rootRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const wipe = useSoftWipe({ rootRef, fromRef, toRef });

  const select = (id) => {
    setActive(id);
    wipe.set(id === 'education');
  };

  return (
    <section id="workedu" className="container section none">
      <div className="toggle-buttons mb-4 text-center">
        {tabs.map(({ id, label }, i) => (
          <button
            key={id}
            id={`${id}btn`}
            className={`btn btn-outline-light pointerall ${i === 0 ? 'me-2' : ''} ${active === id ? 'active' : ''}`}
            aria-pressed={active === id}
            onClick={() => select(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={rootRef} className="workedu-panel swap-stage mx-auto border border-light rounded-3">
        <Pane items={timelines.experience} className="swap-from" paneRef={fromRef} />
        <Pane items={timelines.education} className="swap-to" paneRef={toRef} />
      </div>
    </section>
  );
}
