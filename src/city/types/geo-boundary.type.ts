/**
 * GeoJSON Polygon geometry as defined by RFC 7946.
 * Coordinates are stored as [longitude, latitude] pairs.
 * The first and last position in each ring must be equivalent (closed ring).
 */
export interface GeoJSONPolygon {
  type: 'Polygon';
  /** Array of linear rings. First ring is the exterior; subsequent rings are holes. */
  coordinates: [number, number][][];
}
