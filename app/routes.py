import os
import uuid
from flask import Blueprint, render_template, request, redirect, url_for, session, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image

main_bp = Blueprint('main', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@main_bp.route('/', methods=['GET'])
def index():
    image_url = None
    if 'uploaded_file' in session:
        image_url = url_for('main.uploaded_file', filename=session['uploaded_file'])
    return render_template('index.html', image_url=image_url)

@main_bp.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return redirect(url_for('main.index'))
    file = request.files['file']
    if file.filename == '':
        return redirect(url_for('main.index'))
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = str(uuid.uuid4()) + "_" + filename
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        file.save(os.path.join(upload_folder, unique_filename))
        session['uploaded_file'] = unique_filename
    return redirect(url_for('main.index'))

@main_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)

@main_bp.route('/get_brightness', methods=['POST'])
def get_brightness():
    data = request.get_json()
    if not data or 'points' not in data:
        return jsonify({'error': 'No data provided'}), 400
    points = data['points']  # expected format: [{x: ..., y: ...}, {x: ..., y: ...}]
    if 'uploaded_file' not in session:
        return jsonify({'error': 'No uploaded file found'}), 400
      
    filename = session['uploaded_file']
    upload_folder = current_app.config['UPLOAD_FOLDER']
    file_path = os.path.join(upload_folder, filename)
    try:
        img = Image.open(file_path).convert('RGB')
        width, height = img.size
    except Exception as e:
        return jsonify({'error': 'Cannot open image: ' + str(e)}), 500
    results = []
    # define the square area size for averaging (21x21 pixels)
    area_size = 21
    half_area = area_size // 2
    for pt in points:
        x = int(pt.get('x', 0))
        y = int(pt.get('y', 0))
        # collect RGB values in a 21x21 square around the clicked point
        pixels = []
        for dx in range(-half_area, half_area + 1):
            for dy in range(-half_area, half_area + 1):
                px = x + dx
                py = y + dy
                if 0 <= px < width and 0 <= py < height:
                    try:
                        pixels.append(img.getpixel((px, py)))
                    except Exception:
                        pass  # skip if pixel read fails
        if not pixels:
            return jsonify({'error': f'No valid pixels around point ({x},{y})'}), 400
        # compute average "informatics" brightness (simple RGB mean)
        inf_brightness = sum(sum(rgb) / 3.0 for rgb in pixels) / len(pixels)
        # compute perceived brightness (Luminance formula)
        human_brightness = sum(0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] for rgb in pixels) / len(pixels)
        results.append({
            'x': x,
            'y': y,
            'num_pixels': len(pixels),  # number of pixels used in averaging
            'informatik_brightness': inf_brightness,
            'human_brightness': human_brightness
        })
    return jsonify({'results': results})

@main_bp.route('/reset_image', methods=['POST'])
def reset_image():
    # to force new file upload, delete old file from session
    if 'uploaded_file' in session:
        filename = session.pop('uploaded_file')
        upload_folder = current_app.config['UPLOAD_FOLDER']
        file_path = os.path.join(upload_folder, filename)
        # if file still on server: remove it
        if os.path.exists(file_path):
            os.remove(file_path)
    return redirect(url_for('main.index'))
