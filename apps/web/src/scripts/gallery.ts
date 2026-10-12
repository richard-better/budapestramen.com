import type { Restaurant } from "../data/restaurants";
import { restaurantGallery } from "../lib/gallery";
import type { Language } from "../lib/guide";
import { translations } from "../lib/translations";

export function createPhotoViewer(root: HTMLElement, dialog: HTMLDialogElement) {
  const image = dialog.querySelector<HTMLImageElement>("[data-gallery-image]")!;
  const title = dialog.querySelector<HTMLElement>("#photo-viewer-title")!;
  const counter = dialog.querySelector<HTMLElement>("[data-photo-counter]")!;
  const caption = dialog.querySelector<HTMLElement>("[data-gallery-caption]")!;
  const credit = dialog.querySelector<HTMLAnchorElement>("[data-gallery-credit]")!;
  const error = dialog.querySelector<HTMLElement>("[data-photo-error]")!;
  const previous = dialog.querySelector<HTMLButtonElement>('[data-gallery-action="previous"]')!;
  const next = dialog.querySelector<HTMLButtonElement>('[data-gallery-action="next"]')!;
  let place: Restaurant | undefined;
  let language: Language = "en";
  let index = 0;
  let trigger: HTMLElement | null = null;

  function showPhoto(offset = 0) {
    if (!place) return;
    const { photos, placeholder } = restaurantGallery(place);
    index = (index + offset + photos.length) % photos.length;
    const photo = photos[index]!;
    const t = translations[language];
    image.hidden = false;
    error.hidden = true;
    image.alt = photo.alt[language];
    image.src = photo.src;
    title.textContent = place.name;
    counter.textContent = `${index + 1} / ${photos.length}`;
    caption.textContent = placeholder ? t.placeholderPhotos : photo.alt[language];
    credit.hidden = !photo.credit && !photo.sourceUrl;
    credit.textContent = photo.credit ?? t.photoSource;
    if (photo.sourceUrl) credit.href = photo.sourceUrl;
    else credit.removeAttribute("href");
    previous.hidden = next.hidden = photos.length < 2;
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    trigger = null;
  }

  root.addEventListener("click", (event) => {
    if (
      !(event.target instanceof Element) ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const tile = event.target.closest<HTMLAnchorElement>("[data-photo-index]");
    if (!tile || tile.dataset.photoPlace !== place?.id) return;
    event.preventDefault();
    trigger = tile;
    index = Number(tile.dataset.photoIndex);
    showPhoto();
    dialog.showModal();
  });

  dialog.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const action =
      event.target.closest<HTMLElement>("[data-gallery-action]")?.dataset.galleryAction;
    if (action === "close") close();
    else if (action === "previous") showPhoto(-1);
    else if (action === "next") showPhoto(1);
    else if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        close();
    }
  });
  document.addEventListener(
    "keydown",
    (event) => {
      if (!dialog.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        showPhoto(event.key === "ArrowLeft" ? -1 : 1);
      } else if (event.key === "Tab") {
        const controls = [...dialog.querySelectorAll<HTMLElement>("button, a[href]")].filter(
          (control) => !control.hidden,
        );
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    },
    { capture: true },
  );
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  image.addEventListener("error", () => {
    image.hidden = true;
    error.hidden = false;
  });
  image.addEventListener("load", () => {
    image.hidden = false;
    error.hidden = true;
  });

  return {
    close,
    sync(current: Restaurant | undefined, currentLanguage: Language, detailOpen: boolean) {
      if (place?.id !== current?.id || !detailOpen) close();
      place = current;
      language = currentLanguage;
      if (!place) return;
      const { photos } = restaurantGallery(place);
      root.querySelectorAll<HTMLAnchorElement>("[data-photo-index]").forEach((tile) => {
        const photoIndex = Number(tile.dataset.photoIndex);
        tile.setAttribute("aria-label", `${translations[language].viewPhoto} ${photoIndex + 1}`);
        const thumbnail = tile.querySelector("img");
        if (thumbnail && photos[photoIndex]) thumbnail.alt = photos[photoIndex]!.alt[language];
      });
      if (dialog.open) showPhoto();
    },
  };
}
