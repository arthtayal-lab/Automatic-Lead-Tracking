import urllib.request
import json
import re

def test_fetch():
    sheet_id = '1WQTGGj2A6qIWC9UVGqOd_mhksbtCM_oD_WSZwpy9_9k'
    url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:json'
    print('Fetching from URL:', url)
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as response:
            text = response.read().decode('utf-8')
            
        print('Fetched raw response length:', len(text))
        print('Response sample (first 200 chars):', text[:200])
        print('Response sample (last 50 chars):', text[-50:])
        
        # Extract JSON
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            json_str = match.group(0)
            data = json.loads(json_str)
            print('Successfully parsed JSON!')
            table = data.get('table', {})
            cols = table.get('cols', [])
            rows = table.get('rows', [])
            print('Columns count:', len(cols))
            print('Rows count:', len(rows))
            
            # Print column definitions
            print('Columns:')
            for idx, col in enumerate(cols):
                print(f"  Col {idx}: id='{col.get('id')}', label='{col.get('label')}', type='{col.get('type')}'")
                
            # Inspect first 3 rows
            print('\nFirst 3 rows:')
            for row_idx, row in enumerate(rows[:3]):
                print(f"Row {row_idx}:")
                cells = row.get('c', [])
                for col_idx, cell in enumerate(cells):
                    col_label = cols[col_idx].get('label') or cols[col_idx].get('id')
                    if cell is not None:
                        print(f"  Col {col_idx} ({col_label}): val = {cell.get('v')}, formatted = {cell.get('f')}")
                    else:
                        print(f"  Col {col_idx} ({col_label}): None")
        else:
            print('Could not find JSON boundaries in response')
            
    except Exception as e:
        print('Error fetching or parsing:', e)

if __name__ == '__main__':
    test_fetch()
