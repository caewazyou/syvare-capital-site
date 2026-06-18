document.addEventListener("DOMContentLoaded", function () {
  /* Reveal animation */
  const els = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    els.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    els.forEach(function (el) {
      el.classList.add("visible");
    });
  }

  /* Apple-style scroll movement */
  const heroParallax = document.querySelector(".hero-parallax");
  const homeImages = document.querySelectorAll(".home-service-band img");
  const serviceBands = document.querySelectorAll(".service-band");

  function updateScrollEffects() {
    const scrollY = window.scrollY;

    /* Hero image scroll movement */
    if (heroParallax) {
      heroParallax.style.transform = `translateY(${scrollY * 0.22}px)`;
    }

    /* Home page service image movement */
    homeImages.forEach(function (img) {
      const parent = img.closest(".home-service-band");
      const rect = parent.getBoundingClientRect();
      const movement = rect.top * -0.12;
      img.style.transform = `translateY(${movement}px)`;
    });

    /* Our Work page background movement */
    serviceBands.forEach(function (section) {
      const rect = section.getBoundingClientRect();
      const movement = rect.top * -0.10;
      section.style.backgroundPosition = `center calc(50% + ${movement}px)`;
    });
  }

  window.addEventListener("scroll", updateScrollEffects, { passive: true });
  window.addEventListener("resize", updateScrollEffects);
  updateScrollEffects();
});