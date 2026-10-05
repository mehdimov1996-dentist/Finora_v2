# Finora — راهنمای ساخت APK

APK داخل محیط من ساخته نشد (Android SDK و اینترنت در دسترس نبود)، ولی پروژه کاملاً آماده‌ی ساخته شدن است. یکی از راه‌های زیر را انتخاب کنید.

## راه ۱: ساخت خودکار در GitHub (بدون نصب هیچ چیز)
1. یک مخزن (repository) جدید در GitHub بسازید و محتوای همین پوشه را در آن آپلود کنید.
2. به تب **Actions** بروید ← workflow به نام **Build Android APK** ← **Run workflow**.
3. بعد از ~۵ دقیقه، در پایین صفحه‌ی اجرا، فایل **finora-apk** را دانلود کنید. داخلش `app-debug.apk` است.
4. APK را روی گوشی نصب کنید (اجازه‌ی «نصب از منبع ناشناس» را بدهید).

## راه ۲: ساخت روی کامپیوتر خودتان
نیازمندی‌ها: Node.js 22+، JDK 21، Android Studio (برای Android SDK).

```bash
npm install
npx cap add android
npm run icons        # ساخت آیکن (اختیاری)
npx cap sync android
cd android && ./gradlew assembleDebug   # ویندوز: gradlew.bat assembleDebug
```
خروجی: `android/app/build/outputs/apk/debug/app-debug.apk`
یا با `npx cap open android` پروژه را در Android Studio باز کنید.

## راه ۳: بدون APK (PWA)
پوشه‌ی `www` را روی یک هاستینگ HTTPS قرار دهید، در Chrome گوشی باز کنید و «Add to Home screen» را بزنید.

## نکته‌ها
- اطلاعات داخل حافظه‌ی همان برنامه ذخیره می‌شود. قبل از حذف برنامه، از **تنظیمات ← دانلود Backup** فایل پشتیبان بگیرید.
- APK بالا از نوع debug است و برای استفاده‌ی شخصی کافی است. برای انتشار در مارکت‌ها باید نسخه‌ی release با کلید امضای خودتان بسازید.
