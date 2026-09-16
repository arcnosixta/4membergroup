// copy phone number
const copyBtn = document.getElementById('copy-btn');
const copyLabel = document.getElementById('copy-label');
const phone = '+7 877 507 6751';
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(phone.replace(/\s/g, ''));
  } catch (e) {
    // clipboard unavailable — fail silently, number is still visible
  }
  copyBtn.classList.add('copied');
  copyLabel.textContent = 'Скопировано';
  setTimeout(() => {
    copyBtn.classList.remove('copied');
    copyLabel.textContent = phone;
  }, 1800);
});

// scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

// active nav link while scrolling to numbers section
const numbersSection = document.getElementById('numbers');
const numbersLink = document.querySelector('a[href="#numbers"]');
const teamLink = document.querySelector('.nav-link.active');
const navIo = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      numbersLink.classList.add('active');
      teamLink.classList.remove('active');
    } else {
      numbersLink.classList.remove('active');
      teamLink.classList.add('active');
    }
  });
}, { threshold: 0.4 });
navIo.observe(numbersSection);
