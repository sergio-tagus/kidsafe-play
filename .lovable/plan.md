# Número de versión automático en cada build de GitHub

## Qué cambia
En `android/app/build.gradle`, la línea fija `versionCode 2` pasa a leer la variable `GITHUB_RUN_NUMBER`:

```text
versionCode (System.getenv("GITHUB_RUN_NUMBER") ?: "2").toInteger()
```

- En GitHub Actions, cada build usa el número de ejecución (1, 2, 3…), que siempre sube, así que Play Console acepta cada nuevo .aab.
- En local (Android Studio), si la variable no existe, se usa 2 como hasta ahora.
- `versionName "1.1.0"` no cambia.

## Nota
Play Console exige que cada versionCode sea mayor que el último subido. Las dos primeras ejecuciones de GitHub darán 1 y 2. Si ya subiste un .aab con versionCode 2, esos números serán rechazados hasta que la numeración pase de 2. Si eso ocurre, se puede sumar un margen (por ejemplo, número de ejecución + 10). Avísame si lo quieres así.
