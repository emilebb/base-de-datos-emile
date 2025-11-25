# 🔧 Configuración Manual de Supabase

Si sigues teniendo problemas con "signature verification failed", sigue estos pasos:

## 📋 **Pasos en el Dashboard de Supabase**

### 1. **Ir al Dashboard**
1. Ve a: https://supabase.com/dashboard
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto: `trijkprvoeqkrsvztkpo`

### 2. **Crear el Bucket de Storage**
1. En el menú lateral, haz clic en **"Storage"**
2. Haz clic en **"Create a new bucket"**
3. Configuración:
   - **Name**: `midrive-files`
   - **Public bucket**: ✅ **SÍ** (muy importante)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: Dejar vacío (todos los tipos)

### 3. **Configurar Políticas de Acceso**
1. Ve a **Storage** → **Policies**
2. Para el bucket `midrive-files`, crea estas políticas:

#### **Política de INSERT (Subir archivos)**
```sql
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'midrive-files');
```

#### **Política de SELECT (Ver archivos)**
```sql
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'midrive-files');
```

#### **Política de DELETE (Borrar archivos)**
```sql
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'midrive-files');
```

### 4. **Verificar Configuración**
1. Ve a **Settings** → **API**
2. Confirma que tienes:
   - **URL**: `https://trijkprvoeqkrsvztkpo.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 🚀 **Alternativa Rápida**

Si no quieres hacer la configuración manual, reinicia el backend:

```bash
# En la terminal, presiona Ctrl+C para parar el servidor
# Luego ejecuta:
npm start
```

El backend ahora creará automáticamente el bucket con las configuraciones correctas.

## ✅ **Verificar que Funciona**

1. **Reinicia el backend**: `npm start`
2. **Abre el frontend** en el navegador
3. **Prueba subir un archivo pequeño** (imagen o documento)
4. **Verifica** que aparezca en la lista

## 🆘 **Si Sigue Fallando**

El problema puede ser que necesites permisos de administrador en Supabase. En ese caso:

1. **Usa las credenciales de service_role** (más permisos)
2. **O configura manualmente** desde el dashboard

¡El sistema debería funcionar después de estos pasos! 🎉
