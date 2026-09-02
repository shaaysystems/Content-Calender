/* ==========================================================================
   Q-MARK MEDIA — Utility helpers: date math, formatting, calendar generation
   ========================================================================== */

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAY_NAMES_MON = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const WEEKDAY_NAMES_SUN = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const WEEKDAY_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const CONTENT_TYPES = [
  'Static Post','Carousel','Reel','Story','Ad Creative','Motion Graphic','Video',
  'Promotional Post','Product Post','Festive / Special Day Poster','Campaign Creative',
  'Testimonial','Announcement','Educational Content','Behind the Scenes','Other'
];

const PLATFORMS = [
  { key: 'Instagram', icon: 'fa-brands fa-instagram' },
  { key: 'Facebook', icon: 'fa-brands fa-facebook' },
  { key: 'LinkedIn', icon: 'fa-brands fa-linkedin' },
  { key: 'YouTube', icon: 'fa-brands fa-youtube' },
  { key: 'YouTube Shorts', icon: 'fa-brands fa-youtube' },
  { key: 'X', icon: 'fa-brands fa-x-twitter' },
  { key: 'Pinterest', icon: 'fa-brands fa-pinterest' },
  { key: 'Google Business Profile', icon: 'fa-brands fa-google' },
  { key: 'WhatsApp', icon: 'fa-brands fa-whatsapp' },
  { key: 'Website', icon: 'fa-solid fa-globe' },
  { key: 'Email Marketing', icon: 'fa-solid fa-envelope' },
  { key: 'Other', icon: 'fa-solid fa-ellipsis' }
];

const STATUS_OPTIONS = ['Draft', 'Ready', 'Scheduled', 'Published'];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function daysInMonth(year, monthIndex) {
  // monthIndex: 0-based (0 = January)
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[monthIndex];
}

function pad2(n) { return String(n).padStart(2, '0'); }

