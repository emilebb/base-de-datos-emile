// ===== VARIABLES GLOBALES =====
let selectedFiles = [];
let currentUser = null;
let currentPath = ''; // Ruta actual del explorador (ej: 'Documentos/Trabajo')
let folderHistory = []; // Historial de navegación
const API_BASE_URL = 'http://localhost:3000';

// ===== CONFIGURACIÓN DE SUPABASE =====
const SUPABASE_URL = 'https://trijkprvoeqkrsvztkpo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyaWprcHJ2b2Vxa3Jzdnp0a3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTkwMzAsImV4cCI6MjA3OTU5NTAzMH0.0JN_V9xg1c7KVNRxMxBgOvsgOr2VhDP30Qx-rKxYHh0';

// Inicializar Supabase
console.log('🔑 Inicializando Supabase con:');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔓 Anon Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Verificar conexión inicial
supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
        console.error('❌ Error de conexión inicial:', error);
    } else {
        console.log('✅ Conexión inicial exitosa');
    }
});

// ===== SISTEMA DE AUTENTICACIÓN =====

// Verificar si hay usuario logueado al cargar la página
async function verificarSesion() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error al verificar sesión:', error);
            return;
        }

        if (session && session.user) {
            currentUser = session.user;
            mostrarAplicacion();
        } else {
            mostrarAutenticacion();
        }
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        mostrarAutenticacion();
    }
}

// Mostrar pantalla de autenticación
function mostrarAutenticacion() {
    document.getElementById('authScreen').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
}

// Mostrar aplicación principal
function mostrarAplicacion() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    if (currentUser) {
        document.getElementById('userEmail').textContent = currentUser.email;
        // Inicializar explorador
        currentPath = '';
        folderHistory = [];
        actualizarBreadcrumb();
        actualizarTituloCarpeta();
        actualizarBotonAtras();
        cargarArchivos(); // Cargar archivos del usuario
    }
}

// Alternar entre formularios de login y registro
function mostrarRegistro() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function mostrarLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

// Registrar nuevo usuario
async function registrarUsuario(event) {
    event.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        mostrarMensaje('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (password.length < 6) {
        mostrarMensaje('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        mostrarMensaje('Creando cuenta...', 'info');
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        if (data.user) {
            mostrarMensaje('¡Cuenta creada exitosamente! Revisa tu email para confirmar tu cuenta.', 'success');
            mostrarLogin();
        }
    } catch (error) {
        console.error('Error al registrar:', error);
        mostrarMensaje(`Error al crear cuenta: ${error.message}`, 'error');
    }
}

// Iniciar sesión
async function iniciarSesion(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        mostrarMensaje('Iniciando sesión...', 'info');
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        if (data.user) {
            currentUser = data.user;
            mostrarMensaje('¡Sesión iniciada exitosamente!', 'success');
            setTimeout(() => {
                mostrarAplicacion();
            }, 1000);
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        mostrarMensaje(`Error al iniciar sesión: ${error.message}`, 'error');
    }
}

// Cerrar sesión
async function cerrarSesion() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            throw error;
        }
        
        currentUser = null;
        selectedFiles = [];
        mostrarAutenticacion();
        mostrarMensaje('Sesión cerrada exitosamente', 'success');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        mostrarMensaje(`Error al cerrar sesión: ${error.message}`, 'error');
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 MiDrive Frontend iniciado');
    verificarSesion(); // Verificar si hay usuario logueado
    setupDragAndDrop();
    setupEventListeners();
});

// ===== CONFIGURAR EVENT LISTENERS =====
function setupEventListeners() {
    // Event listener para selección de archivos
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        handleFileSelection(files);
    });
}

// ===== CONFIGURAR DRAG AND DROP =====
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        handleFileSelection(files);
    });
}

// ===== MANEJAR SELECCIÓN DE ARCHIVOS =====
function handleFileSelection(files) {
    selectedFiles = files;
    mostrarArchivosSeleccionados();
    document.getElementById('uploadBtn').disabled = files.length === 0;
    
    console.log(`📁 ${files.length} archivo(s) seleccionado(s)`);
}

function mostrarArchivosSeleccionados() {
    const container = document.getElementById('selectedFiles');
    
    if (selectedFiles.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = '<h4>Archivos seleccionados:</h4>';
    selectedFiles.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        fileDiv.innerHTML = `
            <span class="file-name">📄 ${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
        `;
        container.appendChild(fileDiv);
    });
}

