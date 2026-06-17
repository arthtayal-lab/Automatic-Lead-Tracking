// ============================================================================
// ZYPP ELECTRIC LEAD DASHBOARD - MAIN APPLICATION LOGIC
// ============================================================================

// --- Config & State Management ---
const CONFIG = {
  REFRESH_INTERVAL_SEC: 300, // 5 minutes
  DEFAULT_FRANCHISE_ID: '1WQTGGj2A6qIWC9UVGqOd_mhksbtCM_oD_WSZwpy9_9k',
  DEFAULT_ADS_ID: '1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o',
  SOURCES: [
    { key: 'delivery', name: 'Delivery Services', fallbackColor: '#00d2ff' },
    { key: 'fleetease', name: 'Fleetease.ai', fallbackColor: '#a855f7' },
    { key: 'franchise', name: 'Franchise', fallbackColor: '#76ff03' },
    { key: 'ads', name: 'Ads', fallbackColor: '#f97316' },
    { key: 'riders', name: 'Riders', fallbackColor: '#3b82f6' }
  ]
};

let state = {
  sheetIds: {
    delivery: '',
    fleetease: '',
    franchise: CONFIG.DEFAULT_FRANCHISE_ID,
    ads: CONFIG.DEFAULT_ADS_ID,
    riders: ''
  },
  demoMode: true,
  lastUpdated: null,
  allLeads: {
    delivery: [],
    fleetease: [],
    franchise: [],
    ads: [],
    riders: []
  },
  errors: {
    delivery: null,
    fleetease: null,
    franchise: null,
    ads: null,
    riders: null
  },
  countdownSeconds: CONFIG.REFRESH_INTERVAL_SEC,
  countdownInterval: null,
  activeChart: null,
  activeDrilldownLeads: [],
  activeDrilldownTitle: ''
};

// --- Initializing UI Elements ---
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initApp();
  setupEventListeners();
  
  // Start Initial Fetch
  fetchAndRenderAll();
  
  // Start Countdown Timer
  startTimer();
});

function initApp() {
  // Initialize Lucide Icons
  lucide.createIcons();
  
  // Check if warning banner should be visible
  updateWarningBanner();
}

// --- Load and Save Settings in LocalStorage ---
function loadSettings() {
  const savedIds = localStorage.getItem('zypp_sheet_ids');
  if (savedIds) {
    try {
      const parsed = JSON.parse(savedIds);
      state.sheetIds = {
        ...state.sheetIds,
        ...parsed,
        franchise: parsed.franchise || CONFIG.DEFAULT_FRANCHISE_ID,
        ads: parsed.ads || CONFIG.DEFAULT_ADS_ID
      };
    } catch (e) {
      console.error('Error parsing saved sheet IDs from localStorage:', e);
    }
  }
  
  const savedDemo = localStorage.getItem('zypp_demo_mode');
  if (savedDemo !== null) {
    state.demoMode = savedDemo === 'true';
    document.getElementById('toggle-demo').checked = state.demoMode;
  }
}

function saveSettings() {
  localStorage.setItem('zypp_sheet_ids', JSON.stringify(state.sheetIds));
  localStorage.setItem('zypp_demo_mode', state.demoMode);
  updateWarningBanner();
}

function updateWarningBanner() {
  const warningBanner = document.getElementById('settings-warning');
  const hasEmptyActiveIds = CONFIG.SOURCES.some(s => !state.sheetIds[s.key]);
  
  // Check if we have any fetch errors to display in warning banner
  const activeErrors = CONFIG.SOURCES.filter(s => state.errors[s.key]);
  
  if (activeErrors.length > 0) {
    const errText = activeErrors.map(s => `${s.name}: ${state.errors[s.key]}`).join(' | ');
    warningBanner.innerHTML = `<i data-lucide="alert-triangle"></i><span><strong>Fetch Errors:</strong> ${errText}. Please check the Sheet IDs and ensure the sheets are shared publicly ("Anyone with link can view").</span>`;
    warningBanner.classList.remove('banner-warning');
    warningBanner.classList.add('banner-warning');
    warningBanner.classList.remove('hidden');
    lucide.createIcons();
  } else if (hasEmptyActiveIds && state.demoMode) {
    warningBanner.innerHTML = `<i data-lucide="alert-circle"></i><span>Some Google Sheet IDs are not configured. Click the <strong>Configure</strong> button at the top to add them. Demo Mode is currently displaying mock data for those sources.</span>`;
    warningBanner.classList.remove('banner-warning');
    warningBanner.classList.add('banner-warning');
    warningBanner.classList.remove('hidden');
    lucide.createIcons();
  } else {
    warningBanner.classList.add('hidden');
  }
}

// --- Date Parsing ---
function parseDate(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    // Handle 'Date(2024,0,15)' format from gviz
    if (dateVal.startsWith('Date(')) {
      const parts = dateVal.replace('Date(', '').replace(')', '').split(',');
      return new Date(parts[0], parts[1], parts[2]);
    }
    // Handle 'yyyy-mm-dd hh:mm:ss' or 'yyyy-mm-dd'
    const ymdMatch = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      return new Date(ymdMatch[1], parseInt(ymdMatch[2]) - 1, ymdMatch[3]);
    }
    // Handle 'dd/mm/yyyy'
    const dmyMatch = dateVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      return new Date(dmyMatch[3], parseInt(dmyMatch[2]) - 1, dmyMatch[1]);
    }
  }
  // Fallback
  return new Date(dateVal);
}

