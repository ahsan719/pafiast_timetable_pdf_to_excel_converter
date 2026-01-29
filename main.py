import pdfplumber
import pandas as pd
import re
import os

# --- CONFIGURATION: TIME SLOTS ---
# Each column (1-16) maps to a specific time slot
# The header row contains: "1\n9:00 - 9:30", "2\n9:30 - 10:00", etc.
SLOT_MAP_START = {
    1: "09:00", 2: "09:30", 3: "10:00", 4: "10:30",
    5: "11:00", 6: "11:30", 7: "12:00", 8: "12:30",
    9: "13:00", 10: "13:30", 11: "14:00", 12: "14:30",
    13: "15:00", 14: "15:30", 15: "16:00", 16: "16:30"
}

SLOT_MAP_END = {
    1: "09:30", 2: "10:00", 3: "10:30", 4: "11:00",
    5: "11:30", 6: "12:00", 7: "12:30", 8: "13:00",
    9: "13:30", 10: "14:00", 11: "14:30", 12: "15:00",
    13: "15:30", 14: "16:00", 15: "16:30", 16: "17:00"
}


def get_slot_number_from_header(header_text):
    """Extracts the slot number (1-16) from a header cell like '1\\n9:00 - 9:30'."""
    if not header_text:
        return None
    # Find the first number which is the slot number
    match = re.search(r'^(\d+)', str(header_text).strip())
    if match:
        num = int(match.group(1))
        if 1 <= num <= 16:
            return num
    return None


def process_pdf_smart(pdf_file, output_excel):
    extracted_data = []
    print(f"Processing {pdf_file}...")

    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            # 1. Identify Room and Section from page text
            page_text = page.extract_text() or ""
            
            # Extract Room (e.g., A1-109, C1-B05, etc.) Usually at the top of the page
            room_match = re.search(r'\b(A[1-2]-[0-9]+|C[1-2]-[A-Z0-9]+|[A-Za-z\s]+Lab)\b', page_text)
            room_name = room_match.group(1) if room_match else "Unknown Room"
            
            # Extract Section (e.g., BSAI-F24 Green)
            section_match = re.search(r'(BS[A-Z]+-F\d+\s+(?:Green|Blue|Red|White))', page_text)
            section_name = section_match.group(1) if section_match else "Unknown Section"

            # 2. Extract Table with better settings to prevent row/column merging issues
            table_settings = {
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "snap_tolerance": 3,
                "join_tolerance": 3,
            }
            table = page.extract_table(table_settings)
            if not table:
                # Fallback to default if line-based fails
                table = page.extract_table()
                if not table: continue

            # 3. Find the header row and build column -> slot mapping
            col_to_slot = {}
            header_row_idx = -1
            
            for row_idx, row in enumerate(table):
                row_str = " ".join([str(c) if c else "" for c in row])
                if re.search(r'\b1\b', row_str) and re.search(r'\b2\b', row_str):
                    header_row_idx = row_idx
                    for col_idx, cell in enumerate(row):
                        slot_num = get_slot_number_from_header(cell)
                        if slot_num:
                            col_to_slot[col_idx] = slot_num
                    break
            
            if header_row_idx == -1:
                continue
            
            # 4. Process data rows
            for row_idx in range(header_row_idx + 1, len(table)):
                row = table[row_idx]
                if not row or len(row) == 0: continue
                
                day_cell = (row[0] or "").strip().replace('\n', '')
                if day_cell not in ['Mo', 'Tu', 'We', 'Th', 'Fr']:
                    continue
                
                col_idx = 1
                while col_idx < len(row):
                    cell_content = row[col_idx]
                    
                    if not cell_content or str(cell_content).strip() == "":
                        col_idx += 1
                        continue
                    
                    start_slot = col_to_slot.get(col_idx)
                    if not start_slot:
                        col_idx += 1
                        continue
                    
                    # 5. Span detection: Only None cells indicate true merged cell continuation
                    span_count = 1
                    next_col = col_idx + 1
                    while next_col < len(row):
                        next_cell = row[next_col]
                        if next_cell is None and next_col in col_to_slot:
                            span_count += 1
                            next_col += 1
                        else:
                            break
                    
                    end_slot = start_slot + span_count - 1
                    if end_slot > 16: end_slot = 16
                    
                    start_time = SLOT_MAP_START.get(start_slot, "Unknown")
                    end_time = SLOT_MAP_END.get(end_slot, "Unknown")
                    
                    # 6. Handle multiple classes in one cell (stacked)
                    # Heuristic: split by multiple newlines or common teacher titles
                    raw_text = str(cell_content)
                    class_parts = re.split(r'\n\s*\n', raw_text.strip())
                    for part in class_parts:
                        # Clean and format class info
                        clean_info = part.replace('\n', ' ').strip()
                        clean_info = re.sub(r'\s+', ' ', clean_info)
                        
                        # Remove garbage text (section names or days) that might have bled in
                        clean_info = re.sub(r'(BS[A-Z]+-F\d+\s+(?:Green|Blue|Red|White)|Mo|Tu|We|Th|Fr)\b', '', clean_info).strip()
                        
                        if len(clean_info) < 5: continue
                        
                        extracted_data.append({
                            "Room": room_name,
                            "Section": section_name,
                            "Day": day_cell,
                            "Start Time": start_time,
                            "End Time": end_time,
                            "Class Info": clean_info
                        })
                    
                    col_idx = next_col

    # 7. Save to Excel
    if extracted_data:
        df = pd.DataFrame(extracted_data)
        df = df[["Room", "Day", "Start Time", "End Time", "Class Info"]]
        output_excel_final = "Timetable_Precise.xlsx"
        df.to_excel(output_excel_final, index=False)
        print(f"Success! Extracted {len(extracted_data)} class entries to {output_excel_final}")
    else:
        print("No data extracted.")


# --- RUN CONFIG ---
input_pdf = "classroom2.pdf"
output_excel = "Timetable_Precise.xlsx"

if os.path.exists(input_pdf):
    process_pdf_smart(input_pdf, output_excel)
else:
    print(f"File not found: {input_pdf}")