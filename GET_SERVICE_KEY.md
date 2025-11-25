# 🔑 Cómo obtener la Service Role Key de Supabase

## 📋 **Pasos rápidos:**

### 1. **Ir al Dashboard de Supabase**
- Ve a: https://supabase.com/dashboard/project/trijkprvoeqkrsvztkpo
- Inicia sesión si no lo has hecho

### 2. **Ir a Settings → API**
- En el menú lateral, haz clic en **"Settings"**
- Luego haz clic en **"API"**

### 3. **Copiar la Service Role Key**
- Busca la sección **"Project API keys"**
- Encontrarás dos keys:
  - ✅ **anon public** (ya la tienes)
  - 🔑 **service_role** ← **ESTA ES LA QUE NECESITAS**

### 4. **Copiar la key completa**
- Haz clic en el ícono de **"Copy"** junto a **service_role**
- Se ve algo así: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyaWprcHJ2b2Vxa3Jzdnp0a3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjQ5NzQzMywiZXhwIjoyMDQ4MDczNDMzfQ.TEXTO_MUY_LARGO_AQUI`

### 5. **Crear archivo .env**
En la carpeta `backend`, crea un archivo llamado `.env` (sin .example) con:

```
SUPABASE_URL=https://trijkprvoeqkrsvztkpo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyaWprcHJ2b2Vxa3Jzdnp0a3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0OTc0MzMsImV4cCI6MjA0ODA3MzQzM30.ssDMdKXsPmHDWIDPKBYZKg_31svfsKG-wqOhCdCJsWo
SUPABASE_SERVICE_ROLE_KEY=PEGA_AQUI_LA_SERVICE_ROLE_KEY_QUE_COPIASTE
SUPABASE_BUCKET_NAME=midrive-files
```

### 6. **Reiniciar el servidor**
```bash
# Ctrl+C para parar el servidor
npm start
```

## ✅ **Resultado esperado:**
```
🪣 Verificando bucket...
🆕 Creando bucket...
✅ Bucket creado exitosamente
```

## 🚨 **IMPORTANTE:**
- ⚠️ **NUNCA** compartas la service_role key públicamente
- ⚠️ **NO** la subas a GitHub
- ⚠️ Solo úsala en el servidor backend

¡Con esto debería funcionar perfectamente! 🎉
