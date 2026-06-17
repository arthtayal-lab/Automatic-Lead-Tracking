$jsCode = @"
const fs = require('fs');
const content = fs.readFileSync('fetch_ads.ps1', 'utf8');
const startIdx = content.indexOf('{');
const endIdx = content.lastIndexOf('}');
const jsonStr = content.substring(startIdx, endIdx - startIdx + 1);
const data = JSON.parse(jsonStr);

const cols = data.table.cols;
const colIndices = {
  date: -1, name: -1, email: -1, mobile: -1, leadStatus: -1, callInterest: -1, poc: -1
};

cols.forEach((col, idx) => {
  const label = (col.label || '').toLowerCase().trim();
  if (label === 'name' || label === 'lead name') colIndices.name = idx;
  else if (label === 'email' || label === 'email id') colIndices.email = idx;
  else if (label === 'mobile' || label === 'mobile number' || label === 'phone' || label === 'contact') colIndices.mobile = idx;
  else if (label === 'date' || label === 'created date' || (label.includes('date') && !label.includes('calling') && !label.includes('followup') && !label.includes('follow up') && !label.includes('agreement'))) colIndices.date = idx;
  else if (label === 'lead status' || label === 'status') colIndices.leadStatus = idx;
  else if (label === 'call intrest' || label === 'call interest' || label === 'interest') colIndices.callInterest = idx;
});

console.log('Mapped indices:', colIndices);

let callAgain = 0, followup = 0, interested = 0, notInterested = 0, wrongNo = 0;

data.table.rows.forEach(r => {
  const name = (r.c[colIndices.name] ? r.c[colIndices.name].v : '') || '';
  const email = (r.c[colIndices.email] ? r.c[colIndices.email].v : '') || '';
  const mobile = (r.c[colIndices.mobile] ? r.c[colIndices.mobile].v : '') || '';
  const dateStr = (r.c[colIndices.date] ? r.c[colIndices.date].f || r.c[colIndices.date].v : '') || '';
  
  if (!name && !email && !mobile && !dateStr) return;

  const statusVal = ((r.c[colIndices.leadStatus] ? r.c[colIndices.leadStatus].v : '') || '').toLowerCase();
  const interestVal = ((r.c[colIndices.callInterest] ? r.c[colIndices.callInterest].v : '') || '').toLowerCase();

  const isCallAgain = statusVal.includes('call again') || interestVal.includes('call again');
  const isFollowup = statusVal.includes('followup') || statusVal.includes('follow up') || interestVal.includes('followup') || interestVal.includes('follow up');
  const isInterested = statusVal.includes('interested') || statusVal.includes('intrested') || interestVal.includes('interested') || interestVal.includes('intrested');
  const isNotInterested = statusVal.includes('not interest') || statusVal.includes('not intrest') || interestVal.includes('not interest') || interestVal.includes('not intrest') || statusVal.includes('no interest') || interestVal.includes('no interest');
  const isWrongNo = statusVal.includes('wrong no') || statusVal.includes('wrong number') || interestVal.includes('wrong no') || interestVal.includes('wrong number');

  if (isCallAgain) callAgain++;
  if (isFollowup) followup++;
  if (isInterested) interested++;
  if (isNotInterested) notInterested++;
  if (isWrongNo) wrongNo++;
});

console.log('Results:', { callAgain, followup, interested, notInterested, wrongNo });
"@
$jsCode | Out-File -Encoding utf8 "test_appjs_logic.js"
node test_appjs_logic.js
