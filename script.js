const projects = await fetch('./projects.json').then(data => data.json());
const projectsGrid = document.querySelector('.projects-grid');

projects.forEach(project => {
    const card = document.createElement('article');
    card.className = 'project-card';

    const title = `<h3>${project.title}</h3>`;
    const summary = `<p>${project.summary}</p>`;
    const links = project.links.map(link => `<a href="${link.href}" target="_blank">${link.text}</a>`).join('');
    const details = `<div class="project-details-hidden hidden">${project.detailsHTML}</div>`;

    card.innerHTML = title + summary + links + details;
    projectsGrid.appendChild(card);
});

const modal = document.getElementById('projectModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalLinks = document.getElementById('modalLinks');
const closeBtn = document.querySelector('.close');

document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (event) => {

        if (event.target.tagName.toLowerCase() === 'a') return;  // reject opening modal if its an a tag
        
        const detailsHidden = card.querySelector('.project-details-hidden');
        const links = card.querySelectorAll('a');

        modalTitle.textContent = card.querySelector('h3').textContent;

        modalBody.innerHTML = '';
        if (detailsHidden) {
            const contentClone = detailsHidden.cloneNode(true);
            contentClone.classList.remove('hidden');
            modalBody.appendChild(contentClone);
        }

        modalLinks.innerHTML = '';
        links.forEach(link => {
            const newLink = link.cloneNode(true);
            modalLinks.appendChild(newLink);
        });

        modal.classList.add('show');

        event.stopPropagation();
    });
});


closeBtn.onclick = () => modal.classList.remove('show');
window.onclick = (event) => {
    if (event.target === modal) modal.classList.remove('show');
};

//scroll to get rid of menu bar
let lastScrollY = window.scrollY;
const header = document.querySelector('.site-header');

window.addEventListener('scroll', () => {
    if (window.scrollY > lastScrollY) {
        header.style.transform = 'translateY(-100%)';
    } else {
        header.style.transform = 'translateY(0)';
    }
    lastScrollY = window.scrollY;
});
