export const mapStyles = [
  { id: "positron", label: "Positron" },
  { id: "bright", label: "Bright" },
  { id: "liberty", label: "Liberty" },
  { id: "dark", label: "Dark" },
  { id: "fiord", label: "Fiord" },
] as const;

export type MapStyle = (typeof mapStyles)[number]["id"];

export function isMapStyle(value: string): value is MapStyle {
  return mapStyles.some((style) => style.id === value);
}

export function mapStyleUrl(style: MapStyle): string {
  return `https://tiles.openfreemap.org/styles/${style}`;
}
