// Cargar variables de entorno PRIMERO
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIGURACIÓN DE SUPABASE =====
const supabaseUrl = process.env.SUPABASE_URL || 'https://trijkprvoeqkrsvztkpo.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyaWprcHJ2b2Vxa3Jzdnp0a3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0OTc0MzMsImV4cCI6MjA0ODA3MzQzM30.ssDMdKXsPmHDWIDPKBYZKg_31svfsKG-wqOhCdCJsWo';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'NECESITAS_OBTENER_ESTA_KEY';
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'midrive-files';

// Debug: Verificar que las variables se cargaron correctamente
console.log('🔑 Verificando credenciales:');
console.log('📍 URL:', supabaseUrl);
console.log('🔓 Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NO ENCONTRADA');
console.log('🔐 Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'NO ENCONTRADA');
console.log('🪣 Bucket:', bucketName);

// Cliente público (para operaciones normales)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (para operaciones administrativas como crear buckets)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ===== INICIALIZAR BUCKET =====
async function initializeBucket() {
    try {
        console.log('🪣 Verificando bucket...');
        
        // Verificar si el bucket existe usando cliente admin
        const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
        
        if (listError) {
            console.error('❌ Error al listar buckets:', listError);
            console.log('💡 Tip: Verifica que tengas la service_role key correcta');
            return;
        }
        
        const bucketExists = buckets.find(bucket => bucket.name === bucketName);
        
        if (!bucketExists) {
            console.log('🆕 Creando bucket...');
            
            // Crear bucket público usando cliente admin
            const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
                public: true,
                allowedMimeTypes: null,
                fileSizeLimit: 10485760 // 10MB
            });
            
            if (error) {
                console.error('❌ Error al crear bucket:', error);
                console.log('💡 Tip: Asegúrate de tener la service_role key en las variables de entorno');
            } else {
                console.log('✅ Bucket creado exitosamente');
            }
        } else {
            console.log('✅ Bucket ya existe');
            
            // Verificar si el bucket es público
            console.log('🔍 Verificando configuración del bucket...');
            const { data: bucketInfo } = await supabaseAdmin.storage.getBucket(bucketName);
            if (bucketInfo && !bucketInfo.public) {
                console.log('🔧 Configurando bucket como público...');
                const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucketName, {
                    public: true
                });
                if (updateError) {
                    console.error('❌ Error al actualizar bucket:', updateError);
                } else {
                    console.log('✅ Bucket configurado como público');
                }
            } else {
                console.log('✅ Bucket ya es público');
            }
        }
    } catch (error) {
        console.error('❌ Error en inicialización del bucket:', error);
        console.log('💡 Tip: Revisa las credenciales de Supabase');
    }
}

// ===== CONFIGURACIÓN DE MULTER (para recibir archivos) =====
const storage = multer.memoryStorage(); // Guardar en memoria temporalmente
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
    },
    fileFilter: (req, file, cb) => {
        // Permitir todos los tipos de archivo por ahora
        cb(null, true);
    }
});

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ===== RUTAS BÁSICAS =====
app.get('/api/status', async (req, res) => {
    try {
        // Probar conexión con Supabase
        const { data, error } = await supabase.storage.listBuckets();
        
        res.json({
            message: 'MiDrive Backend funcionando correctamente',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            supabase: {
                connected: !error,
                url: supabaseUrl,
                bucket: bucketName,
                buckets_available: data ? data.length : 0
            }
        });
    } catch (error) {
        res.json({
            message: 'MiDrive Backend funcionando (Supabase no conectado)',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            supabase: {
                connected: false,
                error: error.message
            }
        });
    }
});

app.get('/api/info', (req, res) => {
    res.json({
        name: 'MiDrive API',
        description: 'Backend para almacenamiento en la nube',
        version: '2.0.0',
        endpoints: [
            'GET /api/status - Estado del servidor',
            'GET /api/info - Información del API',
            'POST /api/upload - Subir archivos a la nube',
            'GET /api/files - Listar archivos guardados',
            'GET /api/download/:filename - Descargar archivo'
        ],
        features: [
            'Subida de archivos a Supabase Storage',
            'Almacenamiento en la nube',
            'Lista de archivos',
            'Descarga de archivos',
            'Validación de archivos'
        ]
    });
});

