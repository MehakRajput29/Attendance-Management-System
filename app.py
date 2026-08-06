from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
from datetime import datetime, date, timedelta

app = Flask(__name__)
app.secret_key = "attendance_secret_key_2025"

students = [
    {"id": "S101", "name": "Mehak Rajput",   "branch": "AI",           "year": "3rd", "email": "mehak@college.edu",   "phone": "9876543210", "status": "Active"},
    {"id": "S102", "name": "Riya Sharma",    "branch": "AI",           "year": "3rd", "email": "riya@college.edu",    "phone": "9876543211", "status": "Active"},
    {"id": "S103", "name": "Arjun Singh",    "branch": "Data Science", "year": "2nd", "email": "arjun@college.edu",   "phone": "9876543212", "status": "Active"},
    {"id": "S104", "name": "Priya Patel",    "branch": "CS",           "year": "1st", "email": "priya@college.edu",   "phone": "9876543213", "status": "Active"},
    {"id": "S105", "name": "Rohan Verma",    "branch": "Data Science", "year": "2nd", "email": "rohan@college.edu",   "phone": "9876543214", "status": "Active"},
    {"id": "S106", "name": "Sneha Kapoor",   "branch": "AI",           "year": "3rd", "email": "sneha@college.edu",   "phone": "9876543215", "status": "Active"},
    {"id": "S107", "name": "Kabir Malhotra", "branch": "CS",           "year": "1st", "email": "kabir@college.edu",   "phone": "9876543216", "status": "Inactive"},
    {"id": "S108", "name": "Ananya Gupta",   "branch": "AI",           "year": "2nd", "email": "ananya@college.edu",  "phone": "9876543217", "status": "Active"},
]

faculty_list = [
    {"id": "F01", "name": "Dr. Anil Kumar",   "department": "AI",           "email": "anil@college.edu",   "phone": "9988776651", "subjects": ["Machine Learning", "Deep Learning"]},
    {"id": "F02", "name": "Prof. Neha Gupta", "department": "Data Science", "email": "neha@college.edu",   "phone": "9988776652", "subjects": ["Statistics", "Data Mining"]},
    {"id": "F03", "name": "Dr. Rajesh Mehta", "department": "CS",           "email": "rajesh@college.edu", "phone": "9988776653", "subjects": ["Algorithms", "OS"]},
    {"id": "F04", "name": "Prof. Kavita Rao", "department": "AI",           "email": "kavita@college.edu", "phone": "9988776654", "subjects": ["NLP", "Computer Vision"]},
]

today_str = date.today().isoformat()
attendance_records = {
    (date.today() - timedelta(days=i)).isoformat(): {
        s["id"]: ("Present" if (hash(s["id"] + str(i)) % 5 != 0) else "Absent")
        for s in students
    }
    for i in range(30)
}

users = {
    "admin":   {"username": "admin",   "password": "admin123",   "role": "admin"},
    "faculty": {"username": "faculty", "password": "faculty123", "role": "faculty"},
    "student": {"username": "student", "password": "student123", "role": "student"},
}

def login_required(role=None):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if "user" not in session:
                return redirect(url_for("home"))
            if role and session["user"]["role"] != role:
                return redirect(url_for("home"))
            return f(*args, **kwargs)
        return decorated
    return decorator

@app.route("/")
def home():
    if "user" in session:
        role = session["user"]["role"]
        return redirect(url_for(f"{role}_dashboard"))
    return render_template("index.html")

@app.route("/admin-dashboard")
@login_required("admin")
def admin_dashboard():
    return render_template("admin_dashboard/admin_dashboard.html")

@app.route("/student-dashboard")
@login_required("student")
def student_dashboard():
    return render_template("student_dashboard/student_dashboard.html")

@app.route("/faculty-dashboard")
@login_required("faculty")
def faculty_dashboard():
    return render_template("faculty_dashboard/faculty_dashboard.html")

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    role = data.get("role")
    username = data.get("username")
    password = data.get("password")
    if role in users and users[role]["username"] == username and users[role]["password"] == password:
        session["user"] = {"username": username, "role": role}
        return jsonify({"success": True, "role": role})
    return jsonify({"success": False, "message": "Invalid credentials"})

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))

@app.route("/api/admin/stats")
@login_required("admin")
def admin_stats():
    total = len(students)
    today_att = attendance_records.get(today_str, {})
    present_today = sum(1 for v in today_att.values() if v == "Present")
    all_pcts = []
    for day in attendance_records.values():
        if day:
            all_pcts.append(sum(1 for v in day.values() if v == "Present") / len(day) * 100)
    avg = round(sum(all_pcts) / max(len(all_pcts), 1), 1)
    return jsonify({"total_students": total, "total_faculty": len(faculty_list),
                    "classes": 12, "attendance_avg": avg,
                    "present_today": present_today, "absent_today": total - present_today})

@app.route("/api/admin/students", methods=["GET"])
@login_required("admin")
def get_students():
    return jsonify(students)

