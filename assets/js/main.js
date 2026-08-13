document.addEventListener("DOMContentLoaded", function () {

  "use strict";


  /* =========================================================
     INTRO
  ========================================================= */

  const intro =
    document.getElementById("syvare-intro");

  const INTRO_DURATION = 10000;


  function finishIntro() {

    if (!intro) {
      return;
    }

    intro.classList.add("intro-finished");

    document.body.classList.remove("intro-running");
    document.body.classList.add("intro-ready");

    /*
      Save for this browser tab/session so navigating
      back to Home doesn't replay a 10-second intro.
    */

    try {
      sessionStorage.setItem(
        "syvareIntroSeen",
        "true"
      );
    } catch (error) {
      /* Ignore storage errors */
    }


    setTimeout(function () {

      intro.style.display = "none";

    }, 1300);
  }


  if (intro) {

    let introSeen = false;

    try {

      introSeen =
        sessionStorage.getItem(
          "syvareIntroSeen"
        ) === "true";

    } catch (error) {

      introSeen = false;
    }


    if (introSeen) {

      intro.style.display = "none";

      document.body.classList.add(
        "intro-ready"
      );

    } else {

      document.body.classList.add(
        "intro-running"
      );

      setTimeout(
        finishIntro,
        INTRO_DURATION
      );
    }

  } else {

    document.body.classList.add(
      "intro-ready"
    );
  }



  /* =========================================================
     REVEAL ANIMATION
  ========================================================= */

  const revealElements =
    document.querySelectorAll(".reveal");


  if ("IntersectionObserver" in window) {

    const revealObserver =
      new IntersectionObserver(
        function (entries) {

          entries.forEach(
            function (entry) {

              if (entry.isIntersecting) {

                entry.target.classList.add(
                  "visible"
                );

                /*
                  Once visible, it stays visible.
                  This prevents images/sections disappearing
                  when scrolling back up or down.
                */

                revealObserver.unobserve(
                  entry.target
                );
              }
            }
          );

        },
        {
          threshold: 0.04,

          /*
            Load/reveal before the element actually
            reaches the visible screen.
          */

          rootMargin:
            "180px 0px 180px 0px"
        }
      );


    revealElements.forEach(
      function (element) {

        revealObserver.observe(
          element
        );
      }
    );

  } else {

    revealElements.forEach(
      function (element) {

        element.classList.add(
          "visible"
        );
      }
    );
  }



  /* =========================================================
     HERO ELEMENTS
  ========================================================= */

  const slider =
    document.querySelector(
      ".hero-slider"
    );

  const slides =
    Array.from(
      document.querySelectorAll(
        ".hero-slide"
      )
    );

  const dots =
    Array.from(
      document.querySelectorAll(
        ".hero-dot"
      )
    );

  const dotsContainer =
    document.querySelector(
      ".hero-dots"
    );

  const nextButton =
    document.querySelector(
      ".hero-next"
    );


  let currentSlide = 0;

  let autoSlideTimer = null;

  const AUTO_SLIDE_TIME = 9000;



  /* =========================================================
     FIND INITIAL ACTIVE SLIDE
  ========================================================= */

  if (slides.length > 0) {

    const activeIndex =
      slides.findIndex(
        function (slide) {

          return slide.classList.contains(
            "active"
          );
        }
      );


    currentSlide =
      activeIndex >= 0
        ? activeIndex
        : 0;


    slides.forEach(
      function (slide, index) {

        slide.classList.toggle(
          "active",
          index === currentSlide
        );
      }
    );


    dots.forEach(
      function (dot, index) {

        dot.classList.toggle(
          "active",
          index === currentSlide
        );
      }
    );
  }



  /* =========================================================
     VIDEO FUNCTIONS
  ========================================================= */

  function pauseVideo(video) {

    if (!video) {
      return;
    }

    try {
      video.pause();
    } catch (error) {
      /* Ignore */
    }
  }


  function prepareVideo(video) {

    if (!video) {
      return;
    }

    video.muted = true;

    video.playsInline = true;

    video.setAttribute(
      "playsinline",
      ""
    );

    video.setAttribute(
      "webkit-playsinline",
      ""
    );
  }


  function playVideo(video) {

    if (!video) {
      return;
    }

    prepareVideo(video);


    const promise =
      video.play();


    if (
      promise &&
      typeof promise.catch ===
      "function"
    ) {

      promise.catch(
        function () {
          /*
            Autoplay may occasionally be blocked.
            Do not throw an error.
          */
        }
      );
    }
  }


  function pauseInactiveVideos() {

    slides.forEach(
      function (slide, index) {

        const video =
          slide.querySelector("video");


        if (!video) {
          return;
        }


        if (index === currentSlide) {

          playVideo(video);

        } else {

          pauseVideo(video);
        }
      }
    );
  }



  /* =========================================================
     PRELOAD VIDEOS
  ========================================================= */

  slides.forEach(
    function (slide) {

      const video =
        slide.querySelector("video");


      if (!video) {
        return;
      }


      prepareVideo(video);


      /*
        The HTML already provides preload.
        Calling load() here gives the browser an early
        opportunity to start reading metadata/buffering.
      */

      try {
        video.load();
      } catch (error) {
        /* Ignore */
      }
    }
  );



  /* =========================================================
     PREPARE NEXT VIDEO
  ========================================================= */

  function prepareNextSlide() {

    if (slides.length < 2) {
      return;
    }


    const nextIndex =
      (currentSlide + 1) %
      slides.length;


    const nextVideo =
      slides[nextIndex]
        .querySelector("video");


    if (!nextVideo) {
      return;
    }


    prepareVideo(nextVideo);


    /*
      Do not force playback here.
      Simply ensure the browser has started loading it.
    */

    if (
      nextVideo.readyState === 0
    ) {

      try {
        nextVideo.load();
      } catch (error) {
        /* Ignore */
      }
    }
  }



  /* =========================================================
     AUTO SLIDER
  ========================================================= */

  function stopAutoSlider() {

    if (autoSlideTimer) {

      clearInterval(
        autoSlideTimer
      );

      autoSlideTimer = null;
    }
  }


  function startAutoSlider() {

    stopAutoSlider();


    if (slides.length <= 1) {
      return;
    }


    autoSlideTimer =
      setInterval(
        function () {

          nextSlide();

        },
        AUTO_SLIDE_TIME
      );
  }


  function restartAutoSlider() {

    startAutoSlider();
  }



  /* =========================================================
     SHOW SLIDE
  ========================================================= */

  function showSlide(index) {

    if (slides.length === 0) {
      return;
    }


    let newIndex = index;


    if (newIndex < 0) {

      newIndex =
        slides.length - 1;
    }


    if (
      newIndex >=
      slides.length
    ) {

      newIndex = 0;
    }


    if (
      newIndex ===
      currentSlide
    ) {

      restartAutoSlider();

      return;
    }


    const previousIndex =
      currentSlide;


    currentSlide =
      newIndex;


    /*
      Activate new slide before removing the old one.
      This helps prevent a blank frame between slides.
    */

    slides[currentSlide]
      .classList.add(
        "active"
      );


    dots.forEach(
      function (dot, dotIndex) {

        dot.classList.toggle(
          "active",
          dotIndex === currentSlide
        );
      }
    );


    const newVideo =
      slides[currentSlide]
        .querySelector("video");


    if (newVideo) {

      playVideo(newVideo);
    }


    /*
      Let the browser paint the new slide before
      removing the previous active class.
    */

    requestAnimationFrame(
      function () {

        requestAnimationFrame(
          function () {

            if (
              previousIndex !==
              currentSlide
            ) {

              slides[previousIndex]
                .classList.remove(
                  "active"
                );


              const previousVideo =
                slides[previousIndex]
                  .querySelector(
                    "video"
                  );


              if (previousVideo) {

                setTimeout(
                  function () {

                    pauseVideo(
                      previousVideo
                    );

                  },
                  760
                );
              }
            }

          }
        );

      }
    );


    prepareNextSlide();

    restartAutoSlider();
  }



  function nextSlide() {

    if (slides.length === 0) {
      return;
    }


    showSlide(
      (currentSlide + 1) %
      slides.length
    );
  }


  function previousSlide() {

    if (slides.length === 0) {
      return;
    }


    showSlide(
      (
        currentSlide -
        1 +
        slides.length
      ) %
      slides.length
    );
  }



  /* =========================================================
     DOT CLICK
  ========================================================= */

  dots.forEach(
    function (dot) {

      dot.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();


          const slideIndex =
            Number(
              dot.dataset.slide
            );


          if (
            Number.isInteger(
              slideIndex
            )
          ) {

            showSlide(
              slideIndex
            );
          }
        }
      );
    }
  );



  /* =========================================================
     NEXT BUTTON
  ========================================================= */

  if (nextButton) {

    nextButton.addEventListener(
      "click",
      function (event) {

        event.preventDefault();
        event.stopPropagation();

        nextSlide();
      }
    );
  }



  /* =========================================================
     SWIPE / MOUSE DRAG / MAC TRACKPAD POINTER DRAG
  ========================================================= */

  let pointerActive = false;

  let pointerStartX = 0;
  let pointerStartY = 0;

  let pointerLastX = 0;
  let pointerLastY = 0;


  const SWIPE_DISTANCE = 45;


  if (slider) {

    slider.addEventListener(
      "pointerdown",
      function (event) {

        /*
          Buttons and links must remain clickable.
        */

        if (
          event.target.closest(
            "a, button"
          )
        ) {

          return;
        }


        pointerActive = true;

        pointerStartX =
          event.clientX;

        pointerStartY =
          event.clientY;

        pointerLastX =
          event.clientX;

        pointerLastY =
          event.clientY;


        slider.classList.add(
          "dragging"
        );


        stopAutoSlider();


        try {

          slider.setPointerCapture(
            event.pointerId
          );

        } catch (error) {
          /* Ignore */
        }
      }
    );


    slider.addEventListener(
      "pointermove",
      function (event) {

        if (!pointerActive) {
          return;
        }


        pointerLastX =
          event.clientX;

        pointerLastY =
          event.clientY;
      }
    );


    slider.addEventListener(
      "pointerup",
      function (event) {

        if (!pointerActive) {
          return;
        }


        pointerActive = false;


        slider.classList.remove(
          "dragging"
        );


        const endX =
          event.clientX;

        const endY =
          event.clientY;


        const distanceX =
          endX -
          pointerStartX;

        const distanceY =
          endY -
          pointerStartY;


        /*
          Vertical movement should continue to behave
          as normal page scrolling.
        */

        if (
          Math.abs(distanceY) >
          Math.abs(distanceX)
        ) {

          restartAutoSlider();

          return;
        }


        if (
          Math.abs(distanceX) <
          SWIPE_DISTANCE
        ) {

          restartAutoSlider();

          return;
        }


        if (distanceX < 0) {

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

        slider.classList.remove(
          "dragging"
        );

        restartAutoSlider();
      }
    );
  }



  /* =========================================================
     TRACKPAD HORIZONTAL SWIPE

     Pointer events handle click-and-drag.
     Wheel events below additionally allow a genuine
     horizontal two-finger Mac trackpad gesture.
  ========================================================= */

  let trackpadLocked = false;

  let accumulatedDeltaX = 0;

  let trackpadResetTimer = null;


  if (slider) {

    slider.addEventListener(
      "wheel",
      function (event) {

        /*
          Only react when horizontal movement is clearly
          stronger than vertical scrolling.
        */

        if (
          Math.abs(event.deltaX) <=
          Math.abs(event.deltaY)
        ) {

          return;
        }


        /*
          Avoid changing multiple slides from a single
          momentum swipe.
        */

        if (trackpadLocked) {
          return;
        }


        accumulatedDeltaX +=
          event.deltaX;


        clearTimeout(
          trackpadResetTimer
        );


        trackpadResetTimer =
          setTimeout(
            function () {

              accumulatedDeltaX = 0;

            },
            180
          );


        if (
          Math.abs(
            accumulatedDeltaX
          ) < 55
        ) {

          return;
        }


        trackpadLocked = true;


        if (
          accumulatedDeltaX > 0
        ) {

          nextSlide();

        } else {

          previousSlide();
        }


        accumulatedDeltaX = 0;


        setTimeout(
          function () {

            trackpadLocked = false;

          },
          700
        );
      },
      {
        passive: true
      }
    );
  }



  /* =========================================================
     PRESS + HOLD / DRAG ACROSS DOTS
  ========================================================= */

  let dotDragActive = false;


  if (dotsContainer) {

    dotsContainer.addEventListener(
      "pointerdown",
      function (event) {

        const selectedDot =
          event.target.closest(
            ".hero-dot"
          );


        if (!selectedDot) {
          return;
        }


        dotDragActive = true;

        stopAutoSlider();


        try {

          dotsContainer
            .setPointerCapture(
              event.pointerId
            );

        } catch (error) {
          /* Ignore */
        }


        const slideIndex =
          Number(
            selectedDot
              .dataset
              .slide
          );


        if (
          Number.isInteger(
            slideIndex
          )
        ) {

          showSlide(
            slideIndex
          );
        }
      }
    );


    dotsContainer.addEventListener(
      "pointermove",
      function (event) {

        if (!dotDragActive) {
          return;
        }


        /*
          elementFromPoint lets us detect which dot the
          pointer is currently moving across while held.
        */

        const element =
          document.elementFromPoint(
            event.clientX,
            event.clientY
          );


        if (!element) {
          return;
        }


        const selectedDot =
          element.closest(
            ".hero-dot"
          );


        if (!selectedDot) {
          return;
        }


        const slideIndex =
          Number(
            selectedDot
              .dataset
              .slide
          );


        if (
          Number.isInteger(
            slideIndex
          ) &&
          slideIndex !==
          currentSlide
        ) {

          showSlide(
            slideIndex
          );
        }
      }
    );


    function endDotDrag() {

      if (!dotDragActive) {
        return;
      }


      dotDragActive = false;

      restartAutoSlider();
    }


    dotsContainer.addEventListener(
      "pointerup",
      endDotDrag
    );


    dotsContainer.addEventListener(
      "pointercancel",
      endDotDrag
    );
  }



  /* =========================================================
     HERO PARALLAX

     requestAnimationFrame prevents the browser from doing
     heavy work for every individual scroll event.
  ========================================================= */

  let heroFrameRequested = false;


  function updateHeroParallax() {

    heroFrameRequested = false;


    if (
      !slider ||
      slides.length === 0
    ) {

      return;
    }


    const rect =
      slider.getBoundingClientRect();


    /*
      Stop calculations when hero is nowhere near viewport.
    */

    if (
      rect.bottom < -100 ||
      rect.top >
      window.innerHeight + 100
    ) {

      return;
    }


    const movement =
      Math.max(
        -70,
        Math.min(
          70,
          rect.top * -0.10
        )
      );


    slides.forEach(
      function (slide) {

        slide.style.setProperty(
          "--hero-scroll",
          movement + "px"
        );
      }
    );
  }


  function requestHeroParallax() {

    if (heroFrameRequested) {
      return;
    }


    heroFrameRequested = true;


    requestAnimationFrame(
      updateHeroParallax
    );
  }



  /* =========================================================
     SERVICE IMAGE PARALLAX
  ========================================================= */

  const serviceBands =
    Array.from(
      document.querySelectorAll(
        ".home-service-band"
      )
    );


  let serviceFrameRequested = false;


  function updateServiceParallax() {

    serviceFrameRequested = false;


    serviceBands.forEach(
      function (section) {

        const image =
          section.querySelector(
            ":scope > img"
          );


        if (!image) {
          return;
        }


        const rect =
          section
            .getBoundingClientRect();


        /*
          Ignore sections far away from the viewport.
        */

        if (
          rect.bottom < -250 ||
          rect.top >
          window.innerHeight + 250
        ) {

          return;
        }


        const viewportCenter =
          window.innerHeight / 2;


        const sectionCenter =
          rect.top +
          rect.height / 2;


        const distance =
          sectionCenter -
          viewportCenter;


        /*
          Small movement only.
          Large values are what caused blank edges
          and lag in the older version.
        */

        const movement =
          Math.max(
            -55,
            Math.min(
              55,
              distance * -0.055
            )
          );


        const visibleProgress =
          Math.max(
            0,
            1 -
            Math.abs(distance) /
            (
              window.innerHeight +
              rect.height / 2
            )
          );


        const scale =
          1.045 +
          visibleProgress * 0.018;


        section.style.setProperty(
          "--service-scroll",
          movement + "px"
        );


        section.style.setProperty(
          "--service-scale",
          scale.toFixed(4)
        );
      }
    );
  }


  function requestServiceParallax() {

    if (serviceFrameRequested) {
      return;
    }


    serviceFrameRequested = true;


    requestAnimationFrame(
      updateServiceParallax
    );
  }



  /* =========================================================
     SHARED SCROLL HANDLER
  ========================================================= */

  function handleScroll() {

    requestHeroParallax();

    requestServiceParallax();
  }


  window.addEventListener(
    "scroll",
    handleScroll,
    {
      passive: true
    }
  );


  window.addEventListener(
    "resize",
    handleScroll,
    {
      passive: true
    }
  );



  /* =========================================================
     SERVICE BAND CLICK
  ========================================================= */

  serviceBands.forEach(
    function (band) {

      const destination =
        band.dataset.link;


      if (!destination) {
        return;
      }


      band.addEventListener(
        "click",
        function (event) {

          /*
            Don't interfere with the actual button.
          */

          if (
            event.target.closest("a")
          ) {

            return;
          }


          window.location.href =
            destination;
        }
      );
    }
  );



  /* =========================================================
     CLOSE MOBILE MENU AFTER SELECTING A LINK
  ========================================================= */

  const navToggle =
    document.getElementById(
      "nav-toggle"
    );


  const navigationLinks =
    document.querySelectorAll(
      ".mobile-menu a"
    );


  if (navToggle) {

    navigationLinks.forEach(
      function (link) {

        link.addEventListener(
          "click",
          function () {

            navToggle.checked =
              false;
          }
        );
      }
    );
  }



  /* =========================================================
     PAGE VISIBILITY

     Pause videos when tab isn't visible.
     Resume only the active video when user returns.
  ========================================================= */

  document.addEventListener(
    "visibilitychange",
    function () {

      if (document.hidden) {

        slides.forEach(
          function (slide) {

            pauseVideo(
              slide.querySelector(
                "video"
              )
            );
          }
        );


        stopAutoSlider();

      } else {

        pauseInactiveVideos();

        prepareNextSlide();

        startAutoSlider();
      }
    }
  );



  /* =========================================================
     INITIALISE
  ========================================================= */

  if (slides.length > 0) {

    pauseInactiveVideos();

    prepareNextSlide();

    startAutoSlider();
  }


  requestHeroParallax();

  requestServiceParallax();

});
