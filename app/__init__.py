import os
from flask import Flask

def create_app():
    app = Flask(__name__, static_folder='static')
    app.secret_key = 'SECRET KEY'  # important for session handling

    # set path for uploaded files
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')

    from .routes import main_bp
    app.register_blueprint(main_bp)

    return app