@app.route("/api/admin/students", methods=["POST"])
@login_required("admin")
def add_student():
    data = request.json
    data["id"] = f"S{100 + len(students) + 1}"
    data["status"] = "Active"
    students.append(data)
    return jsonify({"success": True, "student": data})

@app.route("/api/admin/students/<sid>", methods=["DELETE"])
@login_required("admin")
def delete_student(sid):
    global students
    students = [s for s in students if s["id"] != sid]
    return jsonify({"success": True})

@app.route("/api/admin/faculty")
@login_required("admin")
def get_faculty():
    return jsonify(faculty_list)

@app.route("/api/admin/attendance")
@login_required("admin")
def admin_attendance():
    result = []
    for day, records in sorted(attendance_records.items(), reverse=True)[:14]:
        present = sum(1 for v in records.values() if v == "Present")
        total = len(records)
        result.append({"date": day, "present": present, "absent": total - present, "total": total})
    return jsonify(result)

@app.route("/api/admin/attendance/full")
@login_required("admin")
def admin_attendance_full():
    result = []
    for day, records in sorted(attendance_records.items(), reverse=True)[:30]:
        for sid, status in records.items():
            student = next((s for s in students if s["id"] == sid), None)
            if student:
                result.append({"date": day, "student_id": sid, "name": student["name"],
                                "branch": student["branch"], "status": status})
    return jsonify(result)

@app.route("/api/student/me")
@login_required("student")
def student_me():
    s = students[0]
    records = {day: attendance_records[day].get(s["id"], "Absent")
               for day in sorted(attendance_records.keys(), reverse=True)[:30]}
    present = sum(1 for v in records.values() if v == "Present")
    total = len(records)
    return jsonify({"profile": s, "attendance_pct": round(present / max(total, 1) * 100, 1),
                    "present_days": present, "absent_days": total - present,
                    "recent_attendance": [{"date": k, "status": v}
                                          for k, v in sorted(records.items(), reverse=True)[:10]]})

@app.route("/api/student/assignments")
@login_required("student")
def student_assignments():
    return jsonify([
        {"title": "AI Project Report",       "subject": "Machine Learning", "due": "2025-11-20", "status": "Submitted"},
        {"title": "Math Worksheet",           "subject": "Statistics",       "due": "2025-11-22", "status": "Pending"},
        {"title": "Data Science Case Study",  "subject": "Data Mining",      "due": "2025-11-18", "status": "Submitted"},
        {"title": "Deep Learning Lab Report", "subject": "Deep Learning",    "due": "2025-11-25", "status": "Pending"},
        {"title": "NLP Assignment",           "subject": "NLP",              "due": "2025-11-28", "status": "Submitted"},
    ])

@app.route("/api/student/timetable")
@login_required("student")
def student_timetable():
    return jsonify([
        {"day": "Monday",    "slots": ["Machine Learning — 9:00 AM", "Statistics — 11:00 AM", "Lab — 2:00 PM"]},
        {"day": "Tuesday",   "slots": ["Deep Learning — 10:00 AM", "Data Mining — 12:00 PM"]},
        {"day": "Wednesday", "slots": ["NLP — 9:00 AM", "Computer Vision — 11:00 AM", "Lab — 2:00 PM"]},
        {"day": "Thursday",  "slots": ["Algorithms — 9:00 AM", "OS — 11:00 AM"]},
        {"day": "Friday",    "slots": ["Machine Learning — 10:00 AM", "Seminar — 2:00 PM"]},
    ])

@app.route("/api/faculty/me")
@login_required("faculty")
def faculty_me():
    return jsonify(faculty_list[1])

@app.route("/api/faculty/students")
@login_required("faculty")
def faculty_students():
    return jsonify([s for s in students if s["branch"] in ["AI", "Data Science"]])

@app.route("/api/faculty/attendance/today")
@login_required("faculty")
def faculty_attendance_today():
    records = attendance_records.get(today_str, {})
    result = []
    for s in students:
        result.append({"id": s["id"], "name": s["name"], "branch": s["branch"],
                       "status": records.get(s["id"], "Absent")})
    return jsonify(result)

@app.route("/api/faculty/attendance/save", methods=["POST"])
@login_required("faculty")
def faculty_save_attendance():
    data = request.json
    att_date = data.get("date", today_str)
    records = data.get("records", {})
    if att_date not in attendance_records:
        attendance_records[att_date] = {}
    attendance_records[att_date].update(records)
    return jsonify({"success": True, "saved": len(records)})

@app.route("/api/faculty/reports")
@login_required("faculty")
def faculty_reports():
    result = []
    days = sorted(attendance_records.keys(), reverse=True)[:30]
    for s in students:
        present = sum(1 for d in days if attendance_records[d].get(s["id"]) == "Present")
        result.append({"id": s["id"], "name": s["name"], "branch": s["branch"],
                       "present": present, "total": len(days),
                       "pct": round(present / max(len(days), 1) * 100, 1)})
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