// ===== UTILIDADES =====
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function mostrarMensaje(texto, tipo = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = texto;
    messageDiv.className = `message ${tipo}`;
    messageDiv.style.display = 'block';
    
    console.log(`💬 ${tipo.toUpperCase()}: ${texto}`);
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

function elegirArchivos() {
    document.getElementById('fileInput').click();
}

// ===== FUNCIONES AUXILIARES =====

// Obtener token de autenticación (mantenido para posibles usos futuros)
async function obtenerToken() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    } catch (error) {
        console.error('Error obteniendo token:', error);
        return null;
    }
}

// Obtener ruta completa del usuario
function obtenerRutaCompleta(path = currentPath) {
    if (!currentUser) return '';
    const userFolder = `users/${currentUser.id}`;
    return path ? `${userFolder}/${path}` : userFolder;
}

// ===== SISTEMA DE NAVEGACIÓN DE CARPETAS =====

// Navegar a una carpeta específica
function navegarACarpeta(path) {
    if (path !== currentPath) {
        folderHistory.push(currentPath);
    }
    
    currentPath = path;
    actualizarBreadcrumb();
    actualizarTituloCarpeta();
    actualizarBotonAtras();
    cargarArchivos();
    
    console.log(`📁 Navegando a: ${path || 'Inicio'}`);
}

// Navegar hacia atrás
function navegarAtras() {
    if (folderHistory.length > 0) {
        const previousPath = folderHistory.pop();
        currentPath = previousPath;
        actualizarBreadcrumb();
        actualizarTituloCarpeta();
        actualizarBotonAtras();
        cargarArchivos();
        
        console.log(`⬅️ Navegando atrás a: ${previousPath || 'Inicio'}`);
    }
}

// Actualizar breadcrumb
function actualizarBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '';
    
    // Botón de inicio
    const homeItem = document.createElement('span');
    homeItem.className = currentPath === '' ? 'breadcrumb-item active' : 'breadcrumb-item';
    homeItem.textContent = '🏠 Inicio';
    homeItem.onclick = () => navegarACarpeta('');
    breadcrumb.appendChild(homeItem);
    
    // Carpetas en la ruta
    if (currentPath) {
        const folders = currentPath.split('/');
        let buildPath = '';
        
        folders.forEach((folder, index) => {
            buildPath += (buildPath ? '/' : '') + folder;
            const isLast = index === folders.length - 1;
            
            const folderItem = document.createElement('span');
            folderItem.className = isLast ? 'breadcrumb-item active' : 'breadcrumb-item';
            folderItem.textContent = `📁 ${folder}`;
            
            if (!isLast) {
                const pathToNavigate = buildPath;
                folderItem.onclick = () => navegarACarpeta(pathToNavigate);
            }
            
            breadcrumb.appendChild(folderItem);
        });
    }
}

// Actualizar título de carpeta actual
function actualizarTituloCarpeta() {
    const title = document.getElementById('currentFolderTitle');
    if (currentPath === '') {
        title.textContent = '📂 Mis Archivos';
    } else {
        const folderName = currentPath.split('/').pop();
        title.textContent = `📁 ${folderName}`;
    }
}

// Actualizar estado del botón atrás
function actualizarBotonAtras() {
    const backBtn = document.getElementById('backBtn');
    backBtn.disabled = folderHistory.length === 0;
}

// ===== GESTIÓN DE CARPETAS =====

// Mostrar modal para crear carpeta
function mostrarCrearCarpeta() {
    document.getElementById('createFolderModal').style.display = 'flex';
    document.getElementById('folderName').focus();
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('createFolderModal').style.display = 'none';
    document.getElementById('folderName').value = '';
}

