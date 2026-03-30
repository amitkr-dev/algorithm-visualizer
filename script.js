/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');

let array       = [];
let frames      = [];
let frameIdx    = 0;
let animTimer   = null;
let isPaused    = false;
let isRunning   = false;
let currentAlgo = 'bubble';

const speedMap   = { 1: 300, 2: 120, 3: 50, 4: 15, 5: 4 };
const speedLabel = { 1: 'Very Slow', 2: 'Slow', 3: 'Medium', 4: 'Fast', 5: 'Blazing' };

/*CANVAS SETUP*/
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width;
  canvas.height = canvas.offsetHeight;
  draw(array, []);
}

window.addEventListener('resize', resizeCanvas);

/* ══════════════════════════════════════
   DRAW BARS ON CANVAS
══════════════════════════════════════ */
function draw(arr, highlights) {
  const W      = canvas.width;
  const H      = canvas.height;
  const n      = arr.length;
  const gap    = 2;
  const barW   = Math.floor((W - gap * (n - 1)) / n);
  const maxVal = Math.max(...arr);

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < n; i++) {
    const barH = Math.floor((arr[i] / maxVal) * (H - 20));
    const x    = i * (barW + gap);
    const y    = H - barH;

    // pick color based on highlight type
    let color = '#1e3a4f';
    if (highlights) {
      const h = highlights.find(h => h.idx === i);
      if (h) {
        if (h.type === 'compare') color = '#fbbf24';
        else if (h.type === 'swap')    color = '#f87171';
        else if (h.type === 'sorted')  color = '#4ade80';
        else if (h.type === 'pivot')   color = '#a78bfa';
        else if (h.type === 'merge')   color = '#a78bfa';
        else if (h.type === 'current') color = '#38bdf8';
      } else {
        color = '#1a3a52';
      }
    }

    ctx.fillStyle = color;
    ctx.fillRect(x, y, barW, barH);

    // bright top cap on each bar
    ctx.fillStyle = lighten(color, 40);
    ctx.fillRect(x, y, barW, 2);
  }
}

// makes bar top cap slightly brighter
function lighten(hex, amt) {
  const col = hex.replace('#', '');
  const r   = Math.min(255, parseInt(col.slice(0, 2), 16) + amt);
  const g   = Math.min(255, parseInt(col.slice(2, 4), 16) + amt);
  const b   = Math.min(255, parseInt(col.slice(4, 6), 16) + amt);
  return `rgb(${r},${g},${b})`;
}

/* ══════════════════════════════════════
   GENERATE RANDOM ARRAY
══════════════════════════════════════ */
function generateArray(n) {
  array = [];
  for (let i = 0; i < n; i++) {
    array.push(Math.floor(Math.random() * 90) + 10);
  }
  frames   = [];
  frameIdx = 0;
  resizeCanvas();
  resetStats();
  setStatus('Ready');
  document.getElementById('done-overlay').classList.remove('show');
}

/* ══════════════════════════════════════
   STATS
══════════════════════════════════════ */
let totalComparisons = 0;
let totalSwaps       = 0;

function resetStats() {
  totalComparisons = 0;
  totalSwaps       = 0;
  document.getElementById('stat-comparisons').textContent = '0';
  document.getElementById('stat-swaps').textContent       = '0';
}

function setStatus(txt) {
  document.getElementById('stat-status').textContent = txt;
}

/* ══════════════════════════════════════
   ALGORITHM SELECTOR
══════════════════════════════════════ */
const complexityInfo = {
  bubble:    { text: 'Bubble Sort — <strong>O(n²)</strong> time · O(1) space' },
  selection: { text: 'Selection Sort — <strong>O(n²)</strong> time · O(1) space' },
  merge:     { text: 'Merge Sort — <strong>O(n log n)</strong> time · O(n) space' },
};

function selectAlgo(algo, btn) {
  if (isRunning) return;
  currentAlgo = algo;
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('complexity-badge').innerHTML = complexityInfo[algo].text;
  document.getElementById('pseudocode').innerHTML = getPseudocode(algo);
  generateArray(parseInt(document.getElementById('size-slider').value));
}

/* ══════════════════════════════════════
   FRAME COLLECTION — BUBBLE SORT
   Key concept: run algorithm first,
   record every step, then replay them
══════════════════════════════════════ */
function collectBubble(arr) {
  const a      = [...arr];
  const n      = a.length;
  const f      = [];
  const sorted = new Set();

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {

      // record a COMPARE frame
      f.push({
        arr:  [...a],
        hl:   [
          { idx: j,   type: 'compare' },
          { idx: j+1, type: 'compare' },
          ...Array.from(sorted).map(s => ({ idx: s, type: 'sorted' }))
        ],
        comp: 1,
        swap: 0
      });

      if (a[j] > a[j+1]) {
        [a[j], a[j+1]] = [a[j+1], a[j]];

        // record a SWAP frame
        f.push({
          arr:  [...a],
          hl:   [
            { idx: j,   type: 'swap' },
            { idx: j+1, type: 'swap' },
            ...Array.from(sorted).map(s => ({ idx: s, type: 'sorted' }))
          ],
          comp: 0,
          swap: 1
        });
      }
    }
    sorted.add(n - 1 - i);
  }
  sorted.add(0);

  // final DONE frame — all bars green
  f.push({
    arr:  [...a],
    hl:   Array.from({ length: n }, (_, i) => ({ idx: i, type: 'sorted' })),
    comp: 0,
    swap: 0,
    done: true
  });
  return f;
}

