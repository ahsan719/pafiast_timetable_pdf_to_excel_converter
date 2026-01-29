import pdfplumber

pdf = pdfplumber.open('classroom.pdf')
page = pdf.pages[0]
table = page.extract_table()

# Show header analysis
header = table[1]
print('HEADER ROW ANALYSIS:')
for i, cell in enumerate(header):
    if cell:
        cell_str = str(cell)[:40].replace('\n', ' | ')
        print(f'  Col {i}: {cell_str}')

# Show first data row in detail
print('\nFIRST DATA ROW (Mo):')
data = table[2]
for i, cell in enumerate(data):
    if cell is None:
        status = 'None'
    elif str(cell).strip() == '':
        status = 'EMPTY'
    else:
        status = 'CONTENT'
    cell_str = str(cell)[:30].replace('\n', ' ') if cell else str(cell)
    print(f'  Col {i} [{status}]: {cell_str}')

pdf.close()