function toISODate(year, month, day) {
  // month is 1-based here for convenience
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLong(iso) {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShort(iso) {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

function weekdayName(iso) {
  const d = parseISODate(iso);
  return WEEKDAY_FULL[d.getDay()];
}

/**
 * Build a full calendar grid structure for a given month/year.
 * weekStart: 'monday' | 'sunday'
 * Returns: { weeks: [[{date, iso, inMonth}...]...], weekdayLabels, totalDays, startWeekday, endWeekday }
 */
function buildCalendarGrid(year, monthIndex, weekStart = 'monday') {
  const totalDays = daysInMonth(year, monthIndex);
  const firstDate = new Date(year, monthIndex, 1);
  const lastDate = new Date(year, monthIndex, totalDays);

  let firstDow = firstDate.getDay(); // 0=Sun..6=Sat
  let lastDow = lastDate.getDay();

  const weekdayLabels = weekStart === 'sunday' ? WEEKDAY_NAMES_SUN : WEEKDAY_NAMES_MON;

  // Convert JS dow (0=Sun) to grid column index based on weekStart
  function colIndex(dow) {
    if (weekStart === 'sunday') return dow;
    return (dow + 6) % 7; // shift so Monday=0
  }

  const leadingBlanks = colIndex(firstDow);
  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    cells.push({
      day,
      iso: toISODate(year, monthIndex + 1, day),
      dow: new Date(year, monthIndex, day).getDay()
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return {
    weeks,
    weekdayLabels,
    totalDays,
    startWeekdayName: WEEKDAY_FULL[firstDow],
    endWeekdayName: WEEKDAY_FULL[lastDow],
    numWeeks: weeks.length
  };
}

/**
 * Assign stable, sequential, human-friendly Content IDs (C01, C02, ...) to a
 * set of content items, ordered by posting date (then manual order) so the
 * IDs are consistent across the Calendar Overview, Content Details view,
 * lightbox, and all export formats.
 * Returns a map of itemId -> "C01".
 */
function assignContentIds(items) {
  const sorted = [...items].sort(byDateThenOrder);
  const map = {};
  sorted.forEach((it, idx) => { map[it.id] = 'C' + pad2(idx + 1); });
  return map;
}

function byDateThenOrder(a, b) {
  const d = parseISODate(a.date) - parseISODate(b.date);
  if (d !== 0) return d;
  return (a.order || 0) - (b.order || 0);
}

function sortedByDate(items) {
  return [...items].sort(byDateThenOrder);
}

/** Shorten long platform names for compact badge display (e.g. calendar chips). */
function shortPlatform(p) {
  const map = { 'YouTube Shorts': 'YT Shorts', 'Google Business Profile': 'GBP', 'Email Marketing': 'Email' };
  return map[p] || p;
}

/* ==========================================================================
   Image aspect-ratio-safe sizing helpers.
   CORE RULE: an uploaded creative's original width/height ratio must NEVER
   be changed on export. These helpers compute *explicit* proportional pixel
   dimensions (never independently forcing both width AND height), so every
   renderer — including html2canvas-based PDF/PNG/JPEG/Content-Board export,
   which does not always honour CSS `object-fit`/`aspect-ratio` reliably —
   can size an <img> with plain, unambiguous inline width/height that is
   guaranteed proportional to the source image.
   ========================================================================== */

/** Read the true natural pixel dimensions of an image (data URL, blob URL, or src). */
function getImageSize(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width || 4, height: img.naturalHeight || img.height || 3 });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Proportional "contain" fit: scales imgW×imgH down (or up) so it fits
 * entirely inside maxW×maxH while preserving the exact original ratio.
 * scale = min(maxW/imgW, maxH/imgH); this is the only way both dimensions
 * are derived — never set independently — so the shape can never distort.
 */
function fitContain(imgW, imgH, maxW, maxH) {
  if (!imgW || !imgH) return { width: maxW, height: maxH };
  const scale = Math.min(maxW / imgW, maxH / imgH);
  return { width: Math.max(1, Math.round(imgW * scale)), height: Math.max(1, Math.round(imgH * scale)) };
}

function orientationOf(w, h) {
  if (!w || !h) return 'landscape';
  if (h > w * 1.05) return 'portrait';
  if (w > h * 1.05) return 'landscape';
  return 'square';
}

/**
 * Make sure a content item has its true image pixel dimensions available
 * (item.imageWidth/imageHeight). New uploads already store these at save
 * time; older items saved before this fix are measured here on demand and
 * cached back onto the in-memory item so repeat renders/exports are instant.
 */
async function ensureItemImageDims(item) {
  if (item.imageWidth && item.imageHeight) return { width: item.imageWidth, height: item.imageHeight };
  const src = item.image || item.thumbnail;
  const size = await getImageSize(src);
  if (size) { item.imageWidth = size.width; item.imageHeight = size.height; }
  return size || { width: 4, height: 3 };
}

function daysBetweenInclusive(isoStart, isoEnd) {
  const s = parseISODate(isoStart);
  const e = parseISODate(isoEnd);
  return Math.round((e - s) / 86400000) + 1;
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? '1 hour ago' : `${hr} hours ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day} days ago`;
  const d = new Date(ts);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

function slugify(str) {
  return String(str || '').trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Resize/compress an image (data URL or Blob/File) to keep IndexedDB storage
 * and rendering fast. Supports large phone photos (multi-megapixel, up to
 * several MB) and any orientation/aspect ratio. Rejects on genuine failure
 * (caller should handle/report the error) instead of silently hanging.
 */
function resizeImage(source, maxDim = 1600, quality = 0.86) {
  return new Promise((resolve, reject) => {
    // createImageBitmap is faster and more memory-efficient for large photos
    // than decoding through an <img> + canvas, and is supported in all
    // modern browsers. Fall back to <img> decoding if unavailable/fails.
    if (typeof createImageBitmap === 'function' && source instanceof Blob) {
      createImageBitmap(source).then(
        (bitmap) => {
          try {
            resolve(drawBitmapToDataURL(bitmap, maxDim, quality));
          } catch (err) {
            reject(err);
          }
        },
        () => resizeImageViaImgElement(source, maxDim, quality).then(resolve, reject)
      );
    } else {
      resizeImageViaImgElement(source, maxDim, quality).then(resolve, reject);
    }
  });
}

function drawBitmapToDataURL(bitmap, maxDim, quality) {
  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round(height * (maxDim / width));
      width = maxDim;
    } else {
      width = Math.round(width * (maxDim / height));
      height = maxDim;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close && bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}

function resizeImageViaImgElement(source, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = (source instanceof Blob) ? URL.createObjectURL(source) : null;
    const cleanup = () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    img.onload = () => {
      try {
        let { naturalWidth: width, naturalHeight: height } = img;
        if (!width || !height) { width = img.width; height = img.height; }
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        cleanup();
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    img.onerror = () => { cleanup(); reject(new Error('That file could not be read as an image.')); };
    img.src = objectUrl || source;
  });
}

function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.style.transition = 'all .25s ease';
    setTimeout(() => el.remove(), 260);
  }, 2800);
}

window.QU = {
  MONTH_NAMES, WEEKDAY_NAMES_MON, WEEKDAY_NAMES_SUN, WEEKDAY_FULL,
  CONTENT_TYPES, PLATFORMS, STATUS_OPTIONS,
  isLeapYear, daysInMonth, toISODate, parseISODate, formatDateLong, formatDateShort,
  weekdayName, buildCalendarGrid, daysBetweenInclusive, timeAgo, slugify, escapeHtml,
  fileToDataURL, resizeImage, debounce, showToast, assignContentIds, sortedByDate, pad2, shortPlatform,
  getImageSize, fitContain, orientationOf, ensureItemImageDims
};
window.showToast = showToast;
