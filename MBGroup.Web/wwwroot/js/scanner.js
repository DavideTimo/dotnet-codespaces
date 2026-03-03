/**
 * MB Group Document Scanner
 * Perspective correction and automatic edge detection for receipts.
 * Pure JS + Canvas — no external dependencies.
 */

window.MBScanner = (() => {

  // ─── State ────────────────────────────────────────────────────────────────
  let _canvas    = null;   // overlay canvas (shown to user)
  let _imgEl     = null;   // source <img> element
  let _imgData   = null;   // raw pixel data for edge detection
  let _corners   = [];     // [{x,y}, {x,y}, {x,y}, {x,y}] TL,TR,BR,BL
  let _dragging  = null;   // index of corner being dragged
  let _scale     = 1;      // image → canvas scale factor
  let _onUpdate  = null;   // callback when corners change

  const HANDLE_R  = 18;    // touch handle radius (px)
  const LINE_COLOR = '#e8902a';
  const HANDLE_COLOR = '#e8902a';
  const HANDLE_FILL  = 'rgba(232,144,42,0.25)';

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Initialize the scanner on a <canvas> element with an image src.
   * @param {string} canvasId
   * @param {string} imageSrc  base64 data URL or object URL
   * @param {function} onUpdate  called with (corners) whenever handles move
   */
  async function init(canvasId, imageSrc, onUpdate) {
    _canvas   = document.getElementById(canvasId);
    _onUpdate = onUpdate;
    if (!_canvas) return;

    _imgEl = new Image();
    _imgEl.crossOrigin = 'anonymous';

    await new Promise((res, rej) => {
      _imgEl.onload = res;
      _imgEl.onerror = rej;
      _imgEl.src = imageSrc;
    });

    // Fit image into canvas container keeping aspect ratio
    const containerW = _canvas.parentElement.clientWidth || 400;
    const maxH = Math.min(window.innerHeight * 0.55, 560);
    _scale = Math.min(containerW / _imgEl.naturalWidth, maxH / _imgEl.naturalHeight);

    _canvas.width  = Math.round(_imgEl.naturalWidth  * _scale);
    _canvas.height = Math.round(_imgEl.naturalHeight * _scale);

    // Compute grayscale image for edge detection
    const offscreen = document.createElement('canvas');
    offscreen.width  = _imgEl.naturalWidth;
    offscreen.height = _imgEl.naturalHeight;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(_imgEl, 0, 0);
    _imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);

    // Auto-detect corners
    _corners = autoDetect(_imgData);

    // Register touch/mouse events
    _bindEvents();
    _render();
  }

  /**
   * Apply perspective correction using current _corners.
   * Returns a base64 JPEG of the cropped & straightened document.
   */
  function crop() {
    if (!_imgEl || _corners.length !== 4) return null;

    // Convert canvas-space corners back to image-space
    const imgCorners = _corners.map(c => ({
      x: c.x / _scale,
      y: c.y / _scale,
    }));

    // Compute destination size from the bounding parallelogram
    const w = Math.round(Math.max(
      dist(imgCorners[0], imgCorners[1]),
      dist(imgCorners[3], imgCorners[2])
    ));
    const h = Math.round(Math.max(
      dist(imgCorners[0], imgCorners[3]),
      dist(imgCorners[1], imgCorners[2])
    ));

    const dst = document.createElement('canvas');
    dst.width  = w;
    dst.height = h;
    const ctx = dst.getContext('2d');

    // Perspective warp: for each pixel in dst, find corresponding src pixel
    const H = computeHomography(
      [{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],
      imgCorners
    );

    // Use the full-res source image
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width  = _imgEl.naturalWidth;
    srcCanvas.height = _imgEl.naturalHeight;
    const sCtx = srcCanvas.getContext('2d');
    sCtx.drawImage(_imgEl, 0, 0);
    const srcData = sCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const dstData = ctx.createImageData(w, h);

    warpPerspective(srcData, dstData, H);
    ctx.putImageData(dstData, 0, 0);

    // Enhance: auto-contrast for better readability
    autoContrast(ctx, w, h);

    return dst.toDataURL('image/jpeg', 0.88);
  }

  /** Reset corners to default (slightly inset) */
  function reset() {
    if (!_canvas) return;
    const m = Math.round(Math.min(_canvas.width, _canvas.height) * 0.06);
    _corners = [
      { x: m,                  y: m },
      { x: _canvas.width - m,  y: m },
      { x: _canvas.width - m,  y: _canvas.height - m },
      { x: m,                  y: _canvas.height - m },
    ];
    _render();
  }

  /** Destroy listeners */
  function destroy() {
    if (!_canvas) return;
    _canvas.removeEventListener('mousedown', _onDown);
    _canvas.removeEventListener('touchstart', _onTouchStart);
    _canvas = null;
  }

  // ─── Automatic Corner Detection ────────────────────────────────────────────

  function autoDetect(imgData) {
    const W = imgData.width, H = imgData.height;
    const gray = toGray(imgData);
    const edges = sobel(gray, W, H);

    // Find bounding box of significant edges
    const THRESH = 40;
    let minX = W, maxX = 0, minY = H, maxY = 0;

    // Scan from borders inward to find first strong edge
    // Top
    outer: for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (edges[y * W + x] > THRESH) { minY = Math.max(0, y - 2); break outer; }
      }
    }
    // Bottom
    outer: for (let y = H - 1; y >= 0; y--) {
      for (let x = 0; x < W; x++) {
        if (edges[y * W + x] > THRESH) { maxY = Math.min(H - 1, y + 2); break outer; }
      }
    }
    // Left
    outer: for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        if (edges[y * W + x] > THRESH) { minX = Math.max(0, x - 2); break outer; }
      }
    }
    // Right
    outer: for (let x = W - 1; x >= 0; x--) {
      for (let y = 0; y < H; y++) {
        if (edges[y * W + x] > THRESH) { maxX = Math.min(W - 1, x + 2); break outer; }
      }
    }

    // Guard: if detection failed, use 8% inset
    const margin = Math.round(Math.min(W, H) * 0.08);
    if (minX >= maxX || minY >= maxY) {
      minX = margin; minY = margin;
      maxX = W - margin; maxY = H - margin;
    }

    // Scale to canvas space
    const s = _scale;
    return [
      { x: minX * s, y: minY * s },
      { x: maxX * s, y: minY * s },
      { x: maxX * s, y: maxY * s },
      { x: minX * s, y: maxY * s },
    ];
  }

  // ─── Image Processing Helpers ──────────────────────────────────────────────

  function toGray(imgData) {
    const d = imgData.data;
    const g = new Float32Array(imgData.width * imgData.height);
    for (let i = 0; i < g.length; i++) {
      const p = i * 4;
      g[i] = 0.299 * d[p] + 0.587 * d[p+1] + 0.114 * d[p+2];
    }
    return g;
  }

  function sobel(gray, W, H) {
    const edges = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const gx =
          -gray[(y-1)*W+(x-1)] + gray[(y-1)*W+(x+1)]
          -2*gray[y*W+(x-1)]   + 2*gray[y*W+(x+1)]
          -gray[(y+1)*W+(x-1)] + gray[(y+1)*W+(x+1)];
        const gy =
          -gray[(y-1)*W+(x-1)] - 2*gray[(y-1)*W+x] - gray[(y-1)*W+(x+1)]
          +gray[(y+1)*W+(x-1)] + 2*gray[(y+1)*W+x] + gray[(y+1)*W+(x+1)];
        edges[y*W+x] = Math.sqrt(gx*gx + gy*gy);
      }
    }
    return edges;
  }

  // ─── Perspective Transform (Homography) ────────────────────────────────────

  /**
   * Compute homography H such that H * srcPt ≈ dstPt (projective).
   * Uses DLT with Gaussian elimination (exact for 4-point correspondences).
   */
  function computeHomography(src, dst) {
    // Build 8×9 matrix
    const A = [];
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = [src[i].x, src[i].y];
      const [dx, dy] = [dst[i].x, dst[i].y];
      A.push([-sx, -sy, -1,  0,   0,   0, dx*sx, dx*sy, dx]);
      A.push([ 0,   0,   0, -sx, -sy, -1, dy*sx, dy*sy, dy]);
    }
    // Solve A·h = 0 via Gaussian elimination (pseudo-SVD for 8x9)
    gaussElim(A);
    // Back-substitute
    const h = new Array(9).fill(0);
    h[8] = 1;
    for (let i = 7; i >= 0; i--) {
      let sum = A[i][8];
      for (let j = i + 1; j < 8; j++) sum -= A[i][j] * h[j];
      h[i] = sum / A[i][i];
    }
    return h; // [h0..h8] row-major 3×3
  }

  function gaussElim(A) {
    const rows = A.length, cols = A[0].length;
    for (let col = 0; col < rows; col++) {
      // Partial pivot
      let maxRow = col;
      for (let r = col + 1; r < rows; r++) {
        if (Math.abs(A[r][col]) > Math.abs(A[maxRow][col])) maxRow = r;
      }
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      if (Math.abs(A[col][col]) < 1e-10) continue;
      const factor = 1 / A[col][col];
      for (let j = col; j < cols; j++) A[col][j] *= factor;
      for (let r = 0; r < rows; r++) {
        if (r === col) continue;
        const f = A[r][col];
        for (let j = col; j < cols; j++) A[r][j] -= f * A[col][j];
      }
    }
  }

  /**
   * Warp srcData → dstData using homography H (inverse map).
   * For each dst pixel, compute the corresponding src pixel and sample it.
   */
  function warpPerspective(srcData, dstData, H) {
    const SW = srcData.width, SH = srcData.height;
    const DW = dstData.width, DH = dstData.height;
    const src = srcData.data, dst = dstData.data;

    for (let dy = 0; dy < DH; dy++) {
      for (let dx = 0; dx < DW; dx++) {
        // Apply inverse H to map (dx, dy) → src (sx, sy)
        const w  = H[6]*dx + H[7]*dy + H[8];
        const sx = (H[0]*dx + H[1]*dy + H[2]) / w;
        const sy = (H[3]*dx + H[4]*dy + H[5]) / w;

        const di = (dy * DW + dx) * 4;

        if (sx < 0 || sx >= SW - 1 || sy < 0 || sy >= SH - 1) {
          dst[di] = dst[di+1] = dst[di+2] = 255;
          dst[di+3] = 255;
          continue;
        }

        // Bilinear interpolation
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const x1 = x0 + 1, y1 = y0 + 1;
        const fx = sx - x0, fy = sy - y0;

        for (let c = 0; c < 3; c++) {
          const tl = src[(y0*SW + x0)*4 + c];
          const tr = src[(y0*SW + x1)*4 + c];
          const bl = src[(y1*SW + x0)*4 + c];
          const br = src[(y1*SW + x1)*4 + c];
          dst[di + c] = Math.round(
            tl*(1-fx)*(1-fy) + tr*fx*(1-fy) +
            bl*(1-fx)*fy     + br*fx*fy
          );
        }
        dst[di + 3] = 255;
      }
    }
  }

  /** Simple auto-contrast (stretch histogram) for better receipt readability */
  function autoContrast(ctx, w, h) {
    const id = ctx.getImageData(0, 0, w, h);
    const d  = id.data;
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i] + d[i+1] + d[i+2]) / 3;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (max === min) return;
    const range = max - min;
    for (let i = 0; i < d.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        d[i+c] = Math.round(((d[i+c] - min) / range) * 255);
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  function _render() {
    if (!_canvas || !_imgEl) return;
    const ctx = _canvas.getContext('2d');
    ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    // Draw source image
    ctx.drawImage(_imgEl, 0, 0, _canvas.width, _canvas.height);

    if (_corners.length !== 4) return;

    // Semi-transparent overlay outside the crop area
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(_corners[0].x, _corners[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(_corners[i].x, _corners[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Crop polygon border
    ctx.save();
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth   = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(_corners[0].x, _corners[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(_corners[i].x, _corners[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Corner handles
    const labels = ['↖', '↗', '↘', '↙'];
    _corners.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, HANDLE_R, 0, Math.PI * 2);
      ctx.fillStyle = HANDLE_FILL;
      ctx.fill();
      ctx.strokeStyle = HANDLE_COLOR;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(HANDLE_R * 0.9)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], c.x, c.y);
    });

    if (_onUpdate) _onUpdate(_corners);
  }

  // ─── Event Handling (mouse + touch) ────────────────────────────────────────

  function _getPos(e) {
    const rect = _canvas.getBoundingClientRect();
    const scaleX = _canvas.width / rect.width;
    const scaleY = _canvas.height / rect.height;
    if (e.touches) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function _hitCorner(pos) {
    for (let i = 0; i < _corners.length; i++) {
      if (dist(_corners[i], pos) <= HANDLE_R * 1.8) return i;
    }
    return -1;
  }

  function _onDown(e) {
    const pos = _getPos(e);
    const hit = _hitCorner(pos);
    if (hit >= 0) {
      _dragging = hit;
      e.preventDefault();
    }
  }

  function _onMove(e) {
    if (_dragging === null) return;
    e.preventDefault();
    const pos = _getPos(e);
    _corners[_dragging] = {
      x: Math.max(0, Math.min(_canvas.width,  pos.x)),
      y: Math.max(0, Math.min(_canvas.height, pos.y)),
    };
    _render();
  }

  function _onUp() { _dragging = null; }

  function _onTouchStart(e) {
    _onDown(e);
  }

  function _bindEvents() {
    _canvas.addEventListener('mousedown',  _onDown,  { passive: false });
    _canvas.addEventListener('mousemove',  _onMove,  { passive: false });
    _canvas.addEventListener('mouseup',    _onUp);
    _canvas.addEventListener('touchstart', _onTouchStart, { passive: false });
    _canvas.addEventListener('touchmove',  _onMove,  { passive: false });
    _canvas.addEventListener('touchend',   _onUp);
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  function dist(a, b) {
    return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
  }

  /** Read a <input type=file> as base64 data URL */
  function readFileAsDataURL(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload  = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  /** Compress and resize an image to max dimensions */
  function resizeImage(dataUrl, maxW = 2000, maxH = 2000, quality = 0.88) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  }

  // Public interface
  return { init, crop, reset, destroy, readFileAsDataURL, resizeImage };

})();
