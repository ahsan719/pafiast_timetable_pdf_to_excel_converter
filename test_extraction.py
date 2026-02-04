from utils.timetable_processor import process_pdf_to_data
import os

pdf_path = "classroom.pdf"
if os.path.exists(pdf_path):
    print(f"Testing extraction on {pdf_path}...")
    try:
        data = process_pdf_to_data(pdf_path)
        rooms = set(d['Room'] for d in data)
        print("\n--- Extracted Rooms ---")
        for r in sorted(rooms):
            print(f"Room: '{r}'")
    except Exception as e:
        print(f"Error: {e}")
else:
    print(f"File {pdf_path} not found.")
