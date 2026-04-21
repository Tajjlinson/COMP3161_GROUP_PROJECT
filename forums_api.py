from flask import Flask, request, jsonify
import mysql.connector

app = Flask(__name__)

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="w1234897",  
    database="comp3161_project"
)

cursor = db.cursor(dictionary=True)


@app.route('/forums', methods=['POST'])
def create_forum():
    data = request.json
    cursor.execute(
        "INSERT INTO forums (course_id, title) VALUES (%s, %s)",
        (data['course_id'], data['title'])
    )
    db.commit()
    return jsonify({"message": "Forum created"})



@app.route('/forums/<int:course_id>', methods=['GET'])
def get_forums(course_id):
    cursor.execute("SELECT * FROM forums WHERE course_id = %s", (course_id,))
    return jsonify(cursor.fetchall())



@app.route('/threads', methods=['POST'])
def create_thread():
    data = request.json
    cursor.execute(
        "INSERT INTO threads (forum_id, title, created_by, content) VALUES (%s, %s, %s, %s)",
        (data['forum_id'], data['title'], data['created_by'], data['content'])
    )
    db.commit()
    return jsonify({"message": "Thread created"})



@app.route('/threads/<int:forum_id>', methods=['GET'])
def get_threads(forum_id):
    cursor.execute("SELECT * FROM threads WHERE forum_id = %s", (forum_id,))
    return jsonify(cursor.fetchall())



@app.route('/replies', methods=['POST'])
def create_reply():
    data = request.json
    cursor.execute(
        "INSERT INTO replies (thread_id, parent_reply_id, user_id, content) VALUES (%s, %s, %s, %s)",
        (data['thread_id'], data.get('parent_reply_id'), data['user_id'], data['content'])
    )
    db.commit()
    return jsonify({"message": "Reply added"})


if __name__ == '__main__':
    app.run(debug=True)