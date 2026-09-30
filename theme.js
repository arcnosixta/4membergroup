// Батырма басылғанда режим мен батырманың мәтіні өзгереді.
const themeToggle = document.getElementById("theme-toggle");

themeToggle.addEventListener("click", function () {
  const isDark = document.body.classList.toggle("dark-mode");

  themeToggle.textContent = isDark
    ? "☀️ Ашық режим"
    : "🌙 Қараңғы режим";
});
