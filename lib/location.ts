import type { MapLocation } from './types';
export const emptyLocation = (): MapLocation => ({ address: '', latitude: null, longitude: null });
export function normalizeLocation(input: unknown): MapLocation {
  const value = input && typeof input === 'object' ? input as Partial<MapLocation> : {};
  const coordinate = (number: unknown) => number === null || number === undefined || number === '' ? null : Number(number);
  const latitude = coordinate(value.latitude);
  const longitude = coordinate(value.longitude);
  return { address: String(value.address || '').trim(), latitude: latitude !== null && Number.isFinite(latitude) ? latitude : null, longitude: longitude !== null && Number.isFinite(longitude) ? longitude : null };
}
export function locationError(location: MapLocation): string | null {
  if ((location.latitude === null) !== (location.longitude === null)) return 'Vui lòng nhập đủ vĩ độ và kinh độ.';
  if (location.latitude !== null && (location.latitude < -90 || location.latitude > 90)) return 'Vĩ độ phải từ -90 đến 90.';
  if (location.longitude !== null && (location.longitude < -180 || location.longitude > 180)) return 'Kinh độ phải từ -180 đến 180.';
  return null;
}
export function mapUrl(location: MapLocation): string | null {
  const query = location.latitude !== null && location.longitude !== null ? `${location.latitude},${location.longitude}` : location.address;
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
export function directionsUrl(location: MapLocation): string | null {
  const destination = location.latitude !== null && location.longitude !== null ? `${location.latitude},${location.longitude}` : location.address.trim();
  if (!destination) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
