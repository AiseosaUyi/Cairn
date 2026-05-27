/**
 * Calendar block — generate a .ics event and trigger download/share.
 *
 * Why .ics and not Google OAuth: works on every device + every calendar
 * app (Google, Apple, Outlook, Fastmail) with zero auth setup. Google
 * Calendar OAuth is a later add for users who want one-click.
 *
 * On web: triggers a download via a Blob URL.
 * On native: shares via Expo Sharing (kept minimal — we already use it
 *            elsewhere). For now we only ship the web path because the
 *            primary surface is PWA.
 */

import { Platform } from 'react-native';

export interface CalendarEvent {
  title: string;
  /** Optional longer description shown in the calendar event body. */
  description?: string;
  /** Local-time ISO string (YYYY-MM-DDTHH:mm). */
  startsAt: string;
  /** Duration in minutes. */
  durationMin: number;
  /** Optional location string. */
  location?: string;
}

/** Format a Date as YYYYMMDDTHHmmss (no zone, treated as local). */
function icsTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  );
}

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** Build an .ics file body. Single VEVENT. */
export function buildIcs(event: CalendarEvent): string {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + event.durationMin * 60 * 1000);
  const uid = `cairn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cairn.app`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cairn//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsTime(new Date())}`,
    `DTSTART:${icsTime(start)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${escape(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

/** Trigger a download (web) of the .ics file. On native this is a no-op
 *  for v1 — we route users to web for calendar blocks. */
export function downloadIcs(event: CalendarEvent): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const ics = buildIcs(event);
  try {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

/** Google Calendar quick-add URL — opens GCal in a new tab pre-filled.
 *  Works for users who don't want to download a file. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + event.durationMin * 60 * 1000);
  const fmt = (d: Date) => icsTime(d).replace(/[^0-9T]/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: event.description ?? '',
    location: event.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
