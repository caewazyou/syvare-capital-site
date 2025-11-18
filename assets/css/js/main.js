document.addEventListener("DOMContentLoaded", () => {
    const els = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
        els.forEach(e => e.classList.add("visible"));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    els.forEach(e => observer.observe(e));
});