/* ══════════════════════════════════════
   FRAME COLLECTION — SELECTION SORT
══════════════════════════════════════ */
function collectSelection(arr) {
  const a      = [...arr];
  const n      = a.length;
  const f      = [];
  const sorted = new Set();

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;

    for (let j = i + 1; j < n; j++) {

      // record a COMPARE frame
      f.push({
        arr:  [...a],
        hl:   [
          { idx: j,      type: 'compare' },
          { idx: minIdx, type: 'pivot'   },
          ...Array.from(sorted).map(s => ({ idx: s, type: 'sorted' }))
        ],
        comp: 1,
        swap: 0
      });

      if (a[j] < a[minIdx]) minIdx = j;
    }

    if (minIdx !== i) {
      [a[i], a[minIdx]] = [a[minIdx], a[i]];

      // record a SWAP frame
      f.push({
        arr:  [...a],
        hl:   [
          { idx: i,      type: 'swap' },
          { idx: minIdx, type: 'swap' },
          ...Array.from(sorted).map(s => ({ idx: s, type: 'sorted' }))
        ],
        comp: 0,
        swap: 1
      });
    }
    sorted.add(i);
  }
  sorted.add(n - 1);

  f.push({
    arr:  [...a],
    hl:   Array.from({ length: n }, (_, i) => ({ idx: i, type: 'sorted' })),
    comp: 0,
    swap: 0,
    done: true
  });
  return f;
}

/* ══════════════════════════════════════
   FRAME COLLECTION — MERGE SORT
══════════════════════════════════════ */
function collectMerge(arr) {
  const a = [...arr];
  const f = [];

  function mergeSort(arr, l, r) {
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    mergeSort(arr, l, m);
    mergeSort(arr, m + 1, r);
    merge(arr, l, m, r);
  }

  function merge(arr, l, m, r) {
    const left  = arr.slice(l, m + 1);
    const right = arr.slice(m + 1, r + 1);
    let i = 0, j = 0, k = l;

    while (i < left.length && j < right.length) {
      // record COMPARE frame
      f.push({
        arr:  [...arr],
        hl:   [
          { idx: l + i,     type: 'compare' },
          { idx: m + 1 + j, type: 'compare' }
        ],
        comp: 1,
        swap: 0
      });

      if (left[i] <= right[j]) { arr[k++] = left[i++]; }
      else                      { arr[k++] = right[j++]; }

      // record MERGE frame
      f.push({
        arr:  [...arr],
        hl:   [{ idx: k - 1, type: 'merge' }],
        comp: 0,
        swap: 1
      });
    }

    while (i < left.length)  { arr[k++] = left[i++];  f.push({ arr: [...arr], hl: [{ idx: k-1, type: 'merge' }], comp: 0, swap: 0 }); }
    while (j < right.length) { arr[k++] = right[j++]; f.push({ arr: [...arr], hl: [{ idx: k-1, type: 'merge' }], comp: 0, swap: 0 }); }
  }

  mergeSort(a, 0, a.length - 1);

  f.push({
    arr:  [...a],
    hl:   Array.from({ length: a.length }, (_, i) => ({ idx: i, type: 'sorted' })),
    comp: 0,
    swap: 0,
    done: true
  });
  return f;
}

/* ══════════════════════════════════════
   PLAYBACK
══════════════════════════════════════ */
function startSort() {
  if (isRunning && !isPaused) return;

  if (!isRunning) {
    // collect all frames before animating
    if (currentAlgo === 'bubble')    frames = collectBubble([...array]);
    if (currentAlgo === 'selection') frames = collectSelection([...array]);
    if (currentAlgo === 'merge')     frames = collectMerge([...array]);
    frameIdx = 0;
    resetStats();
  }

  isRunning = true;
  isPaused  = false;
  document.getElementById('btn-play').disabled  = true;
  document.getElementById('btn-pause').disabled = false;
  document.getElementById('btn-reset').disabled = false;
  setStatus('Sorting...');
  playFrames();
}

