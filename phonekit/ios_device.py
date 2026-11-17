"""دعم الآيفون عن طريق مكتبة pymobiledevice3.

يحتاج على ويندوز: تطبيق Apple Devices أو iTunes مثبت (عشان تعريفات USB).
"""
import asyncio
import os

try:
    from pymobiledevice3.lockdown import create_using_usbmux
    from pymobiledevice3.usbmux import list_devices
    from pymobiledevice3.services.afc import AfcService
    from pymobiledevice3.services.house_arrest import HouseArrestService
    from pymobiledevice3.services.installation_proxy import InstallationProxyService
    from pymobiledevice3.services.mobilebackup2 import Mobilebackup2Service
    AVAILABLE = True
except ImportError:
    AVAILABLE = False


def _run(coro):
    return asyncio.run(coro)


def _human(n):
    n = float(n or 0)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}PB"


def detect():
    """يرجع (udid, None) إذا فيه آيفون متصل، أو (None, رسالة)."""
    if not AVAILABLE:
        return None, None

    async def go():
        devs = await list_devices()
        usb = [d for d in devs if getattr(d, "connection_type", "USB") == "USB"] or devs
        return usb[0].serial if usb else None
    try:
        serial = _run(go())
    except Exception:  # usbmuxd غير موجود (iTunes / Apple Devices مو مثبت)
        return None, None
    return (serial, None) if serial else (None, None)


async def _lockdown(serial):
    return await create_using_usbmux(serial=serial, pair_timeout=60)


def info(serial):
    async def go():
        async with await _lockdown(serial) as ld:
            vals = await ld.get_value()
            try:
                bat = await ld.get_value("com.apple.mobile.battery") or {}
            except Exception:
                bat = {}
            try:
                disk = await ld.get_value("com.apple.disk_usage") or {}
            except Exception:
                disk = {}
            total = disk.get("TotalDiskCapacity") or disk.get("TotalDataCapacity")
            free = disk.get("AmountDataAvailable")
            storage = "?"
            if total and free is not None:
                storage = f"مستخدم {_human(total - free)} من {_human(total)} (متبقي {_human(free)})"
            level = bat.get("BatteryCurrentCapacity")
            charging = bat.get("BatteryIsCharging")
            return {
                "الشركة": "Apple",
                "الموديل": f"{vals.get('DeviceName', '')} ({vals.get('ProductType', '')})",
                "إصدار أندرويد": "iOS " + str(vals.get("ProductVersion", "")),
                "الرقم التسلسلي": vals.get("SerialNumber", serial),
                "البطارية": f"{level}%" if level is not None else "?",
                "حالة الشحن": ("يشحن ⚡" if charging else "لا يشحن") if charging is not None else "?",
                "المساحة الداخلية": storage,
                "_name": vals.get("DeviceName", "iPhone"),
            }
    return _run(go())


def backup_photos(serial, dest, log):
    """ينسخ الصور والفيديوهات (مجلد الكاميرا DCIM) إلى الكمبيوتر."""
    async def go():
        async with await _lockdown(serial) as ld:
            async with AfcService(ld) as afc:
                count = 0

                def cb(src, *_):
                    nonlocal count
                    count += 1
                    if count % 25 == 0:
                        log(f"   ... {count} ملف")
                await afc.pull("/DCIM", dest, callback=cb, ignore_errors=True, progress_bar=False)
                return count
    return _run(go())


def full_backup(serial, dest, log):
    """نسخة احتياطية كاملة للآيفون (نفس نسخة iTunes / Finder)."""
    async def go():
        async with await _lockdown(serial) as ld:
            async with Mobilebackup2Service(ld) as bk:
                last = [-10]

                def progress(p):
                    if p - last[0] >= 5:
                        last[0] = p
                        log(f"   ... {p:.0f}%")
                await bk.backup(full=True, backup_directory=dest, progress_callback=progress)
    _run(go())


def file_sharing_apps(serial):
    """التطبيقات اللي تقبل ملفات (تطلع في تطبيق الملفات: على الآيفون)."""
    async def go():
        async with await _lockdown(serial) as ld:
            async with InstallationProxyService(ld) as ip:
                apps = await ip.get_apps(application_type="User")
        out = {}
        for bid, a in apps.items():
            if a.get("UIFileSharingEnabled"):
                name = a.get("CFBundleDisplayName") or a.get("CFBundleName") or bid
                out[f"{name}  ({bid})"] = bid
        return dict(sorted(out.items()))
    return _run(go())


def push(serial, bundle_id, paths, log):
    async def go():
        async with await _lockdown(serial) as ld:
            async with await HouseArrestService.create(ld, bundle_id, documents_only=True) as ha:
                for p in paths:
                    log(f"⏳ جاري نقل {os.path.basename(p)} ...")
                    await ha.push(p, "/Documents", progress_bar=False)
                    log("✅ تم")
    _run(go())
