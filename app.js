/* ============================================================
   COEN FAMILY AUTO: STRIPE RECONCILIATION TOOL
   app.js — v2: deterministic HTML generation (no Claude API for email building)
   Email HTML is built directly from xlsx data in JS, matching the exact
   working email format. Only the Gmail MCP draft creation uses the API.
   ============================================================ */

// ---- STATE ----
const state = {
  matos: null,
  courtesy: null,
  running: false
};

// ---- DOM REFS ----
const $ = id => document.getElementById(id);
const runBtn = $('run-btn');
const runHint = $('run-hint');
const progressSection = $('progress-section');
const progressLog = $('progress-log');
const progressTitle = $('progress-title');
const progressSpinner = $('progress-spinner');
const resultsSection = $('results-section');
const resultsList = $('results-list');
const errorSection = $('error-section');
const errorMessage = $('error-message');
const noKeyBanner = $('no-key-banner');

// ---- API KEY ----
const KEY_STORAGE = 'cfa_anthropic_key';
function getKey() { return localStorage.getItem(KEY_STORAGE) || ''; }
function saveKey(k) { localStorage.setItem(KEY_STORAGE, k); }
function clearKey() { localStorage.removeItem(KEY_STORAGE); }

function checkKeyBanner() {
  noKeyBanner.classList.toggle('hidden', !!getKey());
}

$('settings-btn').addEventListener('click', () => {
  $('settings-modal').classList.remove('hidden');
  $('api-key-input').value = getKey();
  $('key-status').textContent = '';
});
$('settings-close').addEventListener('click', () => $('settings-modal').classList.add('hidden'));
$('settings-modal').addEventListener('click', e => {
  if (e.target === $('settings-modal')) $('settings-modal').classList.add('hidden');
});
$('toggle-key-vis').addEventListener('click', () => {
  const inp = $('api-key-input');
  const showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  $('toggle-key-vis').textContent = showing ? 'Show' : 'Hide';
});
$('save-key-btn').addEventListener('click', () => {
  const val = $('api-key-input').value.trim();
  if (!val.startsWith('sk-ant-')) {
    $('key-status').textContent = 'Key should start with sk-ant- — double-check and try again.';
    $('key-status').className = 'key-status err';
    return;
  }
  saveKey(val);
  $('key-status').textContent = 'Key saved.';
  $('key-status').className = 'key-status ok';
  checkKeyBanner();
  setTimeout(() => $('settings-modal').classList.add('hidden'), 900);
});
$('clear-key-btn').addEventListener('click', () => {
  clearKey();
  $('api-key-input').value = '';
  $('key-status').textContent = 'Key cleared.';
  $('key-status').className = 'key-status';
  checkKeyBanner();
});

