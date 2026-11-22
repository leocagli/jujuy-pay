import type { Subscriber } from "./types";

const subscribers = new Map<string, Subscriber>();

export function normalizePhone(phone: string): string {
  const cleaned = phone.trim().replace(/[\s()-]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhone(phone));
}

export function subscribe(phone: string, town: string): Subscriber {
  const subscriber: Subscriber = {
    phone: normalizePhone(phone),
    town,
    subscribedAt: new Date().toISOString(),
  };
  subscribers.set(subscriber.phone, subscriber);
  return subscriber;
}

export function unsubscribe(phone: string): boolean {
  return subscribers.delete(normalizePhone(phone));
}

export function subscribersForTown(town: string): Subscriber[] {
  return [...subscribers.values()].filter((subscriber) => subscriber.town === town);
}

export function hasSubscription(phone: string): boolean {
  return subscribers.has(normalizePhone(phone));
}

export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return `${normalized.slice(0, 4)}...${normalized.slice(-2)}`;
}
