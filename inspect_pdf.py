import pdfplumber

pdf = pdfplumber.open('classroom.pdf')
for i, page in enumerate(pdf.pages):
    print(f"--- PAGE {i} ---")
    text = page.extract_text()
    if text:
        print(text)
    else:
        print("[No text found by extract_text()]")
    
    print("\n--- WORDS PREVIEW ---")
    words = page.extract_words()
    if words:
        print(" ".join([w['text'] for w in words[:200]]))
    else:
        print("[No words found by extract_words()]")
pdf.close()
