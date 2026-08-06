from flask import (Flask, render_template, request, jsonify,
                   session, redirect, url_for, send_from_directory)
from functools import wraps
from datetime import date
import os, uuid, hashlib
from database import get_db, hash_password, init_db

app = Flask(__name__)
app.secret_key = "attendance_secret_key_2025"

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'pdf','doc','docx','xls','xlsx','ppt','pptx','png','jpg','jpeg','txt','csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.',1)[1].lower() in ALLOWED_EXTENSIONS

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

# ── Pages ──────────────────────────────────────────────────────────────────────
@app.route("/")
def home():
    if "user" in session:
        return redirect(url_for(session["user"]["role"] + "_dashboard"))
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

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))

# ── Auth ───────────────────────────────────────────────────────────────────────
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username=? AND password=? AND role=?",
                      (data["username"], hash_password(data["password"]), data["role"])).fetchone()
    db.close()
    if user:
        session["user"] = {"id": user["id"], "username": user["username"], "role": user["role"]}
        return jsonify({"success": True, "role": user["role"]})
    return jsonify({"success": False, "message": "Invalid credentials"})

# ── Admin APIs ─────────────────────────────────────────────────────────────────
@app.route("/api/admin/stats")
@login_required("admin")
def admin_stats():
    db = get_db()
    today = date.today().isoformat()
    total_s = db.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    total_f = db.execute("SELECT COUNT(*) FROM faculty").fetchone()[0]
    present = db.execute("SELECT COUNT(*) FROM attendance WHERE date=? AND status='Present'", (today,)).fetchone()[0]
    absent  = db.execute("SELECT COUNT(*) FROM attendance WHERE date=? AND status='Absent'",  (today,)).fetchone()[0]
    total_days = db.execute("SELECT COUNT(DISTINCT date) FROM attendance").fetchone()[0]
    total_present = db.execute("SELECT COUNT(*) FROM attendance WHERE status='Present'").fetchone()[0]
    total_records = db.execute("SELECT COUNT(*) FROM attendance").fetchone()[0]
    avg = round(total_present / max(total_records, 1) * 100, 1)
    notices = db.execute("SELECT COUNT(*) FROM notices").fetchone()[0]
    files = db.execute("SELECT COUNT(*) FROM uploaded_files").fetchone()[0]
    db.close()
    return jsonify({"total_students": total_s, "total_faculty": total_f,
                    "present_today": present, "absent_today": absent,
                    "attendance_avg": avg, "classes": 12,
                    "notices": notices, "files": files})

@app.route("/api/admin/students", methods=["GET"])
@login_required("admin")
def get_students():
    db = get_db()
    rows = db.execute("SELECT * FROM students ORDER BY student_id").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/admin/students", methods=["POST"])
@login_required("admin")
def add_student():
    d = request.json
    db = get_db()
    try:
        # Auto-generate student_id
        last = db.execute("SELECT student_id FROM students ORDER BY id DESC LIMIT 1").fetchone()
        if last:
            num = int(last["student_id"][1:]) + 1
        else:
            num = 101
        sid = f"S{num}"
        uname = sid.lower()
        db.execute("INSERT INTO users (username,password,role) VALUES (?,?,?)",
                   (uname, hash_password(uname+'123'), 'student'))
        uid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        db.execute("INSERT INTO students (student_id,name,branch,year,email,phone,user_id) VALUES (?,?,?,?,?,?,?)",
                   (sid, d["name"], d["branch"], d["year"], d["email"], d.get("phone",""), uid))
        db.commit()
        db.close()
        return jsonify({"success": True, "student_id": sid, "username": uname, "default_password": uname+"123"})
    except Exception as e:
        db.close()
        return jsonify({"success": False, "message": str(e)})

@app.route("/api/admin/students/<sid>", methods=["PUT"])
@login_required("admin")
def update_student(sid):
    d = request.json
    db = get_db()
    db.execute("UPDATE students SET name=?,branch=?,year=?,email=?,phone=?,status=? WHERE student_id=?",
               (d["name"], d["branch"], d["year"], d["email"], d.get("phone",""), d.get("status","Active"), sid))
    db.commit()
    db.close()
    return jsonify({"success": True})

