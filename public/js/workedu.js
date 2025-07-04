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



//   const otherId = id === 'experience' ? 'education' : 'experience';
//   const current = document.getElementById(otherId);
//   const target  = document.getElementById(id);

//   current.style.opacity = 0;
//   current.addEventListener('transitionend', function handler(event) {
//     if (event.propertyName !== 'opacity') return;
//     // 1) Hide it after fade-out
//     current.style.display = 'none';
//     current.removeEventListener('transitionend', handler);

//     // 2) Prepare the new panel off-screen
//     target.style.display = 'block';
//     target.style.opacity = 0;
//     // force reflow so the browser notices opacity=0 before we bump to 1
//     void target.offsetWidth;

//     // 3) Fade in the new panel
//     target.style.opacity = 1;
//   }, { once: true });

  // Update button states immediately
//   document
//     .querySelectorAll('.toggle-buttons .btn')
//     .forEach(btn => btn.classList.remove('active'));
//   if (clickedBtn) clickedBtn.classList.add('active');
}
