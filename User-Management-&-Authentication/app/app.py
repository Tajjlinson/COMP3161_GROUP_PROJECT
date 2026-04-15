import os
import json
import mysql.connector
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_httpauth import HTTPBasicAuth
from flask_jwt_extended import JWTManager, create_access_token, jwt_required

load_dotenv()

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
jwt = JWTManager(app)

DB_USER = os.getenv('DB_USER')
DB_PASS = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT', '3306')
DB_NAME = os.getenv('DB_NAME')

"""
Example Schema.

roles (
  role_id VARCHAR(255),
  role_name -- admin, lecturer, student,
  PRIMARY KEY(role_id)
)

users (
  user_id VARCHAR(255),
  username VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role_id VARCHAR(255),
  created_at DATE,
  PRIMARY KEY(user_id),
  FOREIGN KEY(role_id)
)

"""

def get_db():
    return mysql.connector.connect(
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        database=DB_NAME,
        port=DB_PORT
    )

#logging in
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    connection = get_db()
    cursor = connection.cursor(dictionary=True)
    query = """
        SELECT u.user_id, u.username, r.role_name 
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.username = %s AND u.password = %s
    """
    cursor.execute(query, (username, password))
    user = cursor.fetchone()
    cursor.close()
    connection.close()

    if user:
        identity = json.dumps({'id': user['user_id'], 'role': user['role_name']})
        jwt_token = create_access_token(identity=identity)
        return jsonify(access_token=jwt_token), 200
    
    return jsonify({"error": "Invalid credentials"}), 401

#retrieve user
@app.route('/user/<string:id>', methods=['GET'])
@jwt_required()
def get_user(id):
    connection = get_db()
    cursor = connection.cursor(dictionary=True)
    query = """
        SELECT u.user_id, u.username, u.created_at, r.role_name 
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = %s
    """
    cursor.execute(query, (id,))
    row = cursor.fetchone()
    cursor.close()
    connection.close()
    
    if not row:
        return jsonify({"error": f"User {id} not found"}), 404
    return jsonify(row), 200

#retrieve all users
@app.route('/user', methods=['GET'])
@jwt_required()
def get_all_users():
    connection = get_db()
    cursor = connection.cursor(dictionary=True)
    query = """
        SELECT u.user_id, u.username, r.role_name 
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    connection.close()
    return jsonify(rows), 200

#register user
@app.route('/create_user', methods=['POST'])
@jwt_required()
def create_user():
    data = request.json
    connection = get_db()
    cursor = connection.cursor()
    
    # Matches the new schema: user_id, username, password, role_id
    query = """INSERT INTO users (user_id, username, password, role_id) 
               VALUES (%s, %s, %s, %s)"""
    values = (data['user_id'], data['username'], data['password'], data['role_id'])
    
    try:
        cursor.execute(query, values)
        connection.commit()
        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        cursor.close()
        connection.close()

if __name__ == "__main__":
    app.run(port=5000, debug=True)