import { nanoid } from 'nanoid';

export function generateQrPayload(userId, concertId) {
  const token = nanoid(32);
  return `NJNS-${userId.slice(0, 8)}-${concertId.slice(0, 8)}-${token}`;
}
