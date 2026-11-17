#!/usr/bin/env python3
"""PhoneKit - أداة بسيطة لإدارة جوال أندرويد عبر USB (adb).

الخصائص:
  1) معلومات الجهاز (الموديل، الإصدار، البطارية، المساحة)
  2) نسخ احتياطي للصور والملفات من الجوال إلى الكمبيوتر
  3) نقل ملفات من الكمبيوتر إلى الجوال
"""
import os
import shutil
import subprocess
import threading
import datetime
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

BACKUP_FOLDERS = ["DCIM", "Pictures", "Download", "Documents", "Movies", "Music"]


def find_adb():
    here = os.path.dirname(os.path.abspath(__file__))
    for name in ("adb.exe", "adb"):
        local = os.path.join(here, "platform-tools", name)
        if os.path.isfile(local):
            return local
    return shutil.which("adb")


ADB = find_adb()


def adb(*args, timeout=None):
    if not ADB:
        raise RuntimeError("ما لقيت adb. نزّل Platform Tools وحطها جنب البرنامج (شوف README).")
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    r = subprocess.run([ADB, *args], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout,
                       creationflags=flags)
    return (r.stdout + r.stderr).strip()


def connected_device():
    lines = adb("devices").splitlines()[1:]
    for line in lines:
        parts = line.split()
        if len(parts) >= 2:
            if parts[1] == "device":
                return parts[0], None
            if parts[1] == "unauthorized":
                return None, "افتح الجوال ووافق على (السماح بتصحيح USB)."
    return None, "ما فيه جوال متصل. وصّل الجوال وفعّل (تصحيح USB)."


