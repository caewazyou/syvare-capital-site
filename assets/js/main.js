document.addEventListener("DOMContentLoaded", function () {
  /* =====================================================
     REVEAL ANIMATION
  ===================================================== */

  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    revealElements.forEach(function (element) {
      observer.observe(element);
    });
  } else {
    revealElements.forEach(function (element) {
      element.classList.add("visible");
    });
  }

  /* =====================================================
     HERO SLIDER
  ===================================================== */

  const slider = document.querySelector(".hero-slider");
  const slides = Array.from(document.querySelectorAll(".hero-slide"));
  const dots = Array.from(document.querySelectorAll(".hero-dot"));
  const nextButton = document.querySelector(".hero-next");

  let currentSlide = 0;
  let sliderTimer = null;

  const SLIDE_TIME = 9000;

  /* -----------------------------------------------------
     VIDEO MANAGEMENT
  ----------------------------------------------------- */

  function pauseAllVideos() {
    slides.forEach(function (slide) {
      const video = slide.querySelector("video");

      if (video) {
        video.pause();
      }
    });
  }

  function playCurrentVideo() {
    if (!slides.length) return;

    const video = slides[currentSlide].querySelector("video");

    if (!video) return;

    video.muted = true;
    video.playsInline = true;

    try {
      video.currentTime = 0;
    } catch (error) {
      // Some browsers may not allow seeking before metadata loads.
    }

    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise.catch(function () {
        // Autoplay can occasionally be blocked.
      });
    }
  }

  /* Preload ONLY the next video instead of all videos */
  function preloadNextVideo() {
    if (!slides.length) return;

    const nextIndex = (currentSlide + 1) % slides.length;
    const nextVideo = slides[nextIndex].querySelector("video");

    if (!nextVideo) return;

    if (nextVideo.preload !== "auto") {
      nextVideo.preload = "auto";
      nextVideo.load();
    }
  }

  /* -----------------------------------------------------
     AUTO SLIDER
  ----------------------------------------------------- */

  function stopAutoSlider() {
    if (sliderTimer) {
      clearInterval(sliderTimer);
      sliderTimer = null;
    }
  }

  function startAutoSlider() {
    stopAutoSlider();

    if (slides.length <= 1) return;

    sliderTimer = setInterval(function () {
      showSlide(currentSlide + 1);
    }, SLIDE_TIME);
  }

  /* -----------------------------------------------------
     CHANGE SLIDE
  ----------------------------------------------------- */

  function showSlide(index, restartTimer = true) {
    if (!slides.length) return;

    const newIndex = (index + slides.length) % slides.length;

    if (newIndex === currentSlide && slides[newIndex].classList.contains("active")) {
      return;
    }

    pauseAllVideos();

    slides.forEach(function (slide, slideIndex) {
      slide.classList.toggle("active", slideIndex === newIndex);
    });

    dots.forEach(function (dot, dotIndex) {
      dot.classList.toggle("active", dotIndex === newIndex);
    });

    currentSlide = newIndex;

    playCurrentVideo();

    window.setTimeout(function () {
      preloadNextVideo();
    }, 300);

    if (restartTimer) {
      startAutoSlider();
    }
  }

  function nextSlide() {
    showSlide(currentSlide + 1);
  }

  function previousSlide() {
    showSlide(currentSlide - 1);
  }

  /* =====================================================
     DOT CONTROLS
  ===================================================== */

  dots.forEach(function (dot, index) {
    /* Click */
    dot.addEventListener("click", function (event) {
      event.stopPropagation();
      showSlide(index);
    });

    /* Desktop hover */
    dot.addEventListener("mouseenter", function () {
      showSlide(index);
    });

    /* Touch / pen */
    dot.addEventListener("pointerdown", function (event) {
      event.stopPropagation();
      showSlide(index);
    });
  });

  /* -----------------------------------------------------
     PRESS + DRAG ACROSS DOTS
     User can hold and slide across the dot controls.
  ----------------------------------------------------- */

  const dotsContainer = document.querySelector(".hero-dots");

  let draggingDots = false;

  if (dotsContainer) {
    dotsContainer.addEventListener("pointerdown", function (event) {
      draggingDots = true;

      if (dotsContainer.setPointerCapture) {
        try {
          dotsContainer.setPointerCapture(event.pointerId);
        } catch (error) {}
      }
    });

    dotsContainer.addEventListener("pointermove", function (event) {
      if (!draggingDots) return;

      const element = document.elementFromPoint(event.clientX, event.clientY);

      if (!element) return;

      const dot = element.closest(".hero-dot");

      if (!dot) return;

      const index = Number(dot.dataset.slide);

      if (!Number.isNaN(index) && index !== currentSlide) {
        showSlide(index);
      }
    });

    function stopDotDrag() {
      draggingDots = false;
    }

    dotsContainer.addEventListener("pointerup", stopDotDrag);
    dotsContainer.addEventListener("pointercancel", stopDotDrag);
  }

  /* =====================================================
     NEXT ARROW
  ===================================================== */

  if (nextButton) {
    nextButton.addEventListener("click", function (event) {
      event.stopPropagation();
      nextSlide();
    });
  }

  /* =====================================================
     PHONE / TABLET / MOUSE DRAG SWIPE
  ===================================================== */

  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerIsDown = false;

  const SWIPE_DISTANCE = 45;

  if (slider) {
    slider.addEventListener("pointerdown", function (event) {
      /*
       Do not start hero dragging when the user is
       interacting with controls.
      */
      if (event.target.closest(".hero-controls")) return;

      pointerIsDown = true;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
    });

    slider.addEventListener("pointerup", function (event) {
      if (!pointerIsDown) return;

      pointerIsDown = false;

      const differenceX = pointerStartX - event.clientX;
      const differenceY = pointerStartY - event.clientY;

      /*
       Ignore small movements.
      */
      if (Math.abs(differenceX) < SWIPE_DISTANCE) return;

      /*
       Ignore primarily vertical scrolling.
      */
      if (Math.abs(differenceY) > Math.abs(differenceX)) return;

      if (differenceX > 0) {
        nextSlide();
      } else {
        previousSlide();
      }
    });

    slider.addEventListener("pointercancel", function () {
      pointerIsDown = false;
    });

    slider.addEventListener("pointerleave", function (event) {
      if (event.pointerType === "mouse") {
        pointerIsDown = false;
      }
    });
  }

  /* =====================================================
     MACBOOK / LAPTOP TRACKPAD HORIZONTAL SWIPE
  ===================================================== */

  let trackpadLocked = false;
  let accumulatedDeltaX = 0;

  const TRACKPAD_THRESHOLD = 55;

  if (slider) {
    slider.addEventListener(
      "wheel",
      function (event) {
        /*
         Only respond to gestures that are primarily
         horizontal. Normal vertical page scrolling remains
         untouched.
        */
        const horizontalGesture =
          Math.abs(event.deltaX) > Math.abs(event.deltaY);

        if (!horizontalGesture) {
          accumulatedDeltaX = 0;
          return;
        }

        if (trackpadLocked) return;

        accumulatedDeltaX += event.deltaX;

        if (Math.abs(accumulatedDeltaX) < TRACKPAD_THRESHOLD) {
          return;
        }

        trackpadLocked = true;

        if (accumulatedDeltaX > 0) {
          nextSlide();
        } else {
          previousSlide();
        }

        accumulatedDeltaX = 0;

        window.setTimeout(function () {
          trackpadLocked = false;
        }, 650);
      },
      { passive: true }
    );
  }

  /* =====================================================
     OPTIMIZED APPLE-STYLE PARALLAX
  ===================================================== */

  const homeServiceImages = Array.from(
    document.querySelectorAll(".home-service-band img")
  );

  const serviceBands = Array.from(
    document.querySelectorAll(".service-band")
  );

  let scrollFrameRequested = false;

  /*
   One animation-frame handler controls ALL scroll effects.

   This is much smoother than having several independent
   scroll listeners constantly changing CSS.
  */

  function updateScrollEffects() {
    scrollFrameRequested = false;

    /* --------------------------
       HERO PARALLAX
    -------------------------- */

    if (slider && slides.length) {
      const heroRect = slider.getBoundingClientRect();

      /*
       Limit movement so the browser does not have to
       render unnecessarily huge transformations.
      */
      let heroMovement = heroRect.top * -0.32;

      heroMovement = Math.max(-160, Math.min(160, heroMovement));

      slides.forEach(function (slide) {
        slide.style.setProperty(
          "--hero-scroll",
          heroMovement.toFixed(2) + "px"
        );
      });
    }

    /* --------------------------
       HOMEPAGE SERVICE IMAGES
    -------------------------- */

    homeServiceImages.forEach(function (image) {
      const section = image.closest(".home-service-band");

      if (!section) return;

      const rect = section.getBoundingClientRect();

      /*
       Skip sections far outside the viewport.
       This reduces unnecessary rendering work.
      */
      if (
        rect.bottom < -300 ||
        rect.top > window.innerHeight + 300
      ) {
        return;
      }

      let movement = rect.top * -0.15;

      movement = Math.max(-120, Math.min(120, movement));

      image.style.transform =
        "translate3d(0, " + movement.toFixed(2) + "px, 0)";
    });

    /* --------------------------
       SERVICES PAGE BACKGROUND
    -------------------------- */

    serviceBands.forEach(function (section) {
      const rect = section.getBoundingClientRect();

      if (
        rect.bottom < -300 ||
        rect.top > window.innerHeight + 300
      ) {
        return;
      }

      let movement = rect.top * -0.10;

      movement = Math.max(-90, Math.min(90, movement));

      section.style.backgroundPosition =
        "center calc(50% + " +
        movement.toFixed(2) +
        "px)";
    });
  }

  function requestScrollUpdate() {
    if (scrollFrameRequested) return;

    scrollFrameRequested = true;

    requestAnimationFrame(updateScrollEffects);
  }

  window.addEventListener("scroll", requestScrollUpdate, {
    passive: true,
  });

  window.addEventListener("resize", requestScrollUpdate, {
    passive: true,
  });

  /*
   Initial render
  */
  requestScrollUpdate();

  /* =====================================================
     PAGE VISIBILITY / PERFORMANCE
  ===================================================== */

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopAutoSlider();
      pauseAllVideos();
    } else {
      playCurrentVideo();
      startAutoSlider();
    }
  });

  /* =====================================================
     INITIALIZE HERO
  ===================================================== */

  if (slides.length) {
    slides.forEach(function (slide, index) {
      slide.classList.toggle("active", index === 0);
    });

    dots.forEach(function (dot, index) {
      dot.classList.toggle("active", index === 0);
    });

    currentSlide = 0;

    playCurrentVideo();

    window.setTimeout(function () {
      preloadNextVideo();
    }, 500);

    startAutoSlider();
  }
});