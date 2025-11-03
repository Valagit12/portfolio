
const projectsGrid = document.querySelector('.projects-grid');
const modal = document.getElementById('projectModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalLinks = document.getElementById('modalLinks');
const closeBtn = document.querySelector('.close');

async function loadProjects() {
  try {
    const projects = await fetch('json/projects.json').then(r => r.json());

    projects.forEach(project => {
      const card = document.createElement('article');
      card.className = 'project-card none pointerall';

      const titleHTML = `<h3>${project.title}</h3>`;
      const summaryHTML = `<p>${project.summary}</p>`;
      const stackHTML = `<p class="tech-stack text-secondary"><strong>Stack:</strong> ${project.techStack.join(', ')}</p>`;

      card.innerHTML = titleHTML + summaryHTML + stackHTML;
      projectsGrid.appendChild(card);

      card.addEventListener('click', event => {
        if (event.target.tagName.toLowerCase() === 'a') return;

        modalTitle.textContent = project.title;

        modalBody.innerHTML = '';
        if (project.detailsHTML) {
          const detailsWrapper = document.createElement('div');
          detailsWrapper.innerHTML = project.detailsHTML;
          modalBody.appendChild(detailsWrapper);
        }

        modalLinks.innerHTML = '';
        project.links.forEach(link => {
          const a = document.createElement('a');
          a.href = link.href;
          a.target = '_blank';
          a.textContent = link.text;
          modalLinks.appendChild(a);
        });

        modal.classList.add('show');
        lockScroll();
      });
    });
  } catch (e) {
    console.warn('Failed to load projects.json:', e);
  }
}

window.addEventListener('load', () => {
  setTimeout(loadProjects, 1);
});


closeBtn.addEventListener('click', () => {
  modal.classList.remove('show');
  unlockScroll();
});

closeBtn.onclick = () => modal.classList.remove('show');
window.onclick = (event) => {
  if (event.target === modal) {
    modal.classList.remove('show');
    unlockScroll();
  }
};


const canvas = document.getElementById('fluid');

let config = {
  CAPTURE_RESOLUTION: 512,
  PRESSURE_ITERATIONS: 1,
  SHADING: false,
  COLOR_UPDATE_SPEED: 3,
  PAUSED: false,
  IMMEDIATE: true,
  AUTO: false,
  BLOOM: false,
};

const fluid = WebGLFluid(canvas, config);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let scrollY = 0;

function lockScroll() {
  document.documentElement.style.overflow = 'hidden';
}

function unlockScroll() {
  document.documentElement.style.overflow = '';
}