def prop(name):
    return adb("shell", "getprop", name).strip()


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("PhoneKit - أدوات الجوال")
        self.geometry("720x520")
        self.minsize(600, 440)
        self.configure(bg="#f4f6fb")

        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("TNotebook.Tab", padding=(18, 8), font=("Segoe UI", 11))
        style.configure("Big.TButton", padding=10, font=("Segoe UI", 11, "bold"))
        style.configure("TLabel", background="#f4f6fb", font=("Segoe UI", 10))
        style.configure("TFrame", background="#f4f6fb")

        top = ttk.Frame(self, padding=(14, 10))
        top.pack(fill="x")
        self.status = tk.StringVar(value="⏳ جاري البحث عن جوال...")
        ttk.Label(top, textvariable=self.status, font=("Segoe UI", 11, "bold")).pack(side="right")
        ttk.Button(top, text="🔄 تحديث", command=self.refresh).pack(side="left")

        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True, padx=12, pady=(0, 6))
        self._build_info(nb)
        self._build_backup(nb)
        self._build_transfer(nb)

        self.progress = ttk.Progressbar(self, mode="indeterminate")
        self.progress.pack(fill="x", padx=12, pady=(0, 4))
        self.log = tk.Text(self, height=6, font=("Consolas", 9), bg="#1e2230", fg="#d6e2ff",
                           relief="flat")
        self.log.pack(fill="x", padx=12, pady=(0, 12))

        self.after(200, self.refresh)

    # ---------- helpers ----------
    def write(self, msg):
        def do():
            self.log.insert("end", msg + "\n")
            self.log.see("end")
        self.after(0, do)

    def run_bg(self, fn):
        def wrapper():
            self.after(0, self.progress.start)
            try:
                fn()
            except Exception as e:  # noqa: BLE001
                self.write(f"❌ خطأ: {e}")
                self.after(0, lambda: messagebox.showerror("خطأ", str(e)))
            finally:
                self.after(0, self.progress.stop)
        threading.Thread(target=wrapper, daemon=True).start()

    def need_device(self):
        serial, err = connected_device()
        if not serial:
            raise RuntimeError(err)
        return serial

    # ---------- 1) device info ----------
    def _build_info(self, nb):
        f = ttk.Frame(nb, padding=16)
        nb.add(f, text="📱 معلومات الجهاز")
        self.info_vars = {}
        rows = ["الشركة", "الموديل", "إصدار أندرويد", "الرقم التسلسلي",
                "البطارية", "حالة الشحن", "المساحة الداخلية"]
        for i, key in enumerate(rows):
            ttk.Label(f, text=key + ":", font=("Segoe UI", 11, "bold")).grid(
                row=i, column=1, sticky="e", pady=5, padx=6)
            v = tk.StringVar(value="—")
            self.info_vars[key] = v
            ttk.Label(f, textvariable=v, font=("Segoe UI", 11)).grid(
                row=i, column=0, sticky="e", pady=5)
        f.columnconfigure(0, weight=1)

    def refresh(self):
        def job():
            serial, err = connected_device()
            if not serial:
                self.after(0, lambda: self.status.set("🔴 " + err))
                return
            brand = prop("ro.product.manufacturer")
            model = prop("ro.product.model")
            ver = prop("ro.build.version.release")
            battery = adb("shell", "dumpsys", "battery")
            level, charging = "?", "غير معروف"
            for line in battery.splitlines():
                line = line.strip()
                if line.startswith("level:"):
                    level = line.split(":")[1].strip() + "%"
                if line.startswith("status:"):
                    s = line.split(":")[1].strip()
                    charging = {"2": "يشحن ⚡", "3": "لا يشحن", "4": "لا يشحن",
                                "5": "ممتلئة ✅"}.get(s, s)
            storage = "?"
            df = adb("shell", "df", "-h", "/sdcard").splitlines()
            if len(df) >= 2:
                p = df[-1].split()
                if len(p) >= 4:
                    storage = f"مستخدم {p[2]} من {p[1]} (متبقي {p[3]})"
            vals = {"الشركة": brand, "الموديل": model, "إصدار أندرويد": ver,
                    "الرقم التسلسلي": serial, "البطارية": level,
                    "حالة الشحن": charging, "المساحة الداخلية": storage}

            def show():
                for k, v in vals.items():
                    self.info_vars[k].set(v or "—")
                self.status.set(f"🟢 متصل: {brand} {model}")
            self.after(0, show)
            self.write(f"✅ تم الاتصال بـ {brand} {model}")
        self.run_bg(job)

    # ---------- 2) backup ----------
    def _build_backup(self, nb):
        f = ttk.Frame(nb, padding=16)
        nb.add(f, text="💾 نسخ احتياطي")
        ttk.Label(f, text="اختر وش تبي تنسخ من الجوال للكمبيوتر:",
                  font=("Segoe UI", 11, "bold")).pack(anchor="e", pady=(0, 8))
        labels = {"DCIM": "الكاميرا (DCIM)", "Pictures": "الصور", "Download": "التنزيلات",
                  "Documents": "المستندات", "Movies": "الفيديوهات", "Music": "الموسيقى"}
        self.backup_sel = {}
        grid = ttk.Frame(f)
        grid.pack(anchor="e")
        for i, folder in enumerate(BACKUP_FOLDERS):
            v = tk.BooleanVar(value=folder in ("DCIM", "Pictures"))
            self.backup_sel[folder] = v
            ttk.Checkbutton(grid, text=labels[folder], variable=v).grid(
                row=i // 3, column=2 - i % 3, sticky="e", padx=12, pady=4)
        ttk.Button(f, text="ابدأ النسخ الاحتياطي", style="Big.TButton",
                   command=self.backup).pack(pady=18)

    def backup(self):
        chosen = [k for k, v in self.backup_sel.items() if v.get()]
        if not chosen:
            messagebox.showinfo("تنبيه", "اختر مجلد واحد على الأقل.")
            return
        dest_root = filedialog.askdirectory(title="وين تبي تحفظ النسخة؟")
        if not dest_root:
            return

        def job():
            self.need_device()
            stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")
            dest = os.path.join(dest_root, f"Phone_Backup_{stamp}")
            os.makedirs(dest, exist_ok=True)
            for folder in chosen:
                self.write(f"⏳ جاري نسخ {folder} ...")
                out = adb("pull", f"/sdcard/{folder}", dest)
                last = out.splitlines()[-1] if out else ""
                if "does not exist" in out:
                    self.write(f"⚠️ المجلد {folder} غير موجود في الجوال، تم تخطيه.")
                else:
                    self.write(f"✅ {folder}: {last}")
            self.write(f"🎉 خلصت النسخة في: {dest}")
            self.after(0, lambda: messagebox.showinfo("تم", f"تم النسخ الاحتياطي في:\n{dest}"))
        self.run_bg(job)

    # ---------- 3) transfer ----------
    def _build_transfer(self, nb):
        f = ttk.Frame(nb, padding=16)
        nb.add(f, text="📤 نقل ملفات للجوال")
        ttk.Label(f, text="انقل ملفات أو مجلد كامل من الكمبيوتر إلى الجوال.",
                  font=("Segoe UI", 11, "bold")).pack(anchor="e")
        row = ttk.Frame(f)
        row.pack(anchor="e", pady=12)
        ttk.Label(row, text="المجلد في الجوال:").pack(side="right", padx=6)
        self.target = tk.StringVar(value="Download")
        ttk.Combobox(row, textvariable=self.target, width=18,
                     values=BACKUP_FOLDERS).pack(side="right")
        btns = ttk.Frame(f)
        btns.pack(pady=10)
        ttk.Button(btns, text="📄 اختر ملفات", style="Big.TButton",
                   command=self.push_files).pack(side="right", padx=8)
        ttk.Button(btns, text="📁 اختر مجلد", style="Big.TButton",
                   command=self.push_folder).pack(side="right", padx=8)

    def _push(self, paths):
        target = "/sdcard/" + (self.target.get().strip().strip("/") or "Download") + "/"

        def job():
            self.need_device()
            adb("shell", "mkdir", "-p", target)
            for p in paths:
                self.write(f"⏳ جاري نقل {os.path.basename(p)} ...")
                out = adb("push", p, target)
                self.write("✅ " + (out.splitlines()[-1] if out else "تم"))
            # تحديث معرض الصور عشان تبين الملفات الجديدة
            adb("shell", "am", "broadcast", "-a",
                "android.intent.action.MEDIA_SCANNER_SCAN_FILE", "-d", "file://" + target)
            self.write(f"🎉 تم نقل {len(paths)} عنصر إلى {target}")
            self.after(0, lambda: messagebox.showinfo("تم", f"تم النقل إلى {target}"))
        self.run_bg(job)

    def push_files(self):
        files = filedialog.askopenfilenames(title="اختر الملفات")
        if files:
            self._push(list(files))

    def push_folder(self):
        d = filedialog.askdirectory(title="اختر المجلد")
        if d:
            self._push([d])


if __name__ == "__main__":
    App().mainloop()