// --- Date Calculation Helpers ---
function getLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getRelativeDateString(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return getLocalDateString(d);
}

function getDateRanges() {
  const today = new Date();
  const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  
  return {
    today: getLocalDateString(today),
    y1: getRelativeDateString(1),
    y2: getRelativeDateString(2),
    y3: getRelativeDateString(3),
    y4: getRelativeDateString(4),
    mtdStart: getLocalDateString(startOfCurrentMonth),
    mtdEnd: getLocalDateString(today),
    lastMonthStart: getLocalDateString(startOfLastMonth),
    lastMonthEnd: getLocalDateString(endOfLastMonth)
  };
}

// --- Mock Data Generator (Demo Mode) ---
function generateMockLeads(sourceKey, sourceName) {
  const mockLeads = [];
  const ranges = getDateRanges();
  const todayDate = new Date();
  
  const dateWeights = [
    { offset: 0, countRange: [30, 70] },  // Today
    { offset: 1, countRange: [40, 80] },  // Y-1
    { offset: 2, countRange: [20, 40] },  // Y-2
    { offset: 3, countRange: [15, 35] },  // Y-3
    { offset: 4, countRange: [15, 30] },  // Y-4
    { offset: 5, countRange: [10, 25] },
    { offset: 6, countRange: [10, 20] },
    { offset: 7, countRange: [8, 18] },
    { offset: 8, countRange: [8, 15] },
    { offset: 9, countRange: [5, 15] },
    { offset: 10, countRange: [5, 12] },
    { offset: 11, countRange: [12, 28] },
    { offset: 12, countRange: [10, 20] },
    { offset: 13, countRange: [8, 15] }
  ];
  
  const currentMonthDays = todayDate.getDate();
  for (let i = 14; i < currentMonthDays; i++) {
    dateWeights.push({ offset: i, countRange: [3, 12] });
  }
  for (let i = currentMonthDays; i < currentMonthDays + 30; i++) {
    dateWeights.push({ offset: i, countRange: [1, 8] });
  }

  const names = ["Sourav Paul", "Pankaj Sharma", "Ankit Verma", "Ritu Chaudhary", "Vijay Kumar", "Neha Gupta", "Amit Singh", "Rajesh Patel", "Sanjay Dutt", "Priyanka Sen", "Rohan Mehta", "Deepak Rao", "Sunita Sharma", "Karan Johar", "Vikram Rathore", "Pooja Malhotra", "Manish Malhotra", "Preeti Joshi", "Arjun Kapoor", "Nisha Patel"];
  const cities = ["Delhi", "Gurugram", "Noida", "Faridabad", "Ghaziabad", "Mumbai", "Pune", "Bengaluru", "Hyderabad", "Chennai"];
  const statuses = ["Warm", "Cold", "Hot", "Converted", "Paid", "", "", "", "", ""];
  const interests = ["Intrested", "Not Intrested", "low investment", "rider", "follow up", "", "", "", ""];
  const pocs = ["Sumit", "Aditya", "Tarun", "Kunal", "Megha"];
  
  let idCounter = 1;
  
  dateWeights.forEach(weight => {
    const dStr = getRelativeDateString(weight.offset);
    const count = Math.floor(Math.random() * (weight.countRange[1] - weight.countRange[0] + 1)) + weight.countRange[0];
    
    for (let c = 0; c < count; c++) {
      const name = names[Math.floor(Math.random() * names.length)] + " " + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + ".";
      const email = name.toLowerCase().replace(/\s+/g, '') + idCounter + "@gmail.com";
      const mobile = "9" + Math.floor(100000000 + Math.random() * 900000000);
      const hour = String(Math.floor(Math.random() * 24)).padStart(2, '0');
      const min = String(Math.floor(Math.random() * 60)).padStart(2, '0');
      const sec = String(Math.floor(Math.random() * 60)).padStart(2, '0');
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const interest = interests[Math.floor(Math.random() * interests.length)];
      const poc = pocs[Math.floor(Math.random() * pocs.length)];
      
      mockLeads.push({
        name,
        email,
        mobile,
        dateStr: `${dStr} ${hour}:${min}:${sec}`,
        ymd: dStr,
        status,
        callInterest: interest,
        poc,
        city: cities[Math.floor(Math.random() * cities.length)]
      });
      idCounter++;
    }
  });
  
  return mockLeads;
}

