import sqlite3
import hashlib
import os
from datetime import date, timedelta
import random

DB_PATH = os.path.join(os.path.dirname(__file__), 'attendance.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def init_db():
    conn = get_db()
    c = conn.cursor()

    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','faculty','student')),
        created_at TEXT DEFAULT (date('now'))
    )''')

    # Students table
    c.execute('''CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        branch TEXT NOT NULL,
        year TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        status TEXT DEFAULT 'Active',
        user_id INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT (date('now'))
    )''')

    # Faculty table
    c.execute('''CREATE TABLE IF NOT EXISTS faculty (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        faculty_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        subjects TEXT,
        user_id INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT (date('now'))
    )''')

    # Attendance table
    c.execute('''CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Present','Absent')),
        marked_by TEXT,
        subject TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(student_id, date, subject)
    )''')

    # Files / uploads table
    c.execute('''CREATE TABLE IF NOT EXISTS uploaded_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        role TEXT NOT NULL,
        description TEXT,
        file_type TEXT,
        file_size INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
    )''')

    # Notices/announcements table
    c.execute('''CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        posted_by TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )''')

    conn.commit()

    # Seed data only if empty
    if c.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        _seed(c, conn)

    conn.close()

def _seed(c, conn):
    # Admin user
    c.execute("INSERT INTO users (username,password,role) VALUES (?,?,?)",
              ('admin', hash_password('admin123'), 'admin'))

    # Faculty users & records
    faculty_data = [
        ('F01','Dr. Anil Kumar','AI','anil@college.edu','9988776651','Machine Learning,Deep Learning'),
        ('F02','Prof. Neha Gupta','Data Science','neha@college.edu','9988776652','Statistics,Data Mining'),
        ('F03','Dr. Rajesh Mehta','CS','rajesh@college.edu','9988776653','Algorithms,OS'),
        ('F04','Prof. Kavita Rao','AI','kavita@college.edu','9988776654','NLP,Computer Vision'),
    ]
    for fid, name, dept, email, phone, subjects in faculty_data:
        uname = fid.lower()
        c.execute("INSERT INTO users (username,password,role) VALUES (?,?,?)",
                  (uname, hash_password(uname+'123'), 'faculty'))
        uid = c.lastrowid
        c.execute("INSERT INTO faculty (faculty_id,name,department,email,phone,subjects,user_id) VALUES (?,?,?,?,?,?,?)",
                  (fid, name, dept, email, phone, subjects, uid))

    # Student users & records
    students_data = [
        ('S101','Mehak Rajput','AI','3rd','mehak@college.edu','9876543210'),
        ('S102','Riya Sharma','AI','3rd','riya@college.edu','9876543211'),
        ('S103','Arjun Singh','Data Science','2nd','arjun@college.edu','9876543212'),
        ('S104','Priya Patel','CS','1st','priya@college.edu','9876543213'),
        ('S105','Rohan Verma','Data Science','2nd','rohan@college.edu','9876543214'),
        ('S106','Sneha Kapoor','AI','3rd','sneha@college.edu','9876543215'),
        ('S107','Kabir Malhotra','CS','1st','kabir@college.edu','9876543216'),
        ('S108','Ananya Gupta','AI','2nd','ananya@college.edu','9876543217'),
    ]
    for sid, name, branch, year, email, phone in students_data:
        uname = sid.lower()
        c.execute("INSERT INTO users (username,password,role) VALUES (?,?,?)",
                  (uname, hash_password(uname+'123'), 'student'))
        uid = c.lastrowid
        c.execute("INSERT INTO students (student_id,name,branch,year,email,phone,user_id) VALUES (?,?,?,?,?,?,?)",
                  (sid, name, branch, year, email, phone, uid))

    # Generate 30 days of attendance
    today = date.today()
    all_sids = [s[0] for s in students_data]
    subjects = ['Machine Learning','Statistics','Data Mining','Deep Learning','NLP']
    for i in range(30):
        d = (today - timedelta(days=i)).isoformat()
        for sid in all_sids:
            status = 'Present' if random.random() > 0.2 else 'Absent'
            subj = random.choice(subjects)
            c.execute("INSERT OR IGNORE INTO attendance (student_id,date,status,marked_by,subject) VALUES (?,?,?,?,?)",
                      (sid, d, status, 'F01', subj))

    # Seed notices
    c.execute("INSERT INTO notices (title,body,posted_by,role) VALUES (?,?,?,?)",
              ('Welcome to the New Portal', 'The attendance portal has been upgraded with a full database. All records are now persistent.', 'admin', 'admin'))
    c.execute("INSERT INTO notices (title,body,posted_by,role) VALUES (?,?,?,?)",
              ('Mid-Term Exams Schedule', 'Mid-term exams will be held from Nov 25–30. Attendance is mandatory for all subjects.', 'admin', 'admin'))

    conn.commit()
    print("✅ Database seeded successfully.")
