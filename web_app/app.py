from flask import Flask, render_template, request, jsonify, send_file
import os
import secrets
from utils.timetable_processor import process_pdf_to_data, generate_formatted_excel
import shutil

app = Flask(__name__,
            template_folder=os.path.join(os.path.dirname(__file__), '..', 'templates'),
            static_folder=os.path.join(os.path.dirname(__file__), '..', 'static'))

# Config
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
OUTPUT_FOLDER = os.path.join(os.getcwd(), 'outputs')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'pdf_file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['pdf_file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and file.filename.lower().endswith('.pdf'):
        # Save File
        filename = secrets.token_hex(8) + ".pdf"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Processing
            data = process_pdf_to_data(filepath)
            
            if not data:
                return jsonify({'error': 'No valid data extracted from PDF'}), 400
            
            # Generate Excel
            excel_filename = filename.replace('.pdf', '.xlsx')
            excel_path = os.path.join(app.config['OUTPUT_FOLDER'], excel_filename)
            success = generate_formatted_excel(data, excel_path)
            
            if success:
                # Group data for frontend preview
                preview_data = {}
                for entry in data:
                    room = entry['Room']
                    if room not in preview_data:
                        preview_data[room] = []
                    preview_data[room].append(entry)
                
                return jsonify({
                    'message': 'File processed successfully',
                    'download_url': f'/download/{excel_filename}',
                    'preview': preview_data
                })
            else:
                return jsonify({'error': 'Failed to generate Excel'}), 500
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        
    return jsonify({'error': 'Invalid file format. Only PDF allowed.'}), 400

@app.route('/download/<filename>')
def download_file(filename):
    filepath = os.path.abspath(os.path.join(app.config['OUTPUT_FOLDER'], filename))
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    return send_file(filepath, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