// ---- FILE UPLOAD ----
function setupFileZone(company) {
  const dropEl = $(`${company}-drop`);
  const fileInput = $(`${company}-file`);
  const fileInfo = $(`${company}-file-info`);
  const statusEl = $(`${company}-status`);

  function handleFile(file) {
    if (!file || !file.name.endsWith('.xlsx')) {
      log('err', `${company}: must be an .xlsx file.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        state[company] = { name: file.name, rows };
        fileInfo.innerHTML = `<span class="file-info-name">&#10003; ${file.name}</span><button class="file-remove" data-company="${company}">&times;</button>`;
        fileInfo.classList.remove('hidden');
        dropEl.querySelector('.drop-content').style.opacity = '.4';
        statusEl.textContent = `${rows.length} rows`;
        statusEl.className = 'card-status status-ready';
        updateRunButton();
      } catch (err) {
        statusEl.textContent = 'Parse error';
        statusEl.className = 'card-status status-error';
        showError(`Could not read ${company} file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
  dropEl.addEventListener('dragover', e => { e.preventDefault(); dropEl.classList.add('drag-over'); });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('drag-over'));
  dropEl.addEventListener('drop', e => { e.preventDefault(); dropEl.classList.remove('drag-over'); handleFile(e.dataTransfer.files[0]); });
  fileInfo.addEventListener('click', e => {
    if (e.target.dataset.company) {
      state[e.target.dataset.company] = null;
      fileInfo.classList.add('hidden');
      fileInfo.innerHTML = '';
      dropEl.querySelector('.drop-content').style.opacity = '1';
      fileInput.value = '';
      statusEl.textContent = '';
      statusEl.className = 'card-status';
      updateRunButton();
    }
  });
}

setupFileZone('matos');
setupFileZone('courtesy');

function updateRunButton() {
  const hasFile = state.matos || state.courtesy;
  runBtn.disabled = !hasFile || state.running;
  if (!hasFile) runHint.textContent = 'Upload at least one file to continue.';
  else if (state.matos && state.courtesy) runHint.textContent = 'Both companies ready.';
  else runHint.textContent = `${state.matos ? 'Matos' : 'Courtesy'} ready. Add the other file too, or run with one.`;
}

// ---- LOGGING ----
function log(type, msg) {
  const now = new Date().toLocaleTimeString('en-US', { hour12: false });
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `<span class="log-time">${now}</span><span class="log-${type}">${msg}</span>`;
  progressLog.appendChild(line);
  progressLog.scrollTop = progressLog.scrollHeight;
}

// ---- COMPANY CONFIG ----
const COMPANY_CONFIG = {
  matos: {
    name: 'Matos Auto Towing & Transport',
    nameHtml: 'Matos Auto Towing &amp; Transport',
    nameUpper: 'MATOS AUTO TOWING &amp; TRANSPORT',
    accent: '#1f4e79',
    headerBorder: '#b8d4e8',
    rowBg: '#deeaf5',
    bank: 'Wells Fargo ending in 6555',
    bankShort: 'Wells Fargo *6555',
    subjectPrefix: 'Matos',
    to: ['acoen@coenfamilyauto.com', 'sandovalrobert1958@gmail.com', 'gymags@hotmail.com'],
    cc: ['ksleeth@coenfamilyauto.com', 'dsandoval@coenfamilyauto.com'],
  },
  courtesy: {
    name: 'Courtesy Towing',
    nameHtml: 'Courtesy Towing',
    nameUpper: 'COURTESY TOWING',
    accent: '#1f6b2e',
    headerBorder: '#b8dbb8',
    rowBg: '#d6eedd',
    bank: 'Chase ending in 5518',
    bankShort: 'Chase *5518',
    subjectPrefix: 'Courtesy Towing',
    to: ['acoen@coenfamilyauto.com', 'sandovalrobert1958@gmail.com'],
    cc: ['ksleeth@coenfamilyauto.com', 'dsandoval@coenfamilyauto.com'],
  }
};

// ---- DATA HELPERS ----
function fv(val) { return parseFloat(val) || 0; }

function fmtUsd(val) {
  const v = fv(val);
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `-$${abs}` : `$${abs}`;
}

function fmtFeeDisplay(val) {
  const v = fv(val);
  if (v === 0) return '$0.00';
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `-$${abs}`;
}

function fmtPct(fee, gross) {
  const g = fv(gross), f = fv(fee);
  if (g === 0) return '0.00%';
  return (Math.abs(f) / g * 100).toFixed(2) + '%';
}

function fmtDepositHeading(dt) {
  // dt is a JS Date
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[dt.getUTCDay()]}, ${months[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
}

function fmtDayCol(dt) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${days[dt.getUTCDay()]} ${dt.getUTCMonth()+1}/${dt.getUTCDate()}`;
}

function fmtShortTs(dt) {
  if (!dt) return '';
  const m = dt.getUTCMonth()+1, d = dt.getUTCDate(), y = dt.getUTCFullYear();
  const h = dt.getUTCHours(), min = String(dt.getUTCMinutes()).padStart(2,'0');
  return `${m}/${d}/${y} ${h}:${min}`;
}

function excelDateToJs(val) {
  // XLSX.js returns dates as JS Date objects when using sheet_to_json with dateNF
  // but sometimes as numbers — handle both
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel serial date: days since 1900-01-01 (with Lotus 1-2-3 bug for 1900)
    const ms = (val - 25569) * 86400 * 1000;
    return new Date(ms);
  }
  if (typeof val === 'string' && val) {
    const d = new Date(val);
    if (!isNaN(d)) return d;
  }
  return null;
}

function getCallNum(row) {
  const meta = row['payment_metadata[calls]'];
  if (meta !== undefined && meta !== null && meta !== '') {
    const s = String(meta).trim();
    const n = parseFloat(s);
    if (!isNaN(n)) return String(Math.round(n));
    return s;
  }
  const desc = String(row['description'] || '');
  const m = desc.match(/#\s*(\d+)/);
  return m ? m[1] : '';
}

function getTypeLabel(row) {
  const cat = String(row['reporting_category'] || '').toLowerCase();
  return { charge: 'Charge', refund: 'Refund', dispute_reversal: 'Dispute Reversal', fee: 'Stripe Fee' }[cat] || cat;
}

function getPayoutDate(rows) {
  for (const r of rows) {
    const v = r['automatic_payout_effective_at_utc'];
    const d = excelDateToJs(v);
    if (d) return d;
  }
  return null;
}

// ---- EMAIL HTML BUILDER ----
function buildEmailHtml(rows, config) {
  const { accent, headerBorder, rowBg } = config;

  // Group by payout
  const byPayout = {};
  for (const r of rows) {
    const pid = r['automatic_payout_id'] || 'unknown';
    if (!byPayout[pid]) byPayout[pid] = [];
    byPayout[pid].push(r);
  }

  const sortedPayouts = Object.entries(byPayout).sort((a, b) => {
    const da = getPayoutDate(a[1]), db = getPayoutDate(b[1]);
    return (da || 0) - (db || 0);
  });

  // Totals
  const totalGross = rows.reduce((s, r) => s + fv(r['gross']), 0);
  const totalFee   = rows.reduce((s, r) => s + fv(r['fee']), 0);
  const totalNet   = rows.reduce((s, r) => s + fv(r['net']), 0);
  const nItems     = rows.length;
  const nDeposits  = sortedPayouts.length;
  const effRate    = fmtPct(totalFee, totalGross);

  const dates = sortedPayouts.map(([,pr]) => getPayoutDate(pr)).filter(Boolean);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const periodStart = dates.length ? `${months[dates[0].getUTCMonth()]} ${dates[0].getUTCDate()}` : '';
  const periodEnd   = dates.length ? `${months[dates[dates.length-1].getUTCMonth()]} ${dates[dates.length-1].getUTCDate()}, ${dates[dates.length-1].getUTCFullYear()}` : '';
  const periodStr   = `${periodStart} to ${periodEnd}`;

  let html = `<html>\n<head>\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n</head>\n<body>\n<div dir="ltr">\n`;
  html += `<div style="max-width:820px;margin:0px auto;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;line-height:1.5;padding:8px 0px 16px">\n`;
  html += `<p style="color:rgb(34,34,34);margin:0px 0px 12px">Hi all,</p>\n`;
  html += `<p style="color:rgb(34,34,34);margin:0px 0px 12px">Please see the Stripe deposit reconciliation for <strong>${config.nameHtml}</strong> from the period <strong>${periodStr}</strong>.</p>\n`;
  html += `</div>\n<div>\n<div style="max-width:820px;margin:0 auto;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#222">\n`;

  // Header banner
  html += `<div style="color:${accent};padding:10px 16px;border-radius:6px 6px 0 0;font-weight:700;letter-spacing:0.05em;font-size:14px">${config.nameUpper}</div>\n`;
  html += `<div style="border:1px solid ${headerBorder};border-top:none;border-radius:0 0 6px 6px;padding:18px 18px 22px">\n`;
  html += `<h2 style="color:#111;margin:0 0 4px 0;font-size:18px">${config.nameHtml} &#8212; Deposit Reconciliation</h2>\n`;
  html += `<div style="color:#555;font-size:13px;margin-bottom:14px">${periodStr} &middot; deposits to ${config.bank}</div>\n`;

  // Summary cards
  html += `<table cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;margin:8px 0 0 0"><tbody><tr>\n`;
  html += `<td style="border:1px solid #d4d4d8;border-radius:6px;padding:14px;width:33%"><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.05em">Gross Charged</div><div style="font-size:20px;font-weight:600;color:#111;margin-top:2px">${fmtUsd(totalGross)}</div><div style="font-size:11px;color:#666;margin-top:2px">${nItems} line items, ${nDeposits} deposits</div></td>\n`;
  html += `<td style="width:8px"></td>\n`;
  html += `<td style="border:1px solid #d4d4d8;border-radius:6px;padding:14px;width:33%"><div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.05em">Stripe Fees</div><div style="font-size:20px;font-weight:600;color:#111;margin-top:2px">${fmtFeeDisplay(totalFee)}</div><div style="font-size:11px;color:#666;margin-top:2px">${effRate} effective</div></td>\n`;
  html += `<td style="width:8px"></td>\n`;
  html += `<td style="border:1px solid #d4d4d8;border-radius:6px;padding:14px;width:33%"><div style="font-size:11px;color:${accent};text-transform:uppercase;letter-spacing:0.05em">Deposited (Net)</div><div style="font-size:20px;font-weight:600;color:${accent};margin-top:2px">${fmtUsd(totalNet)}</div><div style="font-size:11px;color:${accent};margin-top:2px">${config.bankShort}</div></td>\n`;
  html += `</tr></tbody></table>\n`;

  // Deposits by day
  html += `<div style="border:1px solid #d4d4d8;border-radius:6px;margin:16px 0;overflow:hidden">\n`;
  html += `<div style="color:${accent};padding:8px 14px;border-bottom:1px solid #d4d4d8;font-weight:600">Deposits by day</div>\n`;
  html += `<table cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;font-size:13px;color:#222"><thead><tr>`;
  html += `<th style="padding:6px 7px;text-align:left;border-bottom:1px solid #ddd">Deposit day</th>`;
  html += `<th style="padding:6px 7px;text-align:right;border-bottom:1px solid #ddd"># items</th>`;
  html += `<th style="padding:6px 7px;text-align:right;border-bottom:1px solid #ddd">Gross</th>`;
  html += `<th style="padding:6px 7px;text-align:right;border-bottom:1px solid #ddd">Stripe Fee</th>`;
  html += `<th style="padding:6px 7px;text-align:right;border-bottom:1px solid #ddd">Net deposit</th>`;
  html += `</tr></thead><tbody>\n`;

  for (const [, prows] of sortedPayouts) {
    const dt = getPayoutDate(prows);
    const g = prows.reduce((s,r)=>s+fv(r['gross']),0);
    const f = prows.reduce((s,r)=>s+fv(r['fee']),0);
    const n = prows.reduce((s,r)=>s+fv(r['net']),0);
    html += `<tr><td style="padding:5px 7px;border-bottom:1px solid #eee">${dt?fmtDayCol(dt):''}</td>`;
    html += `<td style="padding:5px 7px;border-bottom:1px solid #eee;text-align:right">${prows.length}</td>`;
    html += `<td style="padding:5px 7px;border-bottom:1px solid #eee;text-align:right">${fmtUsd(g)}</td>`;
    html += `<td style="padding:5px 7px;border-bottom:1px solid #eee;text-align:right;color:#aa3333">${fmtFeeDisplay(f)}</td>`;
    html += `<td style="padding:5px 7px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${accent}">${fmtUsd(n)}</td></tr>\n`;
  }
  html += `<tr style="font-weight:700;background-color:#f0f4f8">`;
  html += `<td style="padding:6px 7px;border-top:2px solid #d4d4d8">Period total</td>`;
  html += `<td style="padding:6px 7px;border-top:2px solid #d4d4d8;text-align:right">${nItems}</td>`;
  html += `<td style="padding:6px 7px;border-top:2px solid #d4d4d8;text-align:right">${fmtUsd(totalGross)}</td>`;
  html += `<td style="padding:6px 7px;border-top:2px solid #d4d4d8;text-align:right;color:#aa3333">${fmtFeeDisplay(totalFee)}</td>`;
  html += `<td style="padding:6px 7px;border-top:2px solid #d4d4d8;text-align:right;color:${accent}">${fmtUsd(totalNet)}</td></tr>\n`;
  html += `</tbody></table></div>\n`;

  // Deposit detail
  html += `<div style="font-weight:600;font-size:14px;margin:18px 0 4px 0;color:#111">Deposit detail &#8212; every transaction grouped by deposit</div>\n`;
  html += `<div style="color:#666;font-size:12px;margin-bottom:8px">Each colored header row is one bank deposit. The rows under it are the customer payments (and any refunds/chargebacks) that make it up &#8212; match each row&#39;s date and amount to the tow.</div>\n`;
  html += `<table cellpadding="4" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:13px;color:#222;border:1px solid #d4d4d8;border-radius:6px;margin:10px 0">\n`;
  html += `<thead><tr><th align="left">Charged on (UTC)</th><th align="left">Type</th><th align="left">Call #</th><th align="right">Gross</th><th align="right">Stripe Fee</th><th align="right">Net</th></tr></thead>\n<tbody>\n`;

  for (const [, prows] of sortedPayouts) {
    const dt = getPayoutDate(prows);
    const depNet   = prows.reduce((s,r)=>s+fv(r['net']),0);
    const depGross = prows.reduce((s,r)=>s+fv(r['gross']),0);
    const depFee   = prows.reduce((s,r)=>s+fv(r['fee']),0);

    // Find duplicate call numbers
    const callNums = prows.map(r => getCallNum(r)).filter(Boolean);
    const dupes = new Set(callNums.filter((c,i) => callNums.indexOf(c) !== i));

    html += `<tr bgcolor="${rowBg}"><td colspan="6" style="padding:0;border-top:1px solid ${headerBorder};border-bottom:1px solid ${headerBorder}"><div style="background-color:${rowBg};padding:8px 10px">`;
    html += `<span style="font-size:12px;color:${accent};text-transform:uppercase;letter-spacing:.04em">${dt?fmtDepositHeading(dt):''}</span>`;
    html += `<span style="font-size:14px;font-weight:700;color:#111;margin-left:12px">Bank deposit: <span style="color:${accent}">${fmtUsd(depNet)}</span></span>`;
    html += `</div></td></tr>\n`;

    for (const r of prows) {
      const grossV = fv(r['gross']), feeV = fv(r['fee']), netV = fv(r['net']);
      const call = getCallNum(r);
      const callDisplay = call ? (dupes.has(call) ? call + '*' : call) : '';
      const typeLabel = getTypeLabel(r);
      const createdDt = excelDateToJs(r['created_utc']);
      const chargedTs = createdDt ? fmtShortTs(createdDt) : '';

      const grossStyle = grossV < 0 ? 'color:#aa3333' : '';
      const netColor = netV < 0 ? 'color:#aa3333' : '';

      html += `<tr>`;
      html += `<td style="padding:4px 7px">${chargedTs}</td>`;
      html += `<td style="padding:4px 7px">${typeLabel}</td>`;
      html += `<td style="padding:4px 7px">${callDisplay}</td>`;
      html += `<td align="right" style="padding:4px 7px;${grossStyle}">${fmtUsd(grossV)}</td>`;
      html += `<td align="right" style="padding:4px 7px;color:#aa3333">${fmtFeeDisplay(feeV)}</td>`;
      html += `<td align="right" style="padding:4px 7px;font-weight:600;${netColor}">${fmtUsd(netV)}</td>`;
      html += `</tr>\n`;
    }

    html += `<tr style="font-weight:600"><td colspan="3" style="padding:4px 6px">Deposit total (${prows.length} item${prows.length!==1?'s':''})</td>`;
    html += `<td align="right" style="padding:4px 7px">${fmtUsd(depGross)}</td>`;
    html += `<td align="right" style="padding:4px 7px;color:#aa3333">${fmtFeeDisplay(depFee)}</td>`;
    html += `<td align="right" style="padding:4px 7px;color:${accent}">${fmtUsd(depNet)}</td></tr>\n`;

    for (const d of dupes) {
      html += `<tr><td colspan="6" style="padding:2px 8px;font-size:11px;color:#8a6200;background-color:#fffbeb">* Call #${d} appears more than once in this deposit. Both charges are included as shown.</td></tr>\n`;
    }
  }

  html += `</tbody></table>\n</div>\n`;
  html += `<div style="margin-top:20px;font-size:13px;color:#444">Kat </div>\n`;
  html += `</div></div></div>\n</body>\n</html>`;

  return { html, periodStr };
}

// ---- GMAIL DRAFT VIA CLAUDE API ----
async function createGmailDraft(companyKey, emailHtml, periodStr, apiKey) {
  const config = COMPANY_CONFIG[companyKey];
  const subject = `${config.subjectPrefix}: Stripe Deposit Reconciliation (${periodStr})`;
  const plainText = `Hi all,\n\nPlease see the Stripe deposit reconciliation for ${config.name} from the period ${periodStr}.\n\nKat`;

  const toList = config.to.join(', ');
  const ccList = config.cc.join(', ');

  const prompt = `Create a Gmail draft using the Gmail MCP create_draft tool with these exact details:

To: ${toList}
CC: ${ccList}
Subject: ${subject}
Plain text body: ${plainText}
HTML body: the full HTML provided below

Use the create_draft tool now. The htmlBody parameter should contain the full HTML.

HTML:
${emailHtml}`;

  const response = await fetch('/.netlify/functions/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
      mcp_servers: [{ type: 'url', url: 'https://gmailmcp.googleapis.com/mcp/v1', name: 'gmail-mcp' }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API error ${response.status}: ${err?.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const text = (result.content || []).filter(b => b.type === 'text').map(b => b.text).join(' ').toLowerCase();
  if (text.includes('error') && !text.includes('draft')) {
    throw new Error('Gmail draft creation may have failed. Check Gmail drafts manually.');
  }
  return subject;
}

// ---- RUN ----
runBtn.addEventListener('click', runReconciliation);

$('reset-btn').addEventListener('click', () => {
  state.matos = null;
  state.courtesy = null;
  ['matos','courtesy'].forEach(c => {
    $(`${c}-file-info`).classList.add('hidden');
    $(`${c}-file-info`).innerHTML = '';
    $(`${c}-drop`).querySelector('.drop-content').style.opacity = '1';
    $(`${c}-file`).value = '';
    $(`${c}-status`).textContent = '';
    $(`${c}-status`).className = 'card-status';
  });
  progressSection.classList.add('hidden');
  progressLog.innerHTML = '';
  resultsSection.classList.add('hidden');
  resultsList.innerHTML = '';
  errorSection.classList.add('hidden');
  updateRunButton();
});

async function runReconciliation() {
  const apiKey = getKey();
  if (!apiKey) { showError('No API key found. Open Settings and add your Anthropic API key first.'); return; }

  state.running = true;
  runBtn.disabled = true;
  errorSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  progressLog.innerHTML = '';
  progressTitle.textContent = 'Processing...';
  progressSpinner.style.display = 'inline-block';

  const results = [];

  try {
    const companies = [];
    if (state.matos)    companies.push({ key: 'matos',   label: 'Matos Auto Towing & Transport' });
    if (state.courtesy) companies.push({ key: 'courtesy', label: 'Courtesy Towing' });

    for (const company of companies) {
      log('info', `${company.label}: building email...`);
      try {
        const config = COMPANY_CONFIG[company.key];
        const { html, periodStr } = buildEmailHtml(state[company.key].rows, config);
        log('ok', `${company.label}: email built (${state[company.key].rows.length} rows).`);
        log('info', `${company.label}: creating Gmail draft...`);
        const subject = await createGmailDraft(company.key, html, periodStr, apiKey);
        results.push({ company: company.label, subject, success: true });
        log('ok', `${company.label}: draft created.`);
      } catch (err) {
        log('err', `${company.label}: ${err.message}`);
        results.push({ company: company.label, error: err.message });
      }
    }

    progressTitle.textContent = 'Done';
    progressSpinner.style.display = 'none';
    showResults(results);
  } catch (err) {
    progressSpinner.style.display = 'none';
    showError(err.message);
  } finally {
    state.running = false;
    updateRunButton();
  }
}

function showResults(results) {
  resultsList.innerHTML = '';
  for (const r of results) {
    const item = document.createElement('div');
    item.className = 'result-item';
    if (r.error) {
      item.style.cssText = 'background:#fef2f2;border-color:#fca5a5';
      item.innerHTML = `<div class="result-icon">&#9888;</div><div><div class="result-label" style="color:#991b1b">${r.company}</div><div class="result-sub" style="color:#991b1b">Error: ${r.error}</div></div>`;
    } else {
      item.innerHTML = `<div class="result-icon">&#9989;</div><div><div class="result-label">${r.company}</div><div class="result-sub">Draft created: ${r.subject}</div></div>`;
    }
    resultsList.appendChild(item);
  }
  resultsSection.classList.remove('hidden');
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorSection.classList.remove('hidden');
  errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

checkKeyBanner();
updateRunButton();
