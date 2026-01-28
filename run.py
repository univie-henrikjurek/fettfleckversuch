from app import create_app

# create flask app
app = create_app()

# start the flask server
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