// Crear nueva carpeta
async function crearCarpeta(event) {
    event.preventDefault();
    
    const folderName = document.getElementById('folderName').value.trim();
    
    if (!folderName) {
        mostrarMensaje('❌ El nombre de la carpeta no puede estar vacío', 'error');
        return;
    }
    
    if (!currentUser) {
        mostrarMensaje('❌ Debes iniciar sesión para crear carpetas', 'error');
        return;
    }
    
    try {
        mostrarMensaje(`📁 Creando carpeta: ${folderName}`, 'info');
        
        // Crear archivo .folder para representar la carpeta en Supabase Storage
        const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        const fullPath = obtenerRutaCompleta(folderPath);
        const folderMarkerPath = `${fullPath}/.folder`;
        
        // Crear un archivo marcador para la carpeta
        const folderData = new Blob([JSON.stringify({
            name: folderName,
            created: new Date().toISOString(),
            type: 'folder'
        })], { type: 'application/json' });
        
        const { data, error } = await supabase.storage
            .from('midrive-files')
            .upload(folderMarkerPath, folderData, {
                contentType: 'application/json',
                upsert: false
            });
        
        if (error) {
            if (error.message.includes('already exists')) {
                throw new Error(`La carpeta "${folderName}" ya existe`);
            }
            throw new Error(`Error al crear carpeta: ${error.message}`);
        }
        
        console.log(`✅ Carpeta creada: ${folderName}`);
        mostrarMensaje(`✅ Carpeta "${folderName}" creada exitosamente`, 'success');
        
        cerrarModal();
        cargarArchivos();
        
    } catch (error) {
        mostrarMensaje(`❌ Error: ${error.message}`, 'error');
        console.error('🔴 Error al crear carpeta:', error);
    }
}

// Renombrar carpeta
async function renombrarCarpeta(oldPath, oldName) {
    const newName = prompt(`Renombrar carpeta "${oldName}":`, oldName);
    
    if (!newName || newName === oldName) {
        return;
    }
    
    if (!currentUser) {
        mostrarMensaje('❌ Debes iniciar sesión para renombrar carpetas', 'error');
        return;
    }
    
    try {
        mostrarMensaje(`✏️ Renombrando carpeta: ${oldName} → ${newName}`, 'info');
        
        // En Supabase Storage, necesitamos mover todos los archivos de la carpeta
        const oldFullPath = obtenerRutaCompleta(oldPath);
        const newPath = oldPath.replace(oldName, newName);
        const newFullPath = obtenerRutaCompleta(newPath);
        
        // Listar todos los archivos en la carpeta antigua
        const { data: files, error: listError } = await supabase.storage
            .from('midrive-files')
            .list(oldFullPath, { limit: 1000 });
        
        if (listError) {
            throw new Error(`Error al listar archivos: ${listError.message}`);
        }
        
        // Mover cada archivo
        for (const file of files) {
            const oldFilePath = `${oldFullPath}/${file.name}`;
            const newFilePath = `${newFullPath}/${file.name}`;
            
            const { error: moveError } = await supabase.storage
                .from('midrive-files')
                .move(oldFilePath, newFilePath);
            
            if (moveError) {
                console.warn(`Error moviendo ${file.name}:`, moveError);
            }
        }
        
        mostrarMensaje(`✅ Carpeta renombrada exitosamente`, 'success');
        cargarArchivos();
        
    } catch (error) {
        mostrarMensaje(`❌ Error: ${error.message}`, 'error');
        console.error('🔴 Error al renombrar carpeta:', error);
    }
}