@app.route("/api/admin/students/<sid>", methods=["DELETE"])
@login_required("admin")
def delete_student(sid):
    db = get_db()
    row = db.execute("SELECT user_id FROM students WHERE student_id=?", (sid,)).fetchone()
    if row:
        db.execute("DELETE FROM attendance WHERE student_id=?", (sid,))
        db.execute("DELETE FROM students WHERE student_id=?", (sid,))
        if row["user_id"]:
            db.execute("DELETE FROM users WHERE id=?", (row["user_id"],))
        db.commit()
    db.close()
    return jsonify({"success": True})

@app.route("/api/admin/faculty", methods=["GET"])
@login_required("admin")
def get_faculty():
    db = get_db()
    rows = db.execute("SELECT * FROM faculty ORDER BY faculty_id").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/admin/faculty", methods=["POST"])
@login_required("admin")
def add_faculty():
    d = request.json
    db = get_db()
    try:
        last = db.execute("SELECT faculty_id FROM faculty ORDER BY id DESC LIMIT 1").fetchone()
        num = int(last["faculty_id"][1:]) + 1 if last else 1
        fid = f"F{num:02d}"
        uname = fid.lower()
        db.execute("INSERT INTO users (username,password,role) VALUES (?,?,?)",
                   (uname, hash_password(uname+'123'), 'faculty'))
        uid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        db.execute("INSERT INTO faculty (faculty_id,name,department,email,phone,subjects,user_id) VALUES (?,?,?,?,?,?,?)",
                   (fid, d["name"], d["department"], d["email"], d.get("phone",""), d.get("subjects",""), uid))
        db.commit()
        db.close()
        return jsonify({"success": True, "faculty_id": fid, "username": uname, "default_password": uname+"123"})
    except Exception as e:
        db.close()
        return jsonify({"success": False, "message": str(e)})

@app.route("/api/admin/faculty/<fid>", methods=["DELETE"])
@login_required("admin")
def delete_faculty(fid):
    db = get_db()
    row = db.execute("SELECT user_id FROM faculty WHERE faculty_id=?", (fid,)).fetchone()
    if row:
        db.execute("DELETE FROM faculty WHERE faculty_id=?", (fid,))
        if row["user_id"]:
            db.execute("DELETE FROM users WHERE id=?", (row["user_id"],))
        db.commit()
    db.close()
    return jsonify({"success": True})

