# Aqilli Studio

YouTube videolarini avtomatlashtirish dasturi: Comparison, Monster, Countries VS, Quiz, Asl nusxani top, Stikman.

## Tuzilishi
- `index.html`, `css/`, `js/` — dastur (oddiy ES-modullar, bundler yo'q)
- `modules/` — bo'limlar: har biri `manifest.json` + `prompt.txt`. Yangi bo'lim shu yerga qo'shiladi
- `android/` — Capacitor orqali Android loyiha
- `tools/` — yig'ish va mahalliy server

## Kompyuterda ko'rish
    npm install
    npm run serve        # http://localhost:8080
    npm test

## Android APK (GitHub Actions orqali)
1. GitHub'da yangi repo oching va shu papkani yuklang (`git push`).
2. Repo → **Actions** → **Android APK** → avtomatik ishlaydi (yoki *Run workflow*).
3. Tugagach (5–10 daqiqa) pastdagi **Artifacts** bo'limidan `aqilli-studio-apk` ni yuklab oling, ichidan `app-debug.apk`.
4. Telefonga o'rnating ("noma'lum manbalardan o'rnatish"ga ruxsat bering).

Kompyuterda o'zingiz qurmoqchi bo'lsangiz: Node 22, Java 21, Android SDK (API 36) kerak:

    npm install
    npm run android:sync
    cd android && ./gradlew assembleDebug

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Yangilanishlar (APK ni qayta tarqatmasdan)
Bo'lim va promptlar `modules/` ichida. Ularni o'z serveringizga (GitHub Pages ham bo'ladi) joylang:
`modules/index.json` + har bir `<id>.json`. Dasturda **Sozlamalar → Yangilanish manzili** ga `index.json` havolasini yozing — yangi bo'lim va promptlar o'rnatiladi. Faqat dastur kodi (js/css) o'zgarsa, yangi APK kerak bo'ladi.

## Hozircha yo'q
- Rasm yuklash va videoni yig'ish bosqichi
- Kalit tekshiruvchi server (pullik tarif)
- Windows o'rnatuvchisi (Electron/Tauri)

## Windows (.exe)
Repo GitHub'ga yuklangach **Actions → Windows EXE** ishlaydi. Tugagach **Artifacts** dan `aqilli-studio-windows` ni yuklab oling: ichida `Aqilli-Studio-1.0.0.exe` (o'rnatish shart emas, bosib ishga tushadi).
Mahalliy qurish (Windows'da): `npm install` va `npm run win:build`.