// Eliminar carpeta
async function eliminarCarpeta(folderPath, folderName) {
    const confirmacion = confirm(`¿Estás seguro de que quieres eliminar la carpeta "${folderName}" y todo su contenido?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmacion) {
        return;
    }
    
    if (!currentUser) {
        mostrarMensaje('❌ Debes iniciar sesión para eliminar carpetas', 'error');
        return;
    }
    
    try {
        mostrarMensaje(`🗑️ Eliminando carpeta: ${folderName}`, 'info');
        
        const fullPath = obtenerRutaCompleta(folderPath);
        
        // Listar todos los archivos en la carpeta
        const { data: files, error: listError } = await supabase.storage
            .from('midrive-files')
            .list(fullPath, { limit: 1000 });
        
        if (listError) {
            throw new Error(`Error al listar archivos: ${listError.message}`);
        }
        
        // Eliminar todos los archivos
        const filesToDelete = files.map(file => `${fullPath}/${file.name}`);
        
        if (filesToDelete.length > 0) {
            const { error: deleteError } = await supabase.storage
                .from('midrive-files')
                .remove(filesToDelete);
            
            if (deleteError) {
                throw new Error(`Error al eliminar archivos: ${deleteError.message}`);
            }
        }
        
        mostrarMensaje(`✅ Carpeta "${folderName}" eliminada exitosamente`, 'success');
        cargarArchivos();
        
    } catch (error) {
        mostrarMensaje(`❌ Error: ${error.message}`, 'error');
        console.error('🔴 Error al eliminar carpeta:', error);
    }
}

// ===== SUBIR ARCHIVOS =====
async function subirArchivos() {
    if (selectedFiles.length === 0) {
        mostrarMensaje('❌ No hay archivos seleccionados', 'error');
        return;
    }

    if (!currentUser) {
        mostrarMensaje('❌ Debes iniciar sesión para subir archivos', 'error');
        return;
    }

    const uploadBtn = document.getElementById('uploadBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    
    // Cambiar estado del botón
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ Subiendo...';
    progressBar.style.display = 'block';
    
    console.log(`📤 Iniciando subida de ${selectedFiles.length} archivo(s)`);
    
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            
            mostrarMensaje(`📤 Subiendo: ${file.name}`, 'info');
            console.log(`📤 Subiendo archivo ${i + 1}/${selectedFiles.length}: ${file.name}`);
            
            // Crear nombre único para el archivo
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const filePath = `${obtenerRutaCompleta()}/${fileName}`;
            
            // Subir archivo directamente a Supabase Storage
            const { data, error } = await supabase.storage
                .from('midrive-files')
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: true
                });
            
            if (error) {
                throw new Error(`Error al subir ${file.name}: ${error.message}`);
            }
            
            console.log(`✅ Archivo subido: ${file.name}`);
            
            // Actualizar progreso
            const progress = ((i + 1) / selectedFiles.length) * 100;
            progressFill.style.width = progress + '%';
        }
        
        // Éxito
        mostrarMensaje('✅ ¡Todos los archivos subidos exitosamente!', 'success');
        console.log('✅ Subida completada exitosamente');
        
        // Limpiar selección
        selectedFiles = [];
        document.getElementById('selectedFiles').innerHTML = '';
        document.getElementById('fileInput').value = '';
        
        // Actualizar lista de archivos
        cargarArchivos();
        
    } catch (error) {
        mostrarMensaje(`❌ Error: ${error.message}`, 'error');
        console.error('🔴 Error en subida:', error);
    } finally {
        // Restaurar botón
        uploadBtn.disabled = false;
        uploadBtn.textContent = '🚀 Subir Archivos';
        progressBar.style.display = 'none';
        progressFill.style.width = '0%';
    }
}

// ===== CARGAR LISTA DE ARCHIVOS =====
async function cargarArchivos() {
    if (!currentUser) {
        console.log('⚠️ No hay usuario autenticado');
        return;
    }

    const filesList = document.getElementById('filesList');
    filesList.innerHTML = '<p class="loading">Cargando archivos...</p>';
    
    console.log('🔄 Cargando lista de archivos...');
    
    try {
        // Listar archivos y carpetas desde Supabase Storage
        const currentFolder = obtenerRutaCompleta();
        const { data, error } = await supabase.storage
            .from('midrive-files')
            .list(currentFolder, {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) {
            throw error;
        }

        console.log('📂 Contenido recibido:', data);
        
        if (data && data.length > 0) {
            filesList.innerHTML = '';
            
            // Separar carpetas y archivos
            const folders = [];
            const files = [];
            
            data.forEach(item => {
                if (item.name === '.folder') {
                    // Es una carpeta
                    const folderName = currentFolder.split('/').pop();
                    if (folderName) {
                        folders.push({
                            name: folderName,
                            path: currentPath,
                            type: 'folder'
                        });
                    }
                } else if (item.name.endsWith('.folder')) {
                    // Es un marcador de subcarpeta
                    const folderName = item.name.replace('.folder', '');
                    const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
                    folders.push({
                        name: folderName,
                        path: folderPath,
                        type: 'folder'
                    });
                } else if (!item.name.startsWith('.')) {
                    // Es un archivo regular
                    files.push(item);
                }
            });
            
            // Mostrar carpetas primero
            folders.forEach(folder => {
                const folderDiv = document.createElement('div');
                folderDiv.className = 'folder-item folder';
                folderDiv.innerHTML = `
                    <div class="folder-info" ondblclick="navegarACarpeta('${folder.path}')">
                        <div class="folder-icon">📁</div>
                        <div class="folder-name">${folder.name}</div>
                    </div>
                    <div class="folder-actions">
                        <button class="btn btn-secondary" onclick="renombrarCarpeta('${folder.path}', '${folder.name}')">
                            ✏️ Renombrar
                        </button>
                        <button class="btn btn-danger" onclick="eliminarCarpeta('${folder.path}', '${folder.name}')">
                            🗑️ Eliminar
                        </button>
                    </div>
                `;
                filesList.appendChild(folderDiv);
            });
            
            // Mostrar archivos después
            files.forEach(file => {
                // Obtener URL pública
                const { data: publicUrlData } = supabase.storage
                    .from('midrive-files')
                    .getPublicUrl(`${currentFolder}/${file.name}`);

                // Extraer nombre original (remover timestamp)
                const originalName = file.name.replace(/^\d+_/, '');
                
                const fileDiv = document.createElement('div');
                fileDiv.className = 'saved-file';
                fileDiv.innerHTML = `
                    <div class="file-info">
                        <div class="file-name">📄 ${originalName}</div>
                        <div class="file-size">${formatFileSize(file.metadata?.size || 0)}</div>
                    </div>
                    <div class="file-actions">
                        <button class="btn btn-secondary" onclick="descargarArchivo('${publicUrlData.publicUrl}')">
                            ⬇️ Descargar
                        </button>
                        <button class="btn btn-danger" onclick="eliminarArchivo('${file.name}', '${originalName}')">
                            🗑️ Eliminar
                        </button>
                    </div>
                `;
                filesList.appendChild(fileDiv);
            });
            
            if (folders.length === 0 && files.length === 0) {
                filesList.innerHTML = '<p class="empty-state">Esta carpeta está vacía</p>';
            }
        } else {
            filesList.innerHTML = '<p class="empty-state">Esta carpeta está vacía</p>';
        }
    } catch (error) {
        console.error('🔴 Error al cargar contenido:', error);
        filesList.innerHTML = '<p class="error-text">❌ Error al cargar contenido</p>';
    }
}

// ===== DESCARGAR ARCHIVO =====
function descargarArchivo(publicUrl) {
    console.log(`⬇️ Descargando archivo desde: ${publicUrl}`);
    window.open(publicUrl, '_blank');
}

// ===== ELIMINAR ARCHIVO =====
async function eliminarArchivo(fileName, originalName) {
    if (!currentUser) {
        mostrarMensaje('❌ Debes iniciar sesión para eliminar archivos', 'error');
        return;
    }

    // Confirmación antes de eliminar
    const confirmacion = confirm(`¿Estás seguro de que quieres eliminar "${originalName}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmacion) {
        return;
    }

    try {
        mostrarMensaje(`🗑️ Eliminando: ${originalName}`, 'info');
        console.log(`🗑️ Eliminando archivo: ${fileName}`);
        
        // Eliminar archivo directamente desde Supabase Storage
        const filePath = `${obtenerRutaCompleta()}/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('midrive-files')
            .remove([filePath]);
        
        if (error) {
            throw new Error(`Error al eliminar ${originalName}: ${error.message}`);
        }
        
        console.log(`✅ Archivo eliminado: ${originalName}`);
        mostrarMensaje(`✅ ${originalName} eliminado exitosamente`, 'success');
        
        // Actualizar lista de archivos
        cargarArchivos();
        
    } catch (error) {
        mostrarMensaje(`❌ Error: ${error.message}`, 'error');
        console.error('🔴 Error al eliminar archivo:', error);
    }
}

// ===== FUNCIONES GLOBALES PARA BOTONES HTML =====
// Estas funciones se llaman desde los onclick en el HTML
window.elegirArchivos = elegirArchivos;
window.subirArchivos = subirArchivos;
window.cargarArchivos = cargarArchivos;
window.descargarArchivo = descargarArchivo;
window.eliminarArchivo = eliminarArchivo;
window.mostrarRegistro = mostrarRegistro;
window.mostrarLogin = mostrarLogin;
window.registrarUsuario = registrarUsuario;
window.iniciarSesion = iniciarSesion;
window.cerrarSesion = cerrarSesion;
// Funciones del explorador de carpetas
window.navegarACarpeta = navegarACarpeta;
window.navegarAtras = navegarAtras;
window.mostrarCrearCarpeta = mostrarCrearCarpeta;
window.cerrarModal = cerrarModal;
window.crearCarpeta = crearCarpeta;
window.renombrarCarpeta = renombrarCarpeta;
window.eliminarCarpeta = eliminarCarpeta;
