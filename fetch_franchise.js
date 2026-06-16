const fs = require('fs');

async function testFetch() {
  const sheetId = '1WQTGGj2A6qIWC9UVGqOd_mhksbtCM_oD_WSZwpy9_9k';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  
  console.log('Fetching from URL:', url);
  try {
    const response = await fetch(url);
    const text = await response.text();
    console.log('Fetched raw response length:', text.length);
    console.log('Response sample (first 200 chars):', text.substring(0, 200));
    console.log('Response sample (last 50 chars):', text.substring(text.length - 50));
    
    // Extract JSON
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = text.substring(startIdx, endIdx + 1);
      const data = JSON.parse(jsonStr);
      console.log('Successfully parsed JSON!');
      console.log('Columns count:', data.table.cols.length);
      console.log('Rows count:', data.table.rows.length);
      
      // Let's print the column definitions
      console.log('Columns:');
      data.table.cols.forEach((col, idx) => {
        console.log(`  Col ${idx}: id='${col.id}', label='${col.label}', type='${col.type}'`);
      });
      
      // Let's inspect the first 3 rows
      console.log('\nFirst 3 rows:');
      const sampleRows = data.table.rows.slice(0, 3);
      sampleRows.forEach((row, rowIdx) => {
        console.log(`Row ${rowIdx}:`);
        row.c.forEach((cell, colIdx) => {
          if (cell) {
            console.log(`  Col ${colIdx} (${data.table.cols[colIdx].label || data.table.cols[colIdx].id}): val = ${cell.v}, formatted = ${cell.f}`);
          } else {
            console.log(`  Col ${colIdx} (${data.table.cols[colIdx].label || data.table.cols[colIdx].id}): null`);
          }
        });
      });
    } else {
      console.error('Could not find JSON boundaries in response');
    }
  } catch (err) {
    console.error('Error fetching or parsing:', err);
  }
}

testFetch();