@app.route("/api/admin/attendance")
@login_required("admin")
def admin_attendance_summary():
    db = get_db()
    rows = db.execute("""
        SELECT date,
               SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) as present,
               SUM(CASE WHEN status='Absent'  THEN 1 ELSE 0 END) as absent,
               COUNT(*) as total
        FROM attendance
        GROUP BY date ORDER BY date DESC LIMIT 14
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/admin/attendance/full")
@login_required("admin")
def admin_attendance_full():
    branch = request.args.get("branch","")
    db = get_db()
    q = """SELECT a.date, a.student_id, s.name, s.branch, a.status, a.subject, a.marked_by
           FROM attendance a JOIN students s ON a.student_id=s.student_id
           {} ORDER BY a.date DESC, s.name LIMIT 200"""
    if branch:
        rows = db.execute(q.format("WHERE s.branch=?"), (branch,)).fetchall()
    else:
        rows = db.execute(q.format("")).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/admin/notices", methods=["GET"])
@login_required("admin")
def get_notices_admin():
    db = get_db()
    rows = db.execute("SELECT * FROM notices ORDER BY created_at DESC").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/admin/notices", methods=["POST"])
@login_required("admin")
def add_notice():
    d = request.json
    db = get_db()
    db.execute("INSERT INTO notices (title,body,posted_by,role) VALUES (?,?,?,?)",
               (d["title"], d["body"], session["user"]["username"], "admin"))
    db.commit()
    db.close()
    return jsonify({"success": True})

@app.route("/api/admin/notices/<int:nid>", methods=["DELETE"])
@login_required("admin")
def delete_notice(nid):
    db = get_db()
    db.execute("DELETE FROM notices WHERE id=?", (nid,))
    db.commit()
    db.close()
    return jsonify({"success": True})

@app.route("/api/admin/files")
@login_required("admin")
def admin_files():
    db = get_db()
    rows = db.execute("SELECT * FROM uploaded_files ORDER BY created_at DESC").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

# ── Faculty APIs ───────────────────────────────────────────────────────────────
@app.route("/api/faculty/me")
@login_required("faculty")
def faculty_me():
    db = get_db()
    row = db.execute("SELECT * FROM faculty WHERE user_id=?", (session["user"]["id"],)).fetchone()
    db.close()
    return jsonify(dict(row) if row else {})

@app.route("/api/faculty/students")
@login_required("faculty")
def faculty_students():
    db = get_db()
    rows = db.execute("SELECT * FROM students ORDER BY branch, name").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/faculty/attendance/date")
@login_required("faculty")
def faculty_attendance_date():
    d = request.args.get("date", date.today().isoformat())
    db = get_db()
    students = db.execute("SELECT * FROM students ORDER BY branch, name").fetchall()
    att_rows = db.execute("SELECT student_id, status FROM attendance WHERE date=?", (d,)).fetchall()
    att_map = {r["student_id"]: r["status"] for r in att_rows}
    result = [{"id": s["student_id"], "name": s["name"], "branch": s["branch"],
               "status": att_map.get(s["student_id"], "Present")} for s in students]
    db.close()
    return jsonify(result)

@app.route("/api/faculty/attendance/save", methods=["POST"])
@login_required("faculty")
def faculty_save_attendance():
    data = request.json
    att_date = data.get("date", date.today().isoformat())
    records = data.get("records", {})
    subject = data.get("subject", "General")
    db = get_db()
    fac = db.execute("SELECT faculty_id FROM faculty WHERE user_id=?", (session["user"]["id"],)).fetchone()
    marked_by = fac["faculty_id"] if fac else "unknown"
    for sid, status in records.items():
        db.execute("""INSERT INTO attendance (student_id,date,status,marked_by,subject)
                      VALUES (?,?,?,?,?)
                      ON CONFLICT(student_id,date,subject) DO UPDATE SET status=excluded.status, marked_by=excluded.marked_by""",
                   (sid, att_date, status, marked_by, subject))
    db.commit()
    db.close()
    return jsonify({"success": True, "saved": len(records)})

@app.route("/api/faculty/reports")
@login_required("faculty")
def faculty_reports():
    db = get_db()
    rows = db.execute("""
        SELECT s.student_id, s.name, s.branch,
               SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) as present,
               COUNT(a.id) as total
        FROM students s LEFT JOIN attendance a ON s.student_id=a.student_id
        GROUP BY s.student_id ORDER BY s.branch, s.name
    """).fetchall()
    db.close()
    result = []
    for r in rows:
        pct = round(r["present"] / max(r["total"], 1) * 100, 1)
        result.append({"id": r["student_id"], "name": r["name"], "branch": r["branch"],
                        "present": r["present"], "total": r["total"], "pct": pct})
    return jsonify(result)

@app.route("/api/faculty/upload", methods=["POST"])
@login_required("faculty")
def faculty_upload():
    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file"})
    f = request.files["file"]
    if f.filename == "" or not allowed_file(f.filename):
        return jsonify({"success": False, "message": "Invalid file type"})
    ext = f.filename.rsplit(".",1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    f.save(os.path.join(UPLOAD_FOLDER, unique_name))
    size = os.path.getsize(os.path.join(UPLOAD_FOLDER, unique_name))
    db = get_db()
    fac = db.execute("SELECT name FROM faculty WHERE user_id=?", (session["user"]["id"],)).fetchone()
    uploader = fac["name"] if fac else session["user"]["username"]
    db.execute("INSERT INTO uploaded_files (filename,original_name,uploaded_by,role,description,file_type,file_size) VALUES (?,?,?,?,?,?,?)",
               (unique_name, f.filename, uploader, "faculty",
                request.form.get("description",""), ext, size))
    db.commit()
    db.close()
    return jsonify({"success": True, "filename": f.filename})

@app.route("/api/faculty/files")
@login_required("faculty")
def faculty_files():
    db = get_db()
    fac = db.execute("SELECT name FROM faculty WHERE user_id=?", (session["user"]["id"],)).fetchone()
    uploader = fac["name"] if fac else session["user"]["username"]
    rows = db.execute("SELECT * FROM uploaded_files WHERE uploaded_by=? ORDER BY created_at DESC", (uploader,)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/faculty/notices")
@login_required("faculty")
def faculty_notices():
    db = get_db()
    rows = db.execute("SELECT * FROM notices ORDER BY created_at DESC LIMIT 10").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/faculty/notices", methods=["POST"])
@login_required("faculty")
def faculty_add_notice():
    d = request.json
    db = get_db()
    fac = db.execute("SELECT name FROM faculty WHERE user_id=?", (session["user"]["id"],)).fetchone()
    posted_by = fac["name"] if fac else session["user"]["username"]
    db.execute("INSERT INTO notices (title,body,posted_by,role) VALUES (?,?,?,?)",
               (d["title"], d["body"], posted_by, "faculty"))
    db.commit()
    db.close()
    return jsonify({"success": True})

# ── Student APIs ───────────────────────────────────────────────────────────────
@app.route("/api/student/me")
@login_required("student")
def student_me():
    db = get_db()
    s = db.execute("SELECT * FROM students WHERE user_id=?", (session["user"]["id"],)).fetchone()
    if not s:
        db.close()
        return jsonify({})
    sid = s["student_id"]
    records = db.execute("SELECT date, status FROM attendance WHERE student_id=? ORDER BY date DESC LIMIT 30", (sid,)).fetchall()
    present = sum(1 for r in records if r["status"] == "Present")
    total = len(records)
    db.close()
    return jsonify({"profile": dict(s),
                    "attendance_pct": round(present/max(total,1)*100,1),
                    "present_days": present, "absent_days": total-present,
                    "recent_attendance": [dict(r) for r in records[:10]]})

@app.route("/api/student/attendance/full")
@login_required("student")
def student_attendance_full():
    db = get_db()
    s = db.execute("SELECT student_id FROM students WHERE user_id=?", (session["user"]["id"],)).fetchone()
    if not s:
        db.close()
        return jsonify([])
    rows = db.execute("SELECT date,status,subject,marked_by FROM attendance WHERE student_id=? ORDER BY date DESC",
                      (s["student_id"],)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/student/notices")
@login_required("student")
def student_notices():
    db = get_db()
    rows = db.execute("SELECT * FROM notices ORDER BY created_at DESC").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/student/files")
@login_required("student")
def student_files():
    db = get_db()
    rows = db.execute("SELECT * FROM uploaded_files ORDER BY created_at DESC").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

# ── File download ──────────────────────────────────────────────────────────────
@app.route("/uploads/<filename>")
def download_file(filename):
    if "user" not in session:
        return redirect(url_for("home"))
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)

# ── Change password ────────────────────────────────────────────────────────────
@app.route("/api/change-password", methods=["POST"])
def change_password():
    if "user" not in session:
        return jsonify({"success": False})
    d = request.json
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (session["user"]["id"],)).fetchone()
    if user["password"] != hash_password(d["current"]):
        db.close()
        return jsonify({"success": False, "message": "Current password is incorrect"})
    db.execute("UPDATE users SET password=? WHERE id=?",
               (hash_password(d["new"]), session["user"]["id"]))
    db.commit()
    db.close()
    return jsonify({"success": True})

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
