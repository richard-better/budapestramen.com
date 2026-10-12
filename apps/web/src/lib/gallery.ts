import type { Restaurant, RestaurantPhoto } from "../data/restaurants";

const placeholderColors = ["e9e3d9", "e1e5dc", "eee0d7", "e4e2dc", "dce4e3", "e9e2d1"];
const placeholderPhotos: RestaurantPhoto[] = placeholderColors.map((color, index) => ({
  src: `https://placehold.co/600x400/${color}/716d65?text=${index + 1}`,
  alt: { en: `Placeholder photo ${index + 1}`, hu: `${index + 1}. helyőrző kép` },
}));

export function restaurantGallery(place: Pick<Restaurant, "photos">) {
  const placeholder = !place.photos?.length;
  const photos = placeholder ? placeholderPhotos : place.photos!;
  return {
    photos,
    placeholder,
    previews: photos.slice(0, 4),
    remaining: Math.max(0, photos.length - 3),
  };
}
