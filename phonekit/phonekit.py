#!/usr/bin/env python3
"""PhoneKit - أداة بسيطة لإدارة الجوال (أندرويد + آيفون) عبر USB.

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

import ios_device

BACKUP_FOLDERS = ["DCIM", "Pictures", "Download", "Documents", "Movies", "Music"]
ANDROID_LABELS = {"DCIM": "الكاميرا (DCIM)", "Pictures": "الصور", "Download": "التنزيلات",
                  "Documents": "المستندات", "Movies": "الفيديوهات", "Music": "الموسيقى"}


# ================= Android (adb) =================
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


def android_device():
    if not ADB:
        return None, None
    for line in adb("devices", timeout=10).splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 2:
            if parts[1] == "device":
                return parts[0], None
            if parts[1] == "unauthorized":
                return None, "افتح الجوال ووافق على (السماح بتصحيح USB)."
    return None, None


def prop(name):
    return adb("shell", "getprop", name).strip()


def android_info(serial):
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
    brand, model = prop("ro.product.manufacturer"), prop("ro.product.model")
    return {"الشركة": brand, "الموديل": model,
            "إصدار أندرويد": "Android " + prop("ro.build.version.release"),
            "الرقم التسلسلي": serial, "البطارية": level, "حالة الشحن": charging,
            "المساحة الداخلية": storage, "_name": f"{brand} {model}"}


# ================= UI =================
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("PhoneKit - أدوات الجوال (أندرويد + آيفون)")
        self.geometry("760x560")
        self.minsize(620, 460)
        self.configure(bg="#f4f6fb")
        self.kind = None      # "android" | "ios" | None
        self.serial = None
        self.ios_apps = {}

        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("TNotebook.Tab", padding=(18, 8), font=("Segoe UI", 11))
        style.configure("Big.TButton", padding=10, font=("Segoe UI", 11, "bold"))
        style.configure("TLabel", background="#f4f6fb", font=("Segoe UI", 10))
        style.configure("TFrame", background="#f4f6fb")
        style.configure("TCheckbutton", background="#f4f6fb", font=("Segoe UI", 10))

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

        self._apply_kind()
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
                msg = str(e) or e.__class__.__name__
                self.write(f"❌ خطأ: {msg}")
                self.after(0, lambda: messagebox.showerror("خطأ", msg))
            finally:
                self.after(0, self.progress.stop)
        threading.Thread(target=wrapper, daemon=True).start()

    def need_device(self):
        if not self.serial:
            raise RuntimeError("ما فيه جوال متصل. وصّل الجوال واضغط (تحديث).")

    # ---------- 1) device info ----------
    def _build_info(self, nb):
        f = ttk.Frame(nb, padding=16)
        nb.add(f, text="📱 معلومات الجهاز")
        self.info_vars = {}
        labels = {"إصدار أندرويد": "النظام"}
        rows = ["الشركة", "الموديل", "إصدار أندرويد", "الرقم التسلسلي",
                "البطارية", "حالة الشحن", "المساحة الداخلية"]
        for i, key in enumerate(rows):
            ttk.Label(f, text=labels.get(key, key) + ":", font=("Segoe UI", 11, "bold")).grid(
                row=i, column=1, sticky="e", pady=5, padx=6)
            v = tk.StringVar(value="—")
            self.info_vars[key] = v
            ttk.Label(f, textvariable=v, font=("Segoe UI", 11)).grid(
                row=i, column=0, sticky="e", pady=5)
        f.columnconfigure(0, weight=1)

    def refresh(self):
        def job():
            kind, serial, err = None, None, None
            serial, err = android_device()
            if serial:
                kind = "android"
            else:
                ios_serial, _ = ios_device.detect()
                if ios_serial:
                    kind, serial = "ios", ios_serial
            if not serial:
                if not err:
                    err = "ما فيه جوال متصل. وصّل الجوال بالكيبل."
                    if not ios_device.AVAILABLE:
                        err += " (دعم الآيفون يحتاج: pip install pymobiledevice3)"
                self.kind, self.serial = None, None
                self.after(0, lambda: (self.status.set("🔴 " + err), self._apply_kind()))
                return
            self.kind, self.serial = kind, serial
            if kind == "ios":
                self.write("📲 آيفون متصل. إذا طلع لك (هل تثق بهذا الكمبيوتر؟) اضغط (ثقة) وأدخل الرمز.")
            vals = android_info(serial) if kind == "android" else ios_device.info(serial)
            if kind == "ios":
                self.ios_apps = ios_device.file_sharing_apps(serial)

            def show():
                for k, v in self.info_vars.items():
                    v.set(vals.get(k) or "—")
                icon = "🤖" if kind == "android" else "🍎"
                self.status.set(f"🟢 متصل {icon}: {vals['_name']}")
                self._apply_kind()
            self.after(0, show)
            self.write(f"✅ تم الاتصال بـ {vals['_name']}")
        self.run_bg(job)

    def _apply_kind(self):
        """يبدّل خيارات النسخ والنقل حسب نوع الجوال."""
        ios = self.kind == "ios"
        if ios:
            self.android_backup.pack_forget()
            self.ios_backup.pack(anchor="e", before=self.backup_btn)
            names = list(self.ios_apps) or ["(ما فيه تطبيقات تقبل ملفات)"]
            self.target_label.set("التطبيق في الآيفون:")
            self.target_box.configure(values=names, width=40)
            if self.target.get() not in self.ios_apps:
                self.target.set(names[0])
            self.transfer_hint.set("الآيفون ما يسمح بالنقل لأي مكان؛ الملفات تروح لتطبيق تختاره "
                                   "وتلقاها في تطبيق (الملفات) ← على الآيفون ← اسم التطبيق.")
        else:
            self.ios_backup.pack_forget()
            self.android_backup.pack(anchor="e", before=self.backup_btn)
            self.target_label.set("المجلد في الجوال:")
            self.target_box.configure(values=BACKUP_FOLDERS, width=18)
            if self.target.get() not in BACKUP_FOLDERS:
                self.target.set("Download")
            self.transfer_hint.set("")

    # ---------- 2) backup ----------
    def _build_backup(self, nb):
        f = ttk.Frame(nb, padding=16)
        nb.add(f, text="💾 نسخ احتياطي")
        ttk.Label(f, text="اختر وش تبي تنسخ من الجوال للكمبيوتر:",
                  font=("Segoe UI", 11, "bold")).pack(anchor="e", pady=(0, 8))

        self.android_backup = ttk.Frame(f)
        self.backup_sel = {}
        for i, folder in enumerate(BACKUP_FOLDERS):
            v = tk.BooleanVar(value=folder in ("DCIM", "Pictures"))
            self.backup_sel[folder] = v
            ttk.Checkbutton(self.android_backup, text=ANDROID_LABELS[folder], variable=v).grid(
                row=i // 3, column=2 - i % 3, sticky="e", padx=12, pady=4)

        self.ios_backup = ttk.Frame(f)
        self.ios_photos = tk.BooleanVar(value=True)
        self.ios_full = tk.BooleanVar(value=False)
        ttk.Checkbutton(self.ios_backup, text="الصور والفيديوهات (الكاميرا)",
                        variable=self.ios_photos).pack(anchor="e", pady=4)
        ttk.Checkbutton(self.ios_backup,
                        text="نسخة كاملة للآيفون (رسائل، جهات اتصال، إعدادات...) - تاخذ وقت",
                        variable=self.ios_full).pack(anchor="e", pady=4)

        self.backup_btn = ttk.Button(f, text="ابدأ النسخ الاحتياطي", style="Big.TButton",
                                     command=self.backup)
        self.backup_btn.pack(pady=18)

    def backup(self):
        if self.kind == "ios":
            chosen = (["photos"] if self.ios_photos.get() else []) + \
                     (["full"] if self.ios_full.get() else [])
        else:
            chosen = [k for k, v in self.backup_sel.items() if v.get()]
        if not chosen:
            messagebox.showinfo("تنبيه", "اختر شي واحد على الأقل.")
            return
        dest_root = filedialog.askdirectory(title="وين تبي تحفظ النسخة؟")
        if not dest_root:
            return
        kind, serial = self.kind, self.serial

        def job():
            self.need_device()
            stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")
            dest = os.path.join(dest_root, f"Phone_Backup_{stamp}")
            os.makedirs(dest, exist_ok=True)
            if kind == "ios":
                if "photos" in chosen:
                    self.write("⏳ جاري نسخ الصور والفيديوهات ...")
                    n = ios_device.backup_photos(serial, os.path.join(dest, "Photos"), self.write)
                    self.write(f"✅ تم نسخ {n} ملف")
                if "full" in chosen:
                    self.write("⏳ جاري النسخة الكاملة (ممكن يطلب منك رمز الآيفون) ...")
                    ios_device.full_backup(serial, os.path.join(dest, "Full_Backup"), self.write)
                    self.write("✅ خلصت النسخة الكاملة")
            else:
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
        self.target_label = tk.StringVar(value="المجلد في الجوال:")
        ttk.Label(row, textvariable=self.target_label).pack(side="right", padx=6)
        self.target = tk.StringVar(value="Download")
        self.target_box = ttk.Combobox(row, textvariable=self.target, width=18,
                                       values=BACKUP_FOLDERS)
        self.target_box.pack(side="right")
        self.transfer_hint = tk.StringVar()
        ttk.Label(f, textvariable=self.transfer_hint, wraplength=640, justify="right",
                  foreground="#5b6478").pack(anchor="e")
        btns = ttk.Frame(f)
        btns.pack(pady=10)
        ttk.Button(btns, text="📄 اختر ملفات", style="Big.TButton",
                   command=self.push_files).pack(side="right", padx=8)
        ttk.Button(btns, text="📁 اختر مجلد", style="Big.TButton",
                   command=self.push_folder).pack(side="right", padx=8)

    def _push(self, paths):
        kind, serial = self.kind, self.serial

        if kind == "ios":
            bundle = self.ios_apps.get(self.target.get())
            if not bundle:
                messagebox.showinfo("تنبيه", "اختر تطبيق من القائمة. (مثلاً ثبّت VLC أو Documents "
                                             "في الآيفون عشان تقدر تنقل له ملفات)")
                return

            def job():
                self.need_device()
                ios_device.push(serial, bundle, paths, self.write)
                self.write(f"🎉 تم نقل {len(paths)} عنصر. افتح تطبيق (الملفات) في الآيفون.")
                self.after(0, lambda: messagebox.showinfo("تم", "تم النقل للآيفون ✅"))
            self.run_bg(job)
            return

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