function playFrames() {
  const delay = speedMap[document.getElementById('speed-slider').value];

  animTimer = setInterval(() => {
    if (frameIdx >= frames.length) {
      clearInterval(animTimer);
      isRunning = false;
      document.getElementById('btn-play').disabled  = false;
      document.getElementById('btn-pause').disabled = true;
      return;
    }

    const frame = frames[frameIdx++];
    draw(frame.arr, frame.hl);

    totalComparisons += frame.comp || 0;
    totalSwaps       += frame.swap || 0;
    document.getElementById('stat-comparisons').textContent = totalComparisons;
    document.getElementById('stat-swaps').textContent       = totalSwaps;

    if (frame.done) {
      clearInterval(animTimer);
      isRunning = false;
      setStatus('Done!');
      document.getElementById('btn-play').disabled  = false;
      document.getElementById('btn-pause').disabled = true;
      document.getElementById('done-overlay').classList.add('show');
      setTimeout(() => document.getElementById('done-overlay').classList.remove('show'), 1800);
    }
  }, delay);
}

function pauseSort() {
  if (!isRunning || isPaused) return;
  clearInterval(animTimer);
  isPaused  = true;
  isRunning = false;
  document.getElementById('btn-play').disabled  = false;
  document.getElementById('btn-pause').disabled = true;
  setStatus('Paused');
}

function resetAll() {
  clearInterval(animTimer);
  isRunning = false;
  isPaused  = false;
  document.getElementById('btn-play').disabled  = false;
  document.getElementById('btn-pause').disabled = true;
  document.getElementById('done-overlay').classList.remove('show');
  generateArray(parseInt(document.getElementById('size-slider').value));
  setStatus('Ready');
}

/* ══════════════════════════════════════
   SLIDERS
══════════════════════════════════════ */
document.getElementById('size-slider').addEventListener('input', function () {
  if (isRunning) return;
  document.getElementById('size-val').textContent  = this.value;
  document.getElementById('stat-size').textContent = this.value;
  generateArray(parseInt(this.value));
});

document.getElementById('speed-slider').addEventListener('input', function () {
  document.getElementById('speed-val').textContent = speedLabel[this.value];
  if (isRunning && !isPaused) {
    clearInterval(animTimer);
    playFrames();
  }
});

/* ══════════════════════════════════════
   PSEUDOCODE
══════════════════════════════════════ */
function getPseudocode(algo) {
  if (algo === 'bubble') {
    return `<span class="hlp">function</span> <span class="hl">bubbleSort</span>(arr):
  <span class="hlp">for</span> i = 0 <span class="hlp">to</span> n-1:
    <span class="hlp">for</span> j = 0 <span class="hlp">to</span> n-i-2:
      <span class="hly">compare</span> arr[j] and arr[j+1]   <span style="color:#4a5568">← yellow bars</span>
      <span class="hlp">if</span> arr[j] > arr[j+1]:
        <span class="hlr">swap</span>(arr[j], arr[j+1])       <span style="color:#4a5568">← red bars</span>
    <span class="hlg">mark</span> arr[n-i-1] as sorted       <span style="color:#4a5568">← green bar</span>`;
  }
  if (algo === 'selection') {
    return `<span class="hlp">function</span> <span class="hl">selectionSort</span>(arr):
  <span class="hlp">for</span> i = 0 <span class="hlp">to</span> n-1:
    minIdx = i                        <span style="color:#4a5568">← purple bar (current min)</span>
    <span class="hlp">for</span> j = i+1 <span class="hlp">to</span> n:
      <span class="hly">compare</span> arr[j] with arr[minIdx] <span style="color:#4a5568">← yellow bars</span>
      <span class="hlp">if</span> arr[j] < arr[minIdx]:
        minIdx = j
    <span class="hlr">swap</span>(arr[i], arr[minIdx])         <span style="color:#4a5568">← red bars</span>
    <span class="hlg">mark</span> arr[i] as sorted              <span style="color:#4a5568">← green bar</span>`;
  }
  if (algo === 'merge') {
    return `<span class="hlp">function</span> <span class="hl">mergeSort</span>(arr, left, right):
  <span class="hlp">if</span> left >= right: <span class="hlp">return</span>
  mid = (left + right) / 2
  mergeSort(arr, left, mid)         <span style="color:#4a5568">← sort left half</span>
  mergeSort(arr, mid+1, right)      <span style="color:#4a5568">← sort right half</span>
  merge(arr, left, mid, right)      <span style="color:#4a5568">← combine (purple bars)</span>

  <span style="color:#4a5568">Divides until single elements,
  then merges back in sorted order.</span>`;
  }
}

/* ══════════════════════════════════════
   INIT — runs when page loads
══════════════════════════════════════ */
window.addEventListener('load', () => {
  document.getElementById('complexity-badge').innerHTML = complexityInfo['bubble'].text;
  document.getElementById('pseudocode').innerHTML       = getPseudocode('bubble');
  document.getElementById('stat-size').textContent      = '40';
  setTimeout(() => {
    resizeCanvas();
    generateArray(40);
  }, 100);
});
