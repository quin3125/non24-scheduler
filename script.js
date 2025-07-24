const DateTime = luxon.DateTime;
const Duration = luxon.Duration;

function escapeICSText(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function sanitizeFileName(text) {
  return text.trim().replace(/[^a-z0-9]/gi, '_') || 'event';
}

function getTimeZoneList() {
  if (typeof Intl === 'object' && Intl.supportedValuesOf) {
    return Intl.supportedValuesOf('timeZone');
  }
  // Fallback list if the browser doesn't support supportedValuesOf
  return [
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];
}

function populateTimeZones() {
  const select = document.getElementById('timeZone');
  const zones = getTimeZoneList();
  const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  zones.forEach(z => {
    const opt = document.createElement('option');
    opt.value = z;
    opt.textContent = z;
    if (z === userZone) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function updateTimeFormat() {
  const toggle = document.getElementById('timeFormatToggle');
  const amPm = document.getElementById('amPm');
  const hour = document.getElementById('startHour');
  if (toggle.checked) {
    amPm.style.display = '';
    hour.min = 1;
    hour.max = 12;
  } else {
    amPm.style.display = 'none';
    hour.min = 0;
    hour.max = 23;
  }
}

function validateForm() {
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';
  const title = document.getElementById('title').value.trim();
  if (!title) {
    return 'Title is required.';
  }
  const date = document.getElementById('startDate').value;
  if (!date) {
    return 'Start date is required.';
  }
  const h = parseInt(document.getElementById('startHour').value, 10);
  const m = parseInt(document.getElementById('startMinute').value, 10);
  const s = parseInt(document.getElementById('startSecond').value, 10);
  if (isNaN(h) || isNaN(m) || isNaN(s)) {
    return 'Start time is invalid.';
  }
  const durH = parseInt(document.getElementById('durationHours').value, 10);
  const durM = parseInt(document.getElementById('durationMinutes').value, 10);
  const durS = parseInt(document.getElementById('durationSeconds').value, 10);
  if (durH < 0 || durM < 0 || durS < 0) {
    return 'Duration cannot be negative.';
  }
  const intH = parseInt(document.getElementById('intervalHours').value, 10);
  const intM = parseInt(document.getElementById('intervalMinutes').value, 10);
  const intS = parseInt(document.getElementById('intervalSeconds').value, 10);
  if (intH < 0 || intM < 0 || intS < 0) {
    return 'Interval cannot be negative.';
  }
  const total = parseInt(document.getElementById('totalEvents').value, 10);
  if (!Number.isInteger(total) || total <= 0) {
    return 'Total events must be a positive integer.';
  }
  if (total > 1461) {
    return 'Total events must not exceed 1461.';
  }
  return '';
}

function generateUID(index) {
  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2,8)}`;
}

function generateICS() {
  const errorMsg = validateForm();
  const errorEl = document.getElementById('error');
  if (errorMsg) {
    errorEl.textContent = errorMsg;
    return;
  }
  const titleInput = document.getElementById('title').value.trim();
  const title = escapeICSText(titleInput);
  const date = document.getElementById('startDate').value;
  const zone = document.getElementById('timeZone').value;

  let hour = parseInt(document.getElementById('startHour').value, 10);
  const minute = parseInt(document.getElementById('startMinute').value, 10);
  const second = parseInt(document.getElementById('startSecond').value, 10);
  if (document.getElementById('timeFormatToggle').checked) {
    const ampm = document.getElementById('amPm').value;
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
  }

  let start = DateTime.fromISO(date, { zone }).set({ hour, minute, second });
  const duration = Duration.fromObject({
    hours: parseInt(document.getElementById('durationHours').value, 10),
    minutes: parseInt(document.getElementById('durationMinutes').value, 10),
    seconds: parseInt(document.getElementById('durationSeconds').value, 10)
  });
  const interval = Duration.fromObject({
    hours: parseInt(document.getElementById('intervalHours').value, 10),
    minutes: parseInt(document.getElementById('intervalMinutes').value, 10),
    seconds: parseInt(document.getElementById('intervalSeconds').value, 10)
  });
  const total = parseInt(document.getElementById('totalEvents').value, 10);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//non24-scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];
  for (let i = 0; i < total; i++) {
    const eventStart = start.plus({ milliseconds: interval.as('milliseconds') * i });
    const eventEnd = eventStart.plus(duration);
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + generateUID(i));
    lines.push('DTSTAMP:' + DateTime.now().toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'"));
    lines.push('SUMMARY:' + title);
    lines.push('DTSTART:' + eventStart.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'"));
    lines.push('DTEND:' + eventEnd.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'"));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const icsText = lines.join('\r\n');
  const blob = new Blob([icsText], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById('downloadLink');
  link.href = url;
  const timestamp = DateTime.now().setZone(zone).toFormat('yyyyMMdd_HHmmss');
  link.download = sanitizeFileName(titleInput) + '_' + timestamp + '.ics';
  link.style.display = 'inline';
  link.textContent = 'Download ICS';
  errorEl.textContent = '';
}

document.getElementById('timeFormatToggle').addEventListener('change', updateTimeFormat);
document.getElementById('generateBtn').addEventListener('click', generateICS);

document.addEventListener('DOMContentLoaded', () => {
  populateTimeZones();
  updateTimeFormat();
});
