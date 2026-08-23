// Swipe-left to reveal actions. Markup: <li class="swipe"><div class="swipe-actions">…</div><div class="swipe-content">…</div></li>
// ponytail: pointer events only, one open row at a time, no velocity math.
const OPEN_PX = 180;

export function enableSwipe(container) {
  let openRow = null;
  const close = (row) => { if (row) row.querySelector('.swipe-content').style.transform = ''; if (openRow === row) openRow = null; };

  container.querySelectorAll('.swipe').forEach((row) => {
    const content = row.querySelector('.swipe-content');
    let startX = 0, startY = 0, dx = 0, dragging = false;

    content.addEventListener('pointerdown', (e) => {
      startX = e.clientX; startY = e.clientY; dx = 0; dragging = false;
      content.style.transition = 'none';
    });
    content.addEventListener('pointermove', (e) => {
      if (!e.buttons) return;
      const dy = e.clientY - startY;
      dx = e.clientX - startX;
      if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        dragging = true;
        content.setPointerCapture(e.pointerId);
        if (openRow && openRow !== row) close(openRow);
      }
      if (!dragging) return;
      const base = openRow === row ? -OPEN_PX : 0;
      content.style.transform = `translateX(${Math.min(0, Math.max(-OPEN_PX, base + dx))}px)`;
    });
    const end = () => {
      content.style.transition = '';
      if (!dragging) return;
      const base = openRow === row ? -OPEN_PX : 0;
      const open = base + dx < -OPEN_PX / 2;
      content.style.transform = open ? `translateX(-${OPEN_PX}px)` : '';
      openRow = open ? row : (openRow === row ? null : openRow);
    };
    content.addEventListener('pointerup', end);
    content.addEventListener('pointercancel', end);
    // Suppress the click that follows a drag so links do not open.
    content.addEventListener('click', (e) => { if (dragging) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  document.addEventListener('pointerdown', (e) => { if (openRow && !openRow.contains(e.target)) close(openRow); });
}
