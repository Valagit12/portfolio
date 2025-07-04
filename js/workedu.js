function showSection(id, clickedBtn) {
    const otherId = id === 'experience' ? 'education' : 'experience';
    const otherBtn = document.getElementById(otherId+'btn');
    const otherElement = document.getElementById(id);
    const currentElement = document.getElementById(otherId);

    currentElement.style.opacity = 0;

    currentElement.addEventListener('transitionend', function handler(event) {
        currentElement.style.display = 'none';
        currentElement.removeEventListener('transitionend', handler)
        
        otherElement.style.display = 'block';
        void otherElement.offsetWidth;

        otherElement.style.opacity = 1;


    });

    clickedBtn.classList.add('active');
    otherBtn.classList.remove('active');
}
