# Generate signed apk
Instalar cordova y luego:

```
cordova platform add android
cordova build android --release -- --keystore "..." --alias ... --storePassword ... --password ...
```

Arrancar un emulador:
```
./emulator -avd 3.2_QVGA_ADP2_API_22
```
Ejecutar:
```
cordova emulate android
```