// ===== SUBIR ARCHIVOS A LA NUBE =====
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('📤 Recibiendo archivo para subir...');
        
        if (!req.file) {
            return res.status(400).json({
                error: 'No se recibió ningún archivo',
                message: 'Debe enviar un archivo en el campo "file"'
            });
        }

        const file = req.file;
        console.log(`📄 Archivo recibido: ${file.originalname} (${file.size} bytes)`);

        // Obtener el UID del usuario desde el header de autorización
        const authHeader = req.headers.authorization;
        let userUID = 'public'; // Fallback para usuarios no autenticados
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                // Verificar el token con Supabase
                const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
                if (user && !error) {
                    userUID = user.id;
                    console.log(`👤 Usuario autenticado: ${user.email} (${userUID})`);
                } else {
                    console.log('⚠️ Token inválido, usando carpeta pública');
                }
            } catch (error) {
                console.log('⚠️ Error al verificar token, usando carpeta pública');
            }
        }

        // Crear nombre único para el archivo en la carpeta del usuario
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.originalname}`;
        const filePath = `users/${userUID}/${fileName}`;

        console.log('☁️ Subiendo a Supabase Storage...');

        // Subir archivo a Supabase Storage usando cliente admin
        const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true // Permitir sobrescribir si existe
            });

        if (error) {
            console.error('❌ Error en Supabase:', error);
            console.error('❌ Detalles del error:', {
                message: error.message,
                statusCode: error.statusCode,
                error: error.error
            });
            
            // Si el bucket no existe, intentar crearlo
            if (error.message.includes('Bucket not found') || error.message.includes('signature verification failed')) {
                console.log('🔄 Intentando crear bucket...');
                await initializeBucket();
                
                // Reintentar la subida con cliente admin
                const { data: retryData, error: retryError } = await supabaseAdmin.storage
                    .from(bucketName)
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: true
                    });
                
                if (retryError) {
                    throw retryError;
                } else {
                    console.log('✅ Subida exitosa en segundo intento');
                }
            } else {
                throw error;
            }
        }

        console.log('✅ Subida exitosa a Supabase Storage');

        // Obtener URL pública del archivo
        const { data: publicUrlData } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        // Respuesta exitosa
        res.json({
            message: 'Archivo subido exitosamente a la nube',
            file: {
                name: file.originalname,
                size: file.size,
                type: file.mimetype,
                url: publicUrlData.publicUrl,
                path: filePath,
                uploaded_at: new Date().toISOString()
            },
            supabase: {
                bucket: bucketName,
                path: data.path,
                fullPath: data.fullPath
            }
        });

        console.log(`✅ Archivo ${file.originalname} subido exitosamente`);

    } catch (error) {
        console.error('❌ Error al subir archivo:', error);
        res.status(500).json({
            error: 'Error al subir archivo a la nube',
            message: error.message,
            details: 'Verifica la configuración de Supabase'
        });
    }
});

// ===== LISTAR ARCHIVOS GUARDADOS =====
app.get('/api/files', async (req, res) => {
    try {
        console.log('📂 Listando archivos de la nube...');

        // Obtener el UID del usuario desde el header de autorización
        const authHeader = req.headers.authorization;
        let userUID = 'public'; // Fallback para usuarios no autenticados
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                // Verificar el token con Supabase
                const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
                if (user && !error) {
                    userUID = user.id;
                    console.log(`👤 Listando archivos para: ${user.email} (${userUID})`);
                } else {
                    console.log('⚠️ Token inválido, listando carpeta pública');
                }
            } catch (error) {
                console.log('⚠️ Error al verificar token, listando carpeta pública');
            }
        }

        // Listar archivos en la carpeta del usuario
        const userFolder = `users/${userUID}`;
        const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .list(userFolder, {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) {
            console.error('❌ Error al listar archivos:', error);
            throw error;
        }

        const files = data.map(file => {
            // Obtener URL pública
            const { data: publicUrlData } = supabaseAdmin.storage
                .from(bucketName)
                .getPublicUrl(`midrive/${file.name}`);

            // Extraer nombre original (remover timestamp)
            const originalName = file.name.replace(/^\d+_/, '');

            return {
                name: originalName,
                size: formatFileSize(file.metadata?.size || 0),
                type: file.metadata?.mimetype || 'unknown',
                url: publicUrlData.publicUrl,
                path: `midrive/${file.name}`,
                uploaded_at: file.created_at
            };
        });

        res.json({
            message: 'Lista de archivos obtenida exitosamente',
            count: files.length,
            files: files
        });

        console.log(`📂 ${files.length} archivo(s) encontrado(s)`);

    } catch (error) {
        console.error('❌ Error al listar archivos:', error);
        res.status(500).json({
            error: 'Error al obtener lista de archivos',
            message: error.message,
            files: []
        });
    }
});

// ===== DESCARGAR ARCHIVO =====
app.get('/api/download/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        console.log(`⬇️ Solicitando descarga: ${filename}`);

        // Listar archivos para encontrar el que coincida usando cliente admin
        const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .list('midrive');

        if (error) {
            throw error;
        }

        // Buscar archivo por nombre original
        const file = data.find(f => {
            const originalName = f.name.replace(/^\d+_/, '');
            return originalName === filename;
        });

        if (!file) {
            return res.status(404).json({
                error: 'Archivo no encontrado',
                message: `No se encontró el archivo: ${filename}`
            });
        }

        // Obtener URL pública del archivo
        const { data: publicUrlData } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(`midrive/${file.name}`);
        
        // Redirigir a la URL de Supabase
        res.redirect(publicUrlData.publicUrl);
        
        console.log(`✅ Descarga iniciada: ${filename}`);

    } catch (error) {
        console.error('❌ Error al descargar archivo:', error);
        res.status(500).json({
            error: 'Error al descargar archivo',
            message: error.message
        });
    }
});

// ===== UTILIDADES =====
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== RUTA DE BIENVENIDA =====
app.get('/', (req, res) => {
    res.json({
        message: '☁️ ¡Bienvenido a MiDrive Backend!',
        version: '2.0.0',
        description: 'Almacenamiento en la nube con Supabase Storage',
        frontend: 'Abre el archivo frontend/index.html en tu navegador',
        endpoints: {
            status: '/api/status',
            info: '/api/info',
            upload: 'POST /api/upload',
            files: '/api/files',
            download: '/api/download/:filename'
        }
    });
});

// ===== MANEJO DE ERRORES =====
app.use((err, req, res, next) => {
    console.error('💥 Error del servidor:', err.stack);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        message: `La ruta ${req.originalUrl} no existe`,
        available_endpoints: ['/api/status', '/api/info', '/api/upload', '/api/files']
    });
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, async () => {
    console.log('🚀 ===== MIDRIVE BACKEND INICIADO =====');
    console.log(`🌐 Servidor: http://localhost:${PORT}`);
    console.log(`📊 API Info: http://localhost:${PORT}/api/info`);
    console.log(`📁 Frontend: file:///${path.resolve('../frontend/index.html')}`);
    console.log('☁️ Almacenamiento: Supabase Storage');
    console.log('🎯 Listo para Render.com');
    console.log('==========================================');
    
    // Inicializar bucket
    await initializeBucket();
});