// --- Fetching Sheet Data via JSONP (Bypasses CORS entirely) ---
function fetchSheetDataJSONP(sheetId, sourceKey) {
  return new Promise((resolve, reject) => {
    if (!sheetId) {
      resolve([]);
      return;
    }
    
    // Generate a unique callback function name to handle concurrent requests
    const callbackName = 'gviz_callback_' + Math.random().toString(36).substring(2, 15);
    
    // Create script element
    const script = document.createElement('script');
    let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&headers=1`;
    if (sourceKey === 'ads') {
      url += '&gid=2044633763';
    }
    script.src = url;
    script.id = callbackName;
    
    // Add cleanup and timeout
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Connection timed out. Check sheet visibility or ID.'));
    }, 15000);
    
    function cleanup() {
      clearTimeout(timeoutId);
      const scriptEl = document.getElementById(callbackName);
      if (scriptEl) scriptEl.remove();
      delete window[callbackName];
    }
    
    // Global callback handler
    window[callbackName] = function(data) {
      cleanup();
      try {
        const parsedLeads = parseGvizTable(data, sourceKey);
        resolve(parsedLeads);
      } catch (err) {
        reject(err);
      }
    };
    
    // Script loading error
    script.onerror = function() {
      cleanup();
      reject(new Error('Network error or sheet access restricted. Ensure "Anyone with link can view" is enabled.'));
    };
    
    // Append script to document to trigger request
    document.body.appendChild(script);
  });
}

// --- Parse Google Sheets gviz JSON Structure ---
function parseGvizTable(data, sourceKey) {
  const table = data.table;
  if (!table || !table.cols || !table.rows) {
    throw new Error('Invalid sheet structure. Ensure columns are not empty.');
  }
  
  const cols = table.cols;
  const rows = table.rows;
  
  // Dynamically map columns
  const colIndices = {
    name: -1,
    email: -1,
    mobile: -1,
    date: -1,
    leadStatus: -1,
    callInterest: -1,
    poc: -1,
    city: -1
  };
  
  cols.forEach((col, idx) => {
    const label = (col.label || '').trim().toLowerCase();
    
    if (label === 'name' || label === 'lead name' || label === 'full name') colIndices.name = idx;
    else if (label === 'email' || label === 'email id') colIndices.email = idx;
    else if (label === 'mobile' || label === 'mobile number' || label === 'phone' || label === 'contact' || label === 'mobile no') colIndices.mobile = idx;
    else if (label === 'date' || label === 'created date' || label === 'timestamp' || label === 'created at' || (label.includes('date') && !label.includes('calling') && !label.includes('followup') && !label.includes('follow up') && !label.includes('agreement') && !label.includes('expected'))) colIndices.date = idx;
    else if (label === 'lead status' || label === 'lead status ' || label === 'status') colIndices.leadStatus = idx;
    else if (label === 'call intrest' || label === 'call interest' || label === 'interest' || label === 'call status') colIndices.callInterest = idx;
    else if (label === 'lead poc' || label === 'poc' || label === 'owner of lead') colIndices.poc = idx;
    else if (label === 'city') colIndices.city = idx;
  });
  
  // Hard Fallbacks for automated sheets that lack proper headers
  if (sourceKey === 'ads') {
    if (colIndices.name === -1) colIndices.name = 2;
    if (colIndices.email === -1) colIndices.email = 3;
    if (colIndices.mobile === -1) colIndices.mobile = 4;
    if (colIndices.city === -1) colIndices.city = 5;
    if (colIndices.date === -1) colIndices.date = 1;
    if (colIndices.poc === -1) colIndices.poc = 12;
    if (colIndices.callInterest === -1) colIndices.callInterest = 14;
    if (colIndices.leadStatus === -1) colIndices.leadStatus = 18;
  } else {
    // Fallbacks based on the reference layout (Franchise Sheet structure)
    if (colIndices.name === -1) colIndices.name = 0;
    if (colIndices.email === -1) colIndices.email = 1;
    if (colIndices.mobile === -1) colIndices.mobile = 2;
    if (colIndices.city === -1) colIndices.city = 4;
    if (colIndices.date === -1) colIndices.date = 5;
    if (colIndices.poc === -1) colIndices.poc = 7;
    if (colIndices.callInterest === -1) colIndices.callInterest = 11;
    if (colIndices.leadStatus === -1) colIndices.leadStatus = 16;
  }
  
  const leads = [];
  rows.forEach(row => {
    const cells = row.c || [];
    
    const getVal = (idx) => {
      if (idx !== -1 && idx < cells.length && cells[idx] !== null && cells[idx] !== undefined) {
        const cell = cells[idx];
        if (cell.v !== null && cell.v !== undefined) {
          return String(cell.v).trim();
        }
        if (cell.f !== null && cell.f !== undefined) {
          return String(cell.f).trim();
        }
      }
      return '';
    };
    
    const name = getVal(colIndices.name);
    const email = getVal(colIndices.email);
    const mobile = getVal(colIndices.mobile);
    const dateStr = getVal(colIndices.date);
    const status = getVal(colIndices.leadStatus);
    const callInterest = getVal(colIndices.callInterest);
    const poc = getVal(colIndices.poc);
    const city = getVal(colIndices.city);
    
    // Skip empty rows
    if (!name && !email && !mobile && !dateStr) return;
    
    // Parse date into standard YYYY-MM-DD
    let ymd = '';
    if (dateStr) {
      const ymdMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
      const gvizDateMatch = dateStr.match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
      const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      
      if (ymdMatch) {
        ymd = ymdMatch[1];
      } else if (gvizDateMatch) {
        const y = gvizDateMatch[1];
        const m = String(Number(gvizDateMatch[2]) + 1).padStart(2, '0');
        const d = String(gvizDateMatch[3]).padStart(2, '0');
        ymd = `${y}-${m}-${d}`;
      } else if (dmyMatch) {
        const d = String(dmyMatch[1]).padStart(2, '0');
        const m = String(dmyMatch[2]).padStart(2, '0');
        const y = dmyMatch[3];
        ymd = `${y}-${m}-${d}`;
      } else {
        try {
          const parsedD = new Date(dateStr);
          if (!isNaN(parsedD.getTime())) {
            ymd = getLocalDateString(parsedD);
          }
        } catch(e) {}
      }
    }
    
    leads.push({
      name,
      email,
      mobile,
      dateStr,
      ymd,
      status,
      callInterest,
      poc,
      city
    });
  });
  
  return leads;
}

// --- Data Aggregation & Logic ---
function aggregateSourceData(leads) {
  const ranges = getDateRanges();
  const summary = {
    today: 0,
    y1: 0,
    y2: 0,
    y3: 0,
    y4: 0,
    mtd: 0,
    lastMonth: 0,
    total: leads.length,
    
    interested: 0,
    callAgain: 0,
    followup: 0,
    notInterested: 0,
    wrongNo: 0,
    blank: 0
  };
  
  leads.forEach(lead => {
    const ymd = lead.ymd;
    
    if (ymd === ranges.today) summary.today++;
    if (ymd === ranges.y1) summary.y1++;
    if (ymd === ranges.y2) summary.y2++;
    if (ymd === ranges.y3) summary.y3++;
    if (ymd === ranges.y4) summary.y4++;
    
    if (ymd >= ranges.mtdStart && ymd <= ranges.mtdEnd) summary.mtd++;
    if (ymd >= ranges.lastMonthStart && ymd <= ranges.lastMonthEnd) summary.lastMonth++;
    
    const statusVal = (lead.status || '').toLowerCase();
    const interestVal = (lead.callInterest || '').toLowerCase();
    
    const isCallAgain = statusVal.includes('call again') || interestVal.includes('call again');
    const isFollowup = statusVal.includes('followup') || statusVal.includes('follow up') || interestVal.includes('followup') || interestVal.includes('follow up');
    const isNotInterested = statusVal.includes('not interest') || statusVal.includes('not intrest') || interestVal.includes('not interest') || interestVal.includes('not intrest') || statusVal.includes('no interest') || interestVal.includes('no interest');
    const isInterested = (statusVal.includes('interested') || statusVal.includes('intrested') || interestVal.includes('interested') || interestVal.includes('intrested')) && !isNotInterested;
    const isWrongNo = statusVal.includes('wrong no') || statusVal.includes('wrong number') || interestVal.includes('wrong no') || interestVal.includes('wrong number');
    const isBlank = statusVal === '' && interestVal === '';
    
    if (isCallAgain) summary.callAgain++;
    if (isFollowup) summary.followup++;
    if (isInterested) summary.interested++;
    if (isNotInterested) summary.notInterested++;
    if (isWrongNo) summary.wrongNo++;
    if (isBlank) summary.blank++;
  });
  
  return summary;
}

// --- Fetch and Render Pipeline ---
async function fetchAndRenderAll() {
  const btnRefresh = document.getElementById('btn-refresh');
  btnRefresh.classList.add('loading');
  btnRefresh.disabled = true;
  btnRefresh.querySelector('span').innerText = 'Refreshing...';
  
  const fetchPromises = CONFIG.SOURCES.map(async (source) => {
    const sheetId = state.sheetIds[source.key];
    state.errors[source.key] = null; // Clear previous error
    
    try {
      const sheetId = state.sheetIds[source.key];
      if (sheetId) {
        state.allLeads[source.key] = await fetchSheetDataJSONP(sheetId, source.key);
      } else if (state.demoMode) {
        state.allLeads[source.key] = generateMockLeads(source.key, source.name);
      } else {
        state.allLeads[source.key] = [];
      }
    } catch (err) {
      console.error(`Error loading source ${source.name}:`, err);
      state.errors[source.key] = err.message || 'Error fetching data';
      state.allLeads[source.key] = [];
    }
  });
  
  await Promise.all(fetchPromises);
  
  state.lastUpdated = new Date();
  document.getElementById('last-updated-time').innerText = state.lastUpdated.toLocaleTimeString();
  
  updateWarningBanner();
  renderTimePeriodTable();
  renderStatusBreakdownTable();
  renderChart();
  
  btnRefresh.classList.remove('loading');
  btnRefresh.disabled = false;
  btnRefresh.querySelector('span').innerText = 'Refresh';
  
  // Restart Auto Countdown
  startTimer();
}

// --- Render Table 1: Time Periods ---
function renderTimePeriodTable() {
  const tbody = document.getElementById('time-perf-body');
  tbody.innerHTML = '';
  
  const totals = {
    today: 0, y1: 0, y2: 0, y3: 0, y4: 0, mtd: 0, lastMonth: 0, total: 0
  };
  
  CONFIG.SOURCES.forEach(source => {
    const leads = state.allLeads[source.key];
    const hasId = !!state.sheetIds[source.key];
    const isMocked = !hasId && state.demoMode;
    const hasError = !!state.errors[source.key];
    const summary = aggregateSourceData(leads);
    
    totals.today += summary.today;
    totals.y1 += summary.y1;
    totals.y2 += summary.y2;
    totals.y3 += summary.y3;
    totals.y4 += summary.y4;
    totals.mtd += summary.mtd;
    totals.lastMonth += summary.lastMonth;
    totals.total += summary.total;
    
    totals.callAgain = (totals.callAgain || 0) + summary.callAgain;
    totals.followup = (totals.followup || 0) + summary.followup;
    totals.interested = (totals.interested || 0) + summary.interested;
    totals.notInterested = (totals.notInterested || 0) + summary.notInterested;
    totals.wrongNo = (totals.wrongNo || 0) + summary.wrongNo;
    totals.blank = (totals.blank || 0) + summary.blank;
    
    const tr = document.createElement('tr');
    
    // Status Badge Indicator
    let sourceStatusClass = 'inactive';
    let statusTooltip = 'Not Configured';
    if (hasError) {
      sourceStatusClass = 'inactive';
      statusTooltip = `Error: ${state.errors[source.key]}`;
    } else if (hasId) {
      sourceStatusClass = 'active';
      statusTooltip = 'Connected to Google Sheets';
    } else if (isMocked) {
      sourceStatusClass = 'active';
      statusTooltip = 'Displaying Demo Mock Data';
    }
    
    // Label structure
    let errorBadge = '';
    if (hasError) {
      errorBadge = ` <span class="helper-badge text-danger" style="font-size:0.6rem; cursor:pointer;" title="${statusTooltip}">⚠️ Fetch Error</span>`;
    } else if (!hasId && isMocked) {
      errorBadge = ` <span class="helper-badge text-warning" style="font-size:0.6rem;">Demo</span>`;
    } else if (!hasId && !isMocked) {
      errorBadge = ` <span class="helper-badge" style="font-size:0.6rem;">Awaiting ID</span>`;
    }
    
    // Trend Styling Today vs Yesterday
    let todayTrendClass = '';
    if (!hasError && summary.today > summary.y1 && summary.today > 0) {
      todayTrendClass = 'cell-trend-up';
    } else if (!hasError && summary.today < summary.y1 && summary.y1 > 0) {
      todayTrendClass = 'cell-trend-down';
    }
    
    const getCellHTML = (val, cellType) => {
      const isClickable = !hasError && val > 0;
      return `<td class="text-center val-cell ${isClickable ? 'clickable' : 'val-zero'}" 
                  data-source="${source.key}" 
                  data-type="${cellType}" 
                  data-val="${val}">
                ${hasError ? '—' : val}
              </td>`;
    };
    
    tr.innerHTML = `
      <td class="col-source" title="${statusTooltip}">
        <span class="source-status ${sourceStatusClass}"></span>
        ${source.name}${errorBadge}
      </td>
      <td class="text-center val-cell ${todayTrendClass} ${summary.today > 0 && !hasError ? 'clickable' : 'val-zero'}" 
          data-source="${source.key}" 
          data-type="today" 
          data-val="${summary.today}">
        ${hasError ? '—' : summary.today}
      </td>
      ${getCellHTML(summary.y1, 'y1')}
      ${getCellHTML(summary.y2, 'y2')}
      ${getCellHTML(summary.y3, 'y3')}
      ${getCellHTML(summary.y4, 'y4')}
      ${getCellHTML(summary.mtd, 'mtd')}
      ${getCellHTML(summary.lastMonth, 'lastMonth')}
      ${getCellHTML(summary.total, 'total')}
    `;
    
    tbody.appendChild(tr);
  });
  
  // Grand Totals Row
  const totalsRow = document.getElementById('time-perf-totals');
  let totalTodayTrendClass = '';
  if (totals.today > totals.y1 && totals.today > 0) {
    totalTodayTrendClass = 'cell-trend-up';
  } else if (totals.today < totals.y1 && totals.y1 > 0) {
    totalTodayTrendClass = 'cell-trend-down';
  }
  
  const getTotalCellHTML = (val, cellType) => {
    return `<td class="text-center val-cell ${val > 0 ? 'clickable' : 'val-zero'}" 
                data-source="all" 
                data-type="${cellType}" 
                data-val="${val}">
              ${val}
            </td>`;
  };
  
  totalsRow.innerHTML = `
    <td class="col-source">Grand Total</td>
    <td class="text-center val-cell ${totalTodayTrendClass} ${totals.today > 0 ? 'clickable' : 'val-zero'}" 
        data-source="all" 
        data-type="today" 
        data-val="${totals.today}">
      ${totals.today}
    </td>
    ${getTotalCellHTML(totals.y1, 'y1')}
    ${getTotalCellHTML(totals.y2, 'y2')}
    ${getTotalCellHTML(totals.y3, 'y3')}
    ${getTotalCellHTML(totals.y4, 'y4')}
    ${getTotalCellHTML(totals.mtd, 'mtd')}
    ${getTotalCellHTML(totals.lastMonth, 'lastMonth')}
    ${getTotalCellHTML(totals.total, 'total')}
  `;
}

// --- Render Table 2: Status Breakdown ---
function renderStatusBreakdownTable() {
  const container = document.getElementById('status-tables-container');
  if (!container) return;
  container.innerHTML = '';
  
  const statusConfigs = {
    franchise: [
      { key: 'interested', label: 'Interested' },
      { key: 'warm', label: 'Warm' },
      { key: 'cold', label: 'Cold' },
      { key: 'notInterested', label: 'Not Interested' },
      { key: 'converted', label: 'Converted' },
      { key: 'paid', label: 'Paid' },
      { key: 'total', label: 'Total' }
    ],
    ads: [
      { key: 'callAgain', label: 'Call Again' },
      { key: 'followup', label: 'Follow-up' },
      { key: 'interested', label: 'Interested' },
      { key: 'notInterested', label: 'Not Interested' },
      { key: 'wrongNo', label: 'Wrong Number' },
      { key: 'blank', label: 'Blank' },
      { key: 'total', label: 'Total' }
    ],
    default: [
      { key: 'interested', label: 'Interested' },
      { key: 'warm', label: 'Warm' },
      { key: 'cold', label: 'Cold' },
      { key: 'notInterested', label: 'Not Interested' },
      { key: 'converted', label: 'Converted' },
      { key: 'paid', label: 'Paid' },
      { key: 'total', label: 'Total' }
    ]
  };
  
  CONFIG.SOURCES.forEach(source => {
    const leads = state.allLeads[source.key];
    const hasId = !!state.sheetIds[source.key];
    const isMocked = !hasId && state.demoMode;
    const hasError = !!state.errors[source.key];
    const summary = aggregateSourceData(leads);
    
    const config = statusConfigs[source.key] || statusConfigs.default;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'table-responsive mb-4';
    
    const table = document.createElement('table');
    table.className = 'dashboard-table';
    
    const thead = document.createElement('thead');
    let thHtml = `<tr><th class="col-source">${source.name}</th>`;
    config.forEach(c => {
      thHtml += `<th class="col-val text-center">${c.label}</th>`;
    });
    thHtml += `</tr>`;
    thead.innerHTML = thHtml;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    const tr = document.createElement('tr');
    
    let sourceStatusClass = 'inactive';
    if (hasError) sourceStatusClass = 'inactive';
    else if (hasId || isMocked) sourceStatusClass = 'active';
    
    let errorBadge = '';
    if (hasError) {
      errorBadge = ` <span class="helper-badge text-danger" style="font-size:0.6rem;">⚠️ Error</span>`;
    } else if (!hasId && isMocked) {
      errorBadge = ` <span class="helper-badge text-warning" style="font-size:0.6rem;">Demo</span>`;
    }
    
    let tdHtml = `
      <td class="col-source">
        <span class="source-status ${sourceStatusClass}"></span>
        Status
      </td>
    `;
    
    config.forEach(c => {
      const val = summary[c.key] || 0;
      const isClickable = !hasError && val > 0;
      tdHtml += `
        <td class="text-center val-cell ${isClickable ? 'clickable' : 'val-zero'}" 
            data-source="${source.key}" 
            data-type="${c.key}" 
            data-val="${val}">
          ${hasError ? '—' : val}
        </td>`;
    });
    
    tr.innerHTML = tdHtml;
    tbody.appendChild(tr);
    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  });
}

// --- Render Chart: Month-on-Month Ingestion Trend ---
function renderChart() {
  const ctx = document.getElementById('trendChart').getContext('2d');
  
  const labels = [];
  const monthKeys = []; // Array of 'YYYY-MM' strings
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  
  // Starting from January 2026
  const startYear = 2026;
  const startMonth = 0; // January
  
  let tempYear = startYear;
  let tempMonth = startMonth;
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  while (tempYear < currentYear || (tempYear === currentYear && tempMonth <= currentMonth)) {
    const monthKey = `${tempYear}-${String(tempMonth + 1).padStart(2, '0')}`;
    monthKeys.push(monthKey);
    labels.push(`${monthNames[tempMonth]} ${tempYear}`);
    
    tempMonth++;
    if (tempMonth > 11) {
      tempMonth = 0;
      tempYear++;
    }
  }
  
  const filterVal = document.getElementById('chart-source-selector').value;
  let datasets = [];
  
  if (filterVal === 'all') {
    datasets = CONFIG.SOURCES.map(source => {
      const leads = state.allLeads[source.key];
      const hasError = !!state.errors[source.key];
      
      const data = monthKeys.map(ymdPrefix => {
        if (hasError) return 0;
        return leads.filter(l => l.ymd && l.ymd.startsWith(ymdPrefix)).length;
      });
      
      return {
        label: source.name,
        data: data,
        backgroundColor: source.fallbackColor + 'b0',
        borderColor: source.fallbackColor,
        borderWidth: 1.5,
        borderRadius: 4
      };
    });
  } else {
    const selectedSource = CONFIG.SOURCES.find(s => s.key === filterVal);
    const leads = state.allLeads[filterVal];
    const hasError = !!state.errors[filterVal];
    
    const data = monthKeys.map(ymdPrefix => {
      if (hasError) return 0;
      return leads.filter(l => l.ymd && l.ymd.startsWith(ymdPrefix)).length;
    });
    
    datasets = [{
      label: selectedSource.name,
      data: data,
      backgroundColor: 'rgba(118, 255, 3, 0.2)',
      borderColor: '#76ff03',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointBackgroundColor: '#76ff03',
      pointBorderColor: '#ffffff',
      pointRadius: 4,
      pointHoverRadius: 6,
      type: 'line'
    }];
  }
  
  if (state.activeChart) {
    state.activeChart.destroy();
  }
  
  state.activeChart = new Chart(ctx, {
    type: filterVal === 'all' ? 'bar' : 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: filterVal === 'all',
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Inter', size: 10 }
          }
        },
        y: {
          stacked: filterVal === 'all',
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Inter', size: 10 },
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#f3f4f6',
            font: { family: 'Outfit', weight: 500, size: 11 },
            boxWidth: 12,
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          titleFont: { family: 'Outfit', weight: 600 },
          bodyFont: { family: 'Inter' },
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10
        }
      }
    }
  });
}

// --- Drill-down Logic ---
function openDrilldown(sourceKey, cellType) {
  const ranges = getDateRanges();
  let leadsToFilter = [];
  let sourceName = '';
  
  if (sourceKey === 'all') {
    sourceName = 'All Sources';
    CONFIG.SOURCES.forEach(s => {
      // Don't aggregate failed sources
      if (!state.errors[s.key]) {
        leadsToFilter = leadsToFilter.concat(state.allLeads[s.key]);
      }
    });
  } else {
    if (state.errors[sourceKey]) return; // Skip if source has error
    const srcObj = CONFIG.SOURCES.find(s => s.key === sourceKey);
    sourceName = srcObj ? srcObj.name : sourceKey;
    leadsToFilter = state.allLeads[sourceKey] || [];
  }
  
  let filteredLeads = [];
  let filterName = '';
  
  switch(cellType) {
    case 'today':
      filteredLeads = leadsToFilter.filter(l => l.ymd === ranges.today);
      filterName = 'Today';
      break;
    case 'y1':
      filteredLeads = leadsToFilter.filter(l => l.ymd === ranges.y1);
      filterName = 'Yesterday (Y-1)';
      break;
    case 'y2':
      filteredLeads = leadsToFilter.filter(l => l.ymd === ranges.y2);
      filterName = '2 Days Ago (Y-2)';
      break;
    case 'y3':
      filteredLeads = leadsToFilter.filter(l => l.ymd === ranges.y3);
      filterName = '3 Days Ago (Y-3)';
      break;
    case 'y4':
      filteredLeads = leadsToFilter.filter(l => l.ymd === ranges.y4);
      filterName = '4 Days Ago (Y-4)';
      break;
    case 'mtd':
      filteredLeads = leadsToFilter.filter(l => l.ymd >= ranges.mtdStart && l.ymd <= ranges.mtdEnd);
      filterName = 'This Month (MTD)';
      break;
    case 'lastMonth':
      filteredLeads = leadsToFilter.filter(l => l.ymd >= ranges.lastMonthStart && l.ymd <= ranges.lastMonthEnd);
      filterName = 'Last Month';
      break;
    case 'total':
      filteredLeads = leadsToFilter;
      filterName = 'Total Leads';
      break;
    case 'callAgain':
      filteredLeads = leadsToFilter.filter(l => (l.status || '').toLowerCase().includes('call again') || (l.callInterest || '').toLowerCase().includes('call again'));
      filterName = 'Call Again';
      break;
    case 'followup':
      filteredLeads = leadsToFilter.filter(l => {
        const s = (l.status || '').toLowerCase();
        const i = (l.callInterest || '').toLowerCase();
        return s.includes('followup') || s.includes('follow up') || i.includes('followup') || i.includes('follow up');
      });
      filterName = 'Followup';
      break;
    case 'interested':
      filteredLeads = leadsToFilter.filter(l => {
        const s = (l.status || '').toLowerCase();
        const i = (l.callInterest || '').toLowerCase();
        const isNotInt = s.includes('not interest') || s.includes('not intrest') || i.includes('not interest') || i.includes('not intrest') || s.includes('no interest') || i.includes('no interest');
        return (s.includes('interested') || s.includes('intrested') || i.includes('interested') || i.includes('intrested')) && !isNotInt;
      });
      filterName = 'Interested';
      break;
    case 'notInterested':
      filteredLeads = leadsToFilter.filter(l => {
        const s = (l.status || '').toLowerCase();
        const i = (l.callInterest || '').toLowerCase();
        return s.includes('not interest') || s.includes('not intrest') || i.includes('not interest') || i.includes('not intrest') || s.includes('no interest') || i.includes('no interest');
      });
      filterName = 'Not Interested';
      break;
    case 'wrongNo':
      filteredLeads = leadsToFilter.filter(l => {
        const s = (l.status || '').toLowerCase();
        const i = (l.callInterest || '').toLowerCase();
        return s.includes('wrong no') || s.includes('wrong number') || i.includes('wrong no') || i.includes('wrong number');
      });
      filterName = 'Wrong No';
      break;
    case 'blank':
      filteredLeads = leadsToFilter.filter(l => {
        const s = (l.status || '').toLowerCase();
        const i = (l.callInterest || '').toLowerCase();
        return s === '' && i === '';
      });
      filterName = 'Blank';
      break;
    default:
      filteredLeads = leadsToFilter;
      filterName = 'Leads';
  }
  
  state.activeDrilldownLeads = filteredLeads;
  state.activeDrilldownTitle = `${sourceName} - ${filterName}`;
  
  document.getElementById('drilldown-title').innerText = 'Lead Details';
  document.getElementById('drilldown-subtitle').innerText = state.activeDrilldownTitle;
  document.getElementById('drilldown-search').value = '';
  
  renderDrilldownTable(filteredLeads);
  
  document.getElementById('drilldown-modal').classList.remove('hidden');
}

function renderDrilldownTable(leads) {
  const tbody = document.getElementById('details-body');
  tbody.innerHTML = '';
  
  document.getElementById('drilldown-count').innerText = `Found ${leads.length} leads`;
  
  if (leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2rem;">No matching leads found for this selection.</td></tr>`;
    return;
  }
  
  leads.forEach((lead, index) => {
    const tr = document.createElement('tr');
    
    let badgeClass = 'default';
    const s = (lead.status || '').toLowerCase();
    const ci = (lead.callInterest || '').toLowerCase();
    
    if (s.includes('warm') || ci.includes('warm')) badgeClass = 'warm';
    else if (s.includes('cold') || ci.includes('cold')) badgeClass = 'cold';
    else if (s.includes('hot') || ci.includes('hot')) badgeClass = 'hot';
    else if (s.includes('converted') || ci.includes('converted')) badgeClass = 'converted';
    else if (s.includes('paid') || ci.includes('paid')) badgeClass = 'paid';
    
    const displayStatus = lead.status || '(blank)';
    const displayInterest = lead.callInterest || '(blank)';
    const displayPoc = lead.poc || '(blank)';
    
    tr.innerHTML = `
      <td class="text-muted">${index + 1}</td>
      <td style="font-weight: 600;">${lead.name || '(No Name)'}</td>
      <td>${lead.email || 'N/A'}</td>
      <td>${lead.mobile || 'N/A'}</td>
      <td>${lead.dateStr || 'N/A'}</td>
      <td><span class="badge-status ${badgeClass}">${displayStatus}</span></td>
      <td>${displayInterest}</td>
      <td>${displayPoc}</td>
    `;
    tbody.appendChild(tr);
  });
}

function filterDrilldown() {
  const query = document.getElementById('drilldown-search').value.toLowerCase().trim();
  
  if (!query) {
    renderDrilldownTable(state.activeDrilldownLeads);
    return;
  }
  
  const filtered = state.activeDrilldownLeads.filter(lead => {
    return (lead.name || '').toLowerCase().includes(query) ||
           (lead.email || '').toLowerCase().includes(query) ||
           (lead.mobile || '').toLowerCase().includes(query) ||
           (lead.dateStr || '').toLowerCase().includes(query) ||
           (lead.status || '').toLowerCase().includes(query) ||
           (lead.callInterest || '').toLowerCase().includes(query) ||
           (lead.poc || '').toLowerCase().includes(query) ||
           (lead.city || '').toLowerCase().includes(query);
  });
  
  renderDrilldownTable(filtered);
}

function exportToCSV() {
  if (state.activeDrilldownLeads.length === 0) return;
  
  const headers = ['Name', 'Email', 'Mobile', 'Date', 'Lead Status', 'Call Interest', 'Lead POC', 'City'];
  const rows = state.activeDrilldownLeads.map(lead => [
    `"${(lead.name || '').replace(/"/g, '""')}"`,
    `"${(lead.email || '').replace(/"/g, '""')}"`,
    `"${(lead.mobile || '').replace(/"/g, '""')}"`,
    `"${(lead.dateStr || '').replace(/"/g, '""')}"`,
    `"${(lead.status || '').replace(/"/g, '""')}"`,
    `"${(lead.callInterest || '').replace(/"/g, '""')}"`,
    `"${(lead.poc || '').replace(/"/g, '""')}"`,
    `"${(lead.city || '').replace(/"/g, '""')}"`
  ]);
  
  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  
  const safeTitle = state.activeDrilldownTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  link.setAttribute("download", `Zypp_Leads_${safeTitle}.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
}

// --- Event Listeners and Modal Toggles ---
function setupEventListeners() {
  document.getElementById('btn-refresh').addEventListener('click', fetchAndRenderAll);
  
  document.getElementById('btn-settings').addEventListener('click', () => {
    CONFIG.SOURCES.forEach(s => {
      document.getElementById(`input-${s.key}`).value = state.sheetIds[s.key] || '';
    });
    document.getElementById('settings-modal').classList.remove('hidden');
  });
  
  document.getElementById('btn-close-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });
  document.getElementById('btn-cancel-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });
  
  document.getElementById('btn-save-settings').addEventListener('click', () => {
    CONFIG.SOURCES.forEach(s => {
      state.sheetIds[s.key] = document.getElementById(`input-${s.key}`).value.trim();
    });
    saveSettings();
    document.getElementById('settings-modal').classList.add('hidden');
    fetchAndRenderAll();
  });
  
  document.getElementById('btn-reset-default').addEventListener('click', () => {
    document.getElementById('input-franchise').value = CONFIG.DEFAULT_FRANCHISE_ID;
    document.getElementById('input-ads').value = CONFIG.DEFAULT_ADS_ID;
  });
  
  document.getElementById('toggle-demo').addEventListener('change', (e) => {
    state.demoMode = e.target.checked;
    saveSettings();
    fetchAndRenderAll();
  });
  
  document.getElementById('chart-source-selector').addEventListener('change', renderChart);
  
  document.getElementById('btn-close-drilldown').addEventListener('click', () => {
    document.getElementById('drilldown-modal').classList.add('hidden');
  });
  
  const handleTableCellClick = (e) => {
    const cell = e.target.closest('.val-cell.clickable');
    if (!cell) return;
    
    const source = cell.dataset.source;
    const type = cell.dataset.type;
    openDrilldown(source, type);
  };
  
  document.getElementById('time-perf-table').addEventListener('click', handleTableCellClick);
  document.getElementById('status-table').addEventListener('click', handleTableCellClick);
  
  document.getElementById('drilldown-search').addEventListener('input', filterDrilldown);
  document.getElementById('btn-export-csv').addEventListener('click', exportToCSV);
  
  window.addEventListener('click', (e) => {
    const settingsModal = document.getElementById('settings-modal');
    const drilldownModal = document.getElementById('drilldown-modal');
    if (e.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
    if (e.target === drilldownModal) {
      drilldownModal.classList.add('hidden');
    }
  });
}

// --- Auto-refresh Countdown Timer ---
function startTimer() {
  if (state.countdownInterval) clearInterval(state.countdownInterval);
  
  state.countdownSeconds = CONFIG.REFRESH_INTERVAL_SEC;
  
  state.countdownInterval = setInterval(() => {
    state.countdownSeconds--;
    
    const circleBar = document.querySelector('.countdown-bar');
    if (circleBar) {
      const percent = state.countdownSeconds / CONFIG.REFRESH_INTERVAL_SEC;
      const offset = 94 * (1 - percent);
      circleBar.style.strokeDashoffset = offset;
    }
    
    const m = Math.floor(state.countdownSeconds / 60);
    const s = String(state.countdownSeconds % 60).padStart(2, '0');
    
    const textEl = document.getElementById('countdown-text');
    if (textEl) textEl.innerText = `${m}:${s}`;
    
    if (state.countdownSeconds <= 0) {
      clearInterval(state.countdownInterval);
      fetchAndRenderAll();
    }
  }, 1000);
}
