
const projects = await fetch('json/projects.json').then(r => r.json());

const projectsGrid = document.querySelector('.projects-grid');
const modal       = document.getElementById('projectModal');
const modalTitle  = document.getElementById('modalTitle');
const modalBody   = document.getElementById('modalBody');
const modalLinks  = document.getElementById('modalLinks');
const closeBtn    = document.querySelector('.close');

projects.forEach(project => {
  // build card
  const card = document.createElement('article');
  card.className = 'project-card none pointerall';

  const titleHTML   = `<h3>${project.title}</h3>`;
  const summaryHTML = `<p>${project.summary}</p>`;
  const stackHTML   = `<p class="tech-stack text-secondary"><strong>Stack:</strong> ${project.techStack.join(', ')}</p>`;

  card.innerHTML = titleHTML + summaryHTML + stackHTML;
  projectsGrid.appendChild(card);

  // click handler: populate modal with details + links
  card.addEventListener('click', event => {
    // ignore clicks on future <a> inside card (we've got none now, but just in case)
    if (event.target.tagName.toLowerCase() === 'a') return;

    // set title
    modalTitle.textContent = project.title;

    // set detailsHTML (if any)
    modalBody.innerHTML = '';
    if (project.detailsHTML) {
      const detailsWrapper = document.createElement('div');
      detailsWrapper.innerHTML = project.detailsHTML;
      modalBody.appendChild(detailsWrapper);
    }

    // set links
    modalLinks.innerHTML = '';
    project.links.forEach(link => {
      const a = document.createElement('a');
      a.href        = link.href;
      a.target      = '_blank';
      a.textContent = link.text;
      modalLinks.appendChild(a);
    });

    // show modal
    modal.classList.add('show');
    lockScroll();
  });
});

// close button (if needed)
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

// 4) instantiate the sim _before_ you ever call .resize()
const fluid = WebGLFluid(canvas, config);

// // 5) keep the drawing buffer in sync with CSS size
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

