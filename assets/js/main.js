document.addEventListener("DOMContentLoaded", function () {

  /* =====================================================
     REVEAL
  ===================================================== */

  const revealElements =
    document.querySelectorAll(".reveal");


  if ("IntersectionObserver" in window) {

    const observer =
      new IntersectionObserver(
        function (entries) {

          entries.forEach(function (entry) {

            if (entry.isIntersecting) {

              entry.target.classList.add("visible");

              observer.unobserve(entry.target);

            }

          });

        },
        {
          threshold: 0.08,
          rootMargin: "0px 0px -30px 0px"
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
     HERO
  ===================================================== */

  const slider =
    document.querySelector(".hero-slider");


  if (!slider) return;


  const slides =
    Array.from(
      slider.querySelectorAll(".hero-slide")
    );


  const dots =
    Array.from(
      slider.querySelectorAll(".hero-dot")
    );


  const dotsContainer =
    slider.querySelector(".hero-dots");


  const nextButton =
    slider.querySelector(".hero-next");


  const heroMedia =
    Array.from(
      slider.querySelectorAll(".hero-media")
    );


  const serviceImages =
    Array.from(
      document.querySelectorAll(
        ".home-service-band > img"
      )
    );


  if (!slides.length) return;



  /* =====================================================
     SETTINGS
  ===================================================== */

  const SLIDE_DURATION = 9000;

  const SWIPE_THRESHOLD = 45;

  const TRACKPAD_THRESHOLD = 50;


  let currentSlide = 0;

  let autoTimer = null;

  let pageVisible = true;



  /* =====================================================
     VIDEO
  ===================================================== */

  function getVideo(index) {

    if (!slides[index]) return null;

    return slides[index].querySelector("video");

  }



  function pauseVideo(index) {

    const video = getVideo(index);

    if (!video) return;

    video.pause();

  }



  function pauseInactiveVideos() {

    slides.forEach(function (slide, index) {

      if (index === currentSlide) return;

      const video =
        slide.querySelector("video");

      if (video) {

        video.pause();

      }

    });

  }



  function playCurrentVideo() {

    const video =
      getVideo(currentSlide);


    if (!video) return;


    video.muted = true;

    video.playsInline = true;


    /*
      Start from beginning when
      returning to a video.
    */

    try {

      video.currentTime = 0;

    } catch (error) {}


    const promise =
      video.play();


    if (
      promise &&
      typeof promise.catch === "function"
    ) {

      promise.catch(function () {});

    }

  }



  /* =====================================================
     VIDEO PRELOADING
  ===================================================== */

  function preloadVideo(index) {

    const video =
      getVideo(index);


    if (!video) return;


    /*
      Important:
      preload actual video data rather
      than metadata only.
    */

    if (video.preload !== "auto") {

      video.preload = "auto";

      video.load();

    }

  }



  function preloadUpcomingVideos() {

    const next =
      (currentSlide + 1) %
      slides.length;


    const secondNext =
      (currentSlide + 2) %
      slides.length;


    setTimeout(function () {

      preloadVideo(next);

    }, 100);


    setTimeout(function () {

      preloadVideo(secondNext);

    }, 700);

  }



  /* =====================================================
     TIMER
  ===================================================== */

  function stopAutoSlider() {

    if (!autoTimer) return;


    clearTimeout(autoTimer);

    autoTimer = null;

  }



  function startAutoSlider() {

    stopAutoSlider();


    if (
      !pageVisible ||
      slides.length <= 1
    ) {
      return;
    }


    autoTimer =
      setTimeout(function () {

        nextSlide();

      }, SLIDE_DURATION);

  }



  /* =====================================================
     SLIDE CHANGE
  ===================================================== */

  function showSlide(index) {

    const newIndex =
      (
        index +
        slides.length
      ) %
      slides.length;


    if (
      newIndex === currentSlide
    ) {

      startAutoSlider();

      return;

    }


    const oldIndex =
      currentSlide;


    pauseVideo(oldIndex);


    slides[oldIndex]
      .classList
      .remove("active");


    if (dots[oldIndex]) {

      dots[oldIndex]
        .classList
        .remove("active");

    }


    currentSlide =
      newIndex;


    slides[currentSlide]
      .classList
      .add("active");


    if (dots[currentSlide]) {

      dots[currentSlide]
        .classList
        .add("active");

    }


    pauseInactiveVideos();


    playCurrentVideo();


    preloadUpcomingVideos();


    startAutoSlider();

  }



  function nextSlide() {

    showSlide(
      currentSlide + 1
    );

  }



  function previousSlide() {

    showSlide(
      currentSlide - 1
    );

  }



  /* =====================================================
     DOTS
  ===================================================== */

  dots.forEach(function (dot, index) {

    dot.addEventListener(
      "click",
      function (event) {

        event.stopPropagation();

        showSlide(index);

      }
    );


    /*
      Hover slide changing for
      laptops/desktops.
    */

    dot.addEventListener(
      "mouseenter",
      function () {

        if (
          window
            .matchMedia("(hover: hover)")
            .matches
        ) {

          showSlide(index);

        }

      }
    );

  });



  /* =====================================================
     PRESS + HOLD + DRAG DOTS
  ===================================================== */

  let draggingDots = false;


  if (dotsContainer) {

    dotsContainer.addEventListener(
      "pointerdown",
      function (event) {

        draggingDots = true;


        try {

          dotsContainer
            .setPointerCapture(
              event.pointerId
            );

        } catch (error) {}

      }
    );


    dotsContainer.addEventListener(
      "pointermove",
      function (event) {

        if (!draggingDots) return;


        const element =
          document.elementFromPoint(
            event.clientX,
            event.clientY
          );


        if (!element) return;


        const dot =
          element.closest(".hero-dot");


        if (!dot) return;


        const index =
          Number(
            dot.dataset.slide
          );


        if (
          Number.isInteger(index) &&
          index !== currentSlide
        ) {

          showSlide(index);

        }

      }
    );


    function stopDotDrag() {

      draggingDots = false;

    }


    dotsContainer.addEventListener(
      "pointerup",
      stopDotDrag
    );


    dotsContainer.addEventListener(
      "pointercancel",
      stopDotDrag
    );

  }



  /* =====================================================
     NEXT BUTTON
  ===================================================== */

  if (nextButton) {

    nextButton.addEventListener(
      "click",
      function (event) {

        event.stopPropagation();

        nextSlide();

      }
    );

  }



  /* =====================================================
     TOUCH / MOUSE SWIPE
  ===================================================== */

  let pointerActive = false;

  let startX = 0;

  let startY = 0;



  slider.addEventListener(
    "pointerdown",
    function (event) {

      if (
        event.target.closest(
          ".hero-controls"
        )
      ) {
        return;
      }


      pointerActive = true;


      startX =
        event.clientX;


      startY =
        event.clientY;

    }
  );



  slider.addEventListener(
    "pointerup",
    function (event) {

      if (!pointerActive) return;


      pointerActive = false;


      const differenceX =
        startX -
        event.clientX;


      const differenceY =
        startY -
        event.clientY;


      if (
        Math.abs(differenceX) <
        SWIPE_THRESHOLD
      ) {
        return;
      }


      /*
        Vertical scroll remains normal.
      */

      if (
        Math.abs(differenceY) >
        Math.abs(differenceX)
      ) {
        return;
      }


      if (differenceX > 0) {

        nextSlide();

      } else {

        previousSlide();

      }

    }
  );



  slider.addEventListener(
    "pointercancel",
    function () {

      pointerActive = false;

    }
  );



  /* =====================================================
     MACBOOK TRACKPAD
  ===================================================== */

  let accumulatedX = 0;

  let trackpadLocked = false;



  slider.addEventListener(
    "wheel",
    function (event) {

      /*
        Ignore normal vertical
        scrolling.
      */

      if (
        Math.abs(event.deltaX) <=
        Math.abs(event.deltaY)
      ) {

        accumulatedX = 0;

        return;

      }


      if (trackpadLocked) return;


      accumulatedX +=
        event.deltaX;


      if (
        Math.abs(accumulatedX) <
        TRACKPAD_THRESHOLD
      ) {
        return;
      }


      trackpadLocked = true;


      if (accumulatedX > 0) {

        nextSlide();

      } else {

        previousSlide();

      }


      accumulatedX = 0;


      setTimeout(function () {

        trackpadLocked = false;

      }, 600);

    },

    {
      passive: true
    }
  );



  /* =====================================================
     SMOOTH PARALLAX + ZOOM
  ===================================================== */

  let animationFrame = null;



  function renderScrollEffects() {

    animationFrame = null;


    /* =================================================
       HERO
    ================================================= */

    const heroRect =
      slider.getBoundingClientRect();


    if (
      heroRect.bottom > 0 &&
      heroRect.top <
      window.innerHeight
    ) {

      /*
        Progress from 0 to 1 as
        hero leaves viewport.
      */

      let progress =
        -heroRect.top /
        heroRect.height;


      progress =
        Math.max(
          0,
          Math.min(1, progress)
        );


      /*
        Vertical cinematic movement.
      */

      const movement =
        progress * 75;


      /*
        Subtle zoom.

        1.00 -> 1.06
      */

      const scale =
        1 +
        progress * 0.06;


      heroMedia.forEach(
        function (media) {

          media.style.transform =
            "translate3d(0," +
            movement.toFixed(1) +
            "px,0) " +
            "scale(" +
            scale.toFixed(4) +
            ")";

        }
      );

    }



    /* =================================================
       SERVICE IMAGE MOVEMENT
    ================================================= */

    serviceImages.forEach(
      function (image) {

        const section =
          image.closest(
            ".home-service-band"
          );


        if (!section) return;


        const rect =
          section
            .getBoundingClientRect();


        /*
          Larger buffer means the browser
          prepares the image before it
          enters the screen.
        */

        if (
          rect.bottom < -600 ||
          rect.top >
          window.innerHeight + 600
        ) {
          return;
        }


        const totalDistance =
          window.innerHeight +
          rect.height;


        let progress =
          (
            window.innerHeight -
            rect.top
          ) /
          totalDistance;


        progress =
          Math.max(
            0,
            Math.min(1, progress)
          );


        /*
          Parallax movement.
        */

        const movement =
          (
            progress -
            0.5
          ) *
          90;


        /*
          Slow cinematic zoom.

          1.04 -> 1.09
        */

        const scale =
          1.04 +
          progress *
          0.05;


        image.style.transform =
          "translate3d(0," +
          movement.toFixed(1) +
          "px,0) " +
          "scale(" +
          scale.toFixed(4) +
          ")";

      }
    );

  }



  function requestScrollRender() {

    if (
      animationFrame !== null
    ) {
      return;
    }


    animationFrame =
      requestAnimationFrame(
        renderScrollEffects
      );

  }



  window.addEventListener(
    "scroll",
    requestScrollRender,
    {
      passive: true
    }
  );


  window.addEventListener(
    "resize",
    requestScrollRender,
    {
      passive: true
    }
  );



  /* =====================================================
     PAGE VISIBILITY
  ===================================================== */

  document.addEventListener(
    "visibilitychange",
    function () {

      pageVisible =
        !document.hidden;


      if (!pageVisible) {

        stopAutoSlider();


        slides.forEach(
          function (slide) {

            const video =
              slide.querySelector(
                "video"
              );


            if (video) {

              video.pause();

            }

          }
        );

      } else {

        playCurrentVideo();

        startAutoSlider();

        requestScrollRender();

      }

    }
  );



  /* =====================================================
     INITIALIZE
  ===================================================== */

  slides.forEach(
    function (slide, index) {

      slide.classList.toggle(
        "active",
        index === 0
      );

    }
  );


  dots.forEach(
    function (dot, index) {

      dot.classList.toggle(
        "active",
        index === 0
      );

    }
  );


  currentSlide = 0;


  /*
    Video 1 begins buffering immediately.
  */

  preloadVideo(1);


  /*
    Give the browser a moment before
    starting Video 2.
  */

  setTimeout(function () {

    preloadVideo(2);

  }, 1000);


  /*
    Start Video 3 shortly afterwards.
  */

  setTimeout(function () {

    preloadVideo(3);

  }, 3000);


  /*
    Video 4 can load last.
  */

  setTimeout(function () {

    preloadVideo(4);

  }, 5000);


  startAutoSlider();


  requestScrollRender();

});
