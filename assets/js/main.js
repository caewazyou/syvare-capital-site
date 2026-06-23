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

  const slider = document.querySelector(".hero-slider");
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

    current = (index + slides.length) % slides.length;

    slides[current].classList.add("active");
    dots[current].classList.add("active");

    playActiveVideo();
    startAutoSlider();
  }

  function nextSlide() {
    showSlide(current + 1);
  }

  function previousSlide() {
    showSlide(current - 1);
  }

  function startAutoSlider() {
    if (slides.length <= 1) return;

    clearInterval(sliderTimer);

    sliderTimer = setInterval(function () {
      nextSlide();
    }, 9000);
  }

  dots.forEach(function (dot) {
  const targetSlide = Number(dot.dataset.slide);

  dot.addEventListener("click", function () {
    showSlide(targetSlide);
  });

  dot.addEventListener("mouseenter", function () {
    showSlide(targetSlide);
  });
});
  
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      nextSlide();
    });
  }

/* ==========================
   SWIPE + DRAG SUPPORT
========================== */

let swipeStartX = 0;

if (slider) {
  slider.addEventListener("pointerdown", function (e) {
    swipeStartX = e.clientX;
  });

  slider.addEventListener("pointerup", function (e) {
    const swipeEndX = e.clientX;
    const diff = swipeStartX - swipeEndX;

    if (Math.abs(diff) < 50) return;

    if (diff > 0) {
      nextSlide();
    } else {
      previousSlide();
    }
  });

  /* MacBook / laptop trackpad horizontal swipe */
  let wheelLock = false;

  slider.addEventListener("wheel", function (e) {
    if (wheelLock) return;

    if (Math.abs(e.deltaX) > 40) {
      wheelLock = true;

      if (e.deltaX > 0) {
        nextSlide();
      } else {
        previousSlide();
      }

      setTimeout(function () {
        wheelLock = false;
      }, 700);
    }
  }, { passive: true });
}

playActiveVideo();
startAutoSlider();

  /* ==========================
     APPLE-STYLE HERO SCROLL
  ========================== */

  function updateHeroScroll() {
    if (!slider || !slides.length) return;

    const rect = slider.getBoundingClientRect();
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
