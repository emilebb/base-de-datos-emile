# 🚀 Guía de Despliegue en Render.com

## 📋 Pasos para subir MiDrive a Render.com GRATIS

### 1. **Preparar Cloudinary (Almacenamiento en la nube)**
1. Ve a https://cloudinary.com
2. Crea una cuenta **GRATUITA**
3. En el Dashboard, copia:
   - **Cloud Name**
   - **API Key** 
   - **API Secret**

### 2. **Subir código a GitHub**
1. Crea un repositorio en GitHub
2. Sube toda la carpeta `MiDrive` (frontend + backend)
3. Asegúrate de que el archivo `.env` NO se suba (está en .gitignore)

### 3. **Crear cuenta en Render.com**
1. Ve a https://render.com
2. Crea una cuenta **GRATUITA**
3. Conecta tu cuenta de GitHub

### 4. **Desplegar el Backend**
1. En Render, haz clic en **"New +"** → **"Web Service"**
2. Conecta tu repositorio de GitHub
3. Configuración:
   - **Name**: `midrive-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free** (0$/mes)

### 5. **Configurar Variables de Entorno**
En la sección **Environment** de Render, agrega:
```
CLOUDINARY_CLOUD_NAME = tu_cloud_name_de_cloudinary
CLOUDINARY_API_KEY = tu_api_key_de_cloudinary  
CLOUDINARY_API_SECRET = tu_api_secret_de_cloudinary
```

### 6. **Actualizar Frontend**
Una vez desplegado, Render te dará una URL como:
`https://midrive-backend-xxxx.onrender.com`

Actualiza el archivo `frontend/script.js`:
```javascript
// Cambiar esta línea:
const API_BASE_URL = 'http://localhost:3000';

// Por esta (con tu URL de Render):
const API_BASE_URL = 'https://midrive-backend-xxxx.onrender.com';
```

### 7. **Desplegar Frontend (Opcional)**
Para el frontend puedes usar:
- **GitHub Pages** (gratis)
- **Netlify** (gratis)
- **Vercel** (gratis)

O simplemente abrir `index.html` en tu navegador.

## ✅ **Resultado Final**
- ✅ Backend funcionando 24/7 en Render.com
- ✅ Archivos guardados en Cloudinary (nube)
- ✅ Frontend conectado al backend
- ✅ **TODO GRATIS** 🎉

## 🔧 **Comandos útiles**

### Probar localmente:
```bash
cd backend
npm install
npm start
```

### Ver logs en Render:
Ve a tu servicio → **Logs** para ver errores

## 📞 **Soporte**
Si algo no funciona:
1. Revisa los logs en Render
2. Verifica las variables de entorno
3. Confirma que Cloudinary esté configurado

## 🎯 **URLs importantes**
- Cloudinary: https://cloudinary.com/console
- Render: https://dashboard.render.com
- Tu backend: https://midrive-backend-xxxx.onrender.com
