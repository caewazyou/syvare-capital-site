document.addEventListener("DOMContentLoaded", function () {
  /* ==========================
     REVEAL ANIMATION
  ========================== */

  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealElements.forEach(function (el) {
      el.classList.add("visible");
    });
  }

  /* ==========================
     HERO IMAGE / VIDEO SLIDER
  ========================== */

  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");
  const nextBtn = document.querySelector(".hero-next");

  let current = 0;
  let sliderTimer = null;

  function stopVideos() {
    document.querySelectorAll(".hero-slide video").forEach(function (video) {
      video.pause();
      video.currentTime = 0;
    });
  }

  function playActiveVideo() {
    if (!slides.length) return;

    const activeVideo = slides[current].querySelector("video");

    if (activeVideo) {
      activeVideo.muted = true;
      activeVideo.playsInline = true;
      activeVideo.currentTime = 0;
      activeVideo.play().catch(function () {});
    }
  }

  function showSlide(index) {
    if (!slides.length || !dots.length) return;

    slides[current].classList.remove("active");
    dots[current].classList.remove("active");

    stopVideos();

    current = index;

    slides[current].classList.add("active");
    dots[current].classList.add("active");

    playActiveVideo();
    startAutoSlider();
  }

  function startAutoSlider() {
    if (slides.length <= 1) return;

    clearInterval(sliderTimer);

    sliderTimer = setInterval(function () {
      const next = (current + 1) % slides.length;
      showSlide(next);
    }, 9000);
  }

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      showSlide(Number(dot.dataset.slide));
    });
  });

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      const next = (current + 1) % slides.length;
      showSlide(next);
    });
  }

  playActiveVideo();
  startAutoSlider();

  /* ==========================
     APPLE-STYLE HERO SCROLL
  ========================== */

  function updateHeroScroll() {
    const hero = document.querySelector(".hero-slider");

    if (!hero || !slides.length) return;

    const rect = hero.getBoundingClientRect();
    const movement = rect.top * -0.45;

    slides.forEach(function (slide) {
      slide.style.setProperty("--hero-scroll", movement + "px");
    });
  }

  window.addEventListener("scroll", updateHeroScroll, { passive: true });
  window.addEventListener("resize", updateHeroScroll);
  updateHeroScroll();

  /* ==========================
     SERVICE IMAGE SCROLL
  ========================== */

  const homeImages = document.querySelectorAll(".home-service-band img");
  const serviceBands = document.querySelectorAll(".service-band");

  function updateServiceScrollEffects() {
    homeImages.forEach(function (img) {
      const section = img.closest(".home-service-band");
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const movement = rect.top * -0.28;

      img.style.transform = "translateY(" + movement + "px)";
    });

    serviceBands.forEach(function (section) {
      const rect = section.getBoundingClientRect();
      const movement = rect.top * -0.22;

      section.style.backgroundPosition = "center calc(50% + " + movement + "px)";
    });
  }

  window.addEventListener("scroll", updateServiceScrollEffects, { passive: true });
  window.addEventListener("resize", updateServiceScrollEffects);
  updateServiceScrollEffects();
});
