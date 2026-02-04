from web_app.utils.timetable_processor import process_pdf_to_data
import os

pdf_path = "classroom.pdf"
if os.path.exists(pdf_path):
    print(f"Testing extraction on {pdf_path}...")
    data = process_pdf_to_data(pdf_path)
    
    rooms = set(d['Room'] for d in data)
    print("\n--- Extracted Rooms ---")
    for r in sorted(rooms):
        print(f"Room: '{r}'")
        # Print sample usage
        sample = next((d for d in data if d['Room'] == r), None)
        if sample:
             print(f"  Sample Class: {sample['Class Info'][:30]}...")
else:
    print(f"File {pdf_path} not found.")
