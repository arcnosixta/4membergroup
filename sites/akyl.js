// akyl.js
// Kuat Akylbek - Resume interactivity
// Animates the language progress bars when the page loads.

document.addEventListener("DOMContentLoaded", function () {

    const bars = document.querySelectorAll(".language-progress");

    bars.forEach(function (bar) {

        const targetWidth = bar.style.width || getComputedStyle(bar).width;

        // Read the final width from CSS classes (kazakh / russian)
        const finalWidth = bar.classList.contains("kazakh")
            ? "100%"
            : bar.classList.contains("russian")
                ? "90%"
                : targetWidth;

        // Start from 0 and animate to the final width
        bar.style.width = "0%";

        setTimeout(function () {
            bar.style.transition = "width 1.2s ease";
            bar.style.width = finalWidth;
        }, 200);

    });

});
