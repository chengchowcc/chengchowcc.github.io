(() => {
  const galleries = document.querySelectorAll("[data-gallery]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

  const enableMouseDrag = (scroller, onRelease) => {
    let pointerId = null;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false;
    let suppressClick = false;

    scroller.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = scroller.scrollLeft;
      moved = false;
    });

    scroller.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;

      const distance = event.clientX - startX;
      if (Math.abs(distance) > 4 && !moved) {
        moved = true;
        scroller.setPointerCapture(pointerId);
        scroller.classList.add("is-dragging");
      }
      if (!moved) return;

      event.preventDefault();
      scroller.scrollLeft = startScrollLeft - distance;
    });

    const finishDrag = (event) => {
      if (event.pointerId !== pointerId) return;

      if (scroller.hasPointerCapture(pointerId)) {
        scroller.releasePointerCapture(pointerId);
      }
      scroller.classList.remove("is-dragging");
      pointerId = null;

      if (moved) {
        suppressClick = true;
        window.setTimeout(() => {
          suppressClick = false;
        }, 0);
        if (onRelease) onRelease();
      }
    };

    scroller.addEventListener("pointerup", finishDrag);
    scroller.addEventListener("pointercancel", finishDrag);
    scroller.addEventListener("click", (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  };

  galleries.forEach((gallery) => {
    const viewport = gallery.querySelector("[data-gallery-viewport]");
    const thumbnailRail = gallery.querySelector("[data-gallery-thumbnails]");
    const slides = Array.from(gallery.querySelectorAll("[data-gallery-slide]"));
    const thumbnails = Array.from(gallery.querySelectorAll("[data-gallery-thumb]"));
    const previousButton = gallery.querySelector("[data-gallery-previous]");
    const nextButton = gallery.querySelector("[data-gallery-next]");
    const firstButton = gallery.querySelector("[data-gallery-first]");
    const counter = gallery.querySelector("[data-gallery-counter]");
    const caption = gallery.querySelector("[data-gallery-caption]");

    if (!viewport || slides.length === 0) return;

    let currentIndex = 0;
    let scrollFrame = null;

    const nearestSlideIndex = () => {
      const viewportCenter = viewport.scrollLeft + (viewport.clientWidth / 2);
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + (slide.offsetWidth / 2);
        const distance = Math.abs(slideCenter - viewportCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      return nearestIndex;
    };

    const syncInterface = (index) => {
      currentIndex = clamp(index, 0, slides.length - 1);
      const activeSlide = slides[currentIndex];

      previousButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex === slides.length - 1;
      firstButton.disabled = currentIndex === 0;
      counter.textContent = `${currentIndex + 1} / ${slides.length}`;
      caption.textContent = activeSlide.dataset.caption || "";

      thumbnails.forEach((thumbnail, thumbnailIndex) => {
        if (thumbnailIndex === currentIndex) {
          thumbnail.setAttribute("aria-current", "true");
        } else {
          thumbnail.removeAttribute("aria-current");
        }
      });

      const activeThumbnail = thumbnails[currentIndex];
      if (activeThumbnail) {
        activeThumbnail.scrollIntoView({
          behavior: reduceMotion.matches ? "auto" : "smooth",
          block: "nearest",
          inline: "nearest"
        });
      }
    };

    const goToSlide = (index, behavior = "smooth") => {
      const nextIndex = clamp(index, 0, slides.length - 1);
      const slide = slides[nextIndex];
      const left = slide.offsetLeft - ((viewport.clientWidth - slide.offsetWidth) / 2);

      viewport.scrollTo({
        left,
        behavior: reduceMotion.matches ? "auto" : behavior
      });
      syncInterface(nextIndex);
    };

    thumbnails.forEach((thumbnail) => {
      thumbnail.addEventListener("click", () => {
        const nextIndex = Number(thumbnail.dataset.index);
        const behavior = Math.abs(nextIndex - currentIndex) > 1 ? "auto" : "smooth";
        goToSlide(nextIndex, behavior);
      });
    });

    previousButton.addEventListener("click", () => goToSlide(currentIndex - 1));
    nextButton.addEventListener("click", () => goToSlide(currentIndex + 1));
    firstButton.addEventListener("click", () => goToSlide(0, "auto"));

    viewport.addEventListener("keydown", (event) => {
      const actions = {
        ArrowLeft: () => goToSlide(currentIndex - 1),
        ArrowRight: () => goToSlide(currentIndex + 1),
        Home: () => goToSlide(0),
        End: () => goToSlide(slides.length - 1)
      };

      if (!actions[event.key]) return;
      event.preventDefault();
      actions[event.key]();
    });

    viewport.addEventListener("scroll", () => {
      if (scrollFrame !== null) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        const nearestIndex = nearestSlideIndex();
        if (nearestIndex !== currentIndex) syncInterface(nearestIndex);
      });
    }, { passive: true });

    enableMouseDrag(viewport, () => goToSlide(nearestSlideIndex()));
    if (thumbnailRail) enableMouseDrag(thumbnailRail);

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(() => goToSlide(currentIndex, "auto"));
      resizeObserver.observe(viewport);
    }

    syncInterface(0);
  });
})();
