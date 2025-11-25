// ===== VARIABLES GLOBALES =====
let selectedFiles = [];
let currentUser = null;
let userProfile = null; // Perfil del usuario actual
let fileHistory = []; // Historial de archivos del usuario
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
        // Cargar perfil del usuario
        cargarPerfil();
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
    
    // Event listener para subida de avatar
    document.getElementById('avatarInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Validar que sea una imagen
            if (!file.type.startsWith('image/')) {
                mostrarMensaje('❌ Por favor selecciona una imagen válida', 'error');
                return;
            }
            
            // Validar tamaño (máximo 5MB)
            if (file.size > 5 * 1024 * 1024) {
                mostrarMensaje('❌ La imagen debe ser menor a 5MB', 'error');
                return;
            }
            
            subirAvatar(file);
        }
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
    console.log(`📁 Intentando navegar a: ${path || 'Inicio'}`);
    
    if (path !== currentPath) {
        folderHistory.push(currentPath);
    }
    
    currentPath = path;
    actualizarBreadcrumb();
    actualizarTituloCarpeta();
    actualizarBotonAtras();
    cargarArchivos();
    
    console.log(`✅ Navegación completada a: ${path || 'Inicio'}`);
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

// ===== SISTEMA DE PERFILES DE USUARIO =====

// Cargar perfil del usuario
async function cargarPerfil() {
    if (!currentUser) return;
    
    try {
        console.log('👤 Cargando perfil del usuario...');
        
        // Obtener perfil desde Supabase
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        if (data) {
            userProfile = data;
            console.log('✅ Perfil cargado:', userProfile);
        } else {
            // Crear perfil si no existe
            await crearPerfilInicial();
        }
        
        actualizarInterfazPerfil();
        
    } catch (error) {
        console.error('🔴 Error al cargar perfil:', error);
        // Crear perfil por defecto
        userProfile = {
            id: currentUser.id,
            full_name: currentUser.email.split('@')[0],
            avatar_url: null,
            bio: null,
            phone: null,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
        };
        actualizarInterfazPerfil();
    }
}

// Crear perfil inicial
async function crearPerfilInicial() {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .insert([{
                id: currentUser.id,
                full_name: currentUser.email.split('@')[0],
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        userProfile = data;
        console.log('✅ Perfil inicial creado:', userProfile);
        
    } catch (error) {
        console.error('🔴 Error al crear perfil inicial:', error);
    }
}

// Actualizar interfaz con datos del perfil
function actualizarInterfazPerfil() {
    if (!userProfile) return;
    
    // Actualizar header
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');
    
    userName.textContent = userProfile.full_name || 'Usuario';
    userEmail.textContent = currentUser.email;
    
    if (userProfile.avatar_url) {
        userAvatar.src = userProfile.avatar_url;
    } else {
        // Avatar por defecto con inicial del nombre
        const initial = (userProfile.full_name || currentUser.email)[0].toUpperCase();
        userAvatar.src = `https://via.placeholder.com/40/3B82F6/FFFFFF?text=${initial}`;
    }
}

// Mostrar modal de perfil
async function mostrarPerfil() {
    if (!userProfile) {
        await cargarPerfil();
    }
    
    // Llenar formulario con datos actuales
    document.getElementById('profileFullName').value = userProfile.full_name || '';
    document.getElementById('profileBio').value = userProfile.bio || '';
    document.getElementById('profilePhone').value = userProfile.phone || '';
    document.getElementById('profileEmail').textContent = currentUser.email;
    
    // Actualizar avatar en modal
    const profileAvatar = document.getElementById('profileAvatar');
    if (userProfile.avatar_url) {
        profileAvatar.src = userProfile.avatar_url;
    } else {
        const initial = (userProfile.full_name || currentUser.email)[0].toUpperCase();
        profileAvatar.src = `https://via.placeholder.com/120/3B82F6/FFFFFF?text=${initial}`;
    }
    
    // Actualizar estadísticas
    await actualizarEstadisticas();
    
    // Mostrar fechas
    if (userProfile.created_at) {
        const memberSince = new Date(userProfile.created_at).getFullYear();
        document.getElementById('memberSince').textContent = memberSince;
    }
    
    if (userProfile.last_login) {
        const lastLogin = new Date(userProfile.last_login).toLocaleDateString();
        document.getElementById('lastLogin').textContent = lastLogin;
    }
    
    // Mostrar modal
    document.getElementById('profileModal').style.display = 'flex';
}

// Actualizar estadísticas del usuario
async function actualizarEstadisticas() {
    try {
        // Contar archivos
        const currentFolder = obtenerRutaCompleta('');
        const { data: files, error } = await supabase.storage
            .from('midrive-files')
            .list(currentFolder, { limit: 1000 });
        
        if (!error && files) {
            const fileCount = files.filter(item => !item.name.startsWith('.')).length;
            const folderCount = files.filter(item => item.name.endsWith('.folder')).length;
            
            document.getElementById('fileCount').textContent = fileCount;
            document.getElementById('folderCount').textContent = folderCount;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Guardar perfil
async function guardarPerfil(event) {
    event.preventDefault();
    
    if (!currentUser) return;
    
    try {
        mostrarMensaje('💾 Guardando perfil...', 'info');
        
        const fullName = document.getElementById('profileFullName').value.trim();
        const bio = document.getElementById('profileBio').value.trim();
        const phone = document.getElementById('profilePhone').value.trim();
        
        const { data, error } = await supabase
            .from('user_profiles')
            .update({
                full_name: fullName || null,
                bio: bio || null,
                phone: phone || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id)
            .select()
            .single();
        
        if (error) throw error;
        
        userProfile = data;
        actualizarInterfazPerfil();
        
        mostrarMensaje('✅ Perfil guardado exitosamente', 'success');
        cerrarModal('profileModal');
        
    } catch (error) {
        console.error('🔴 Error al guardar perfil:', error);
        mostrarMensaje(`❌ Error al guardar perfil: ${error.message}`, 'error');
    }
}

// Cambiar avatar
function cambiarAvatar() {
    document.getElementById('avatarInput').click();
}

// Manejar subida de avatar
async function subirAvatar(file) {
    if (!currentUser || !file) return;
    
    try {
        mostrarMensaje('📷 Subiendo foto de perfil...', 'info');
        
        // Crear nombre único para el avatar
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}_avatar.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        
        // Subir imagen a Supabase Storage
        const { data, error } = await supabase.storage
            .from('midrive-files')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: true
            });
        
        if (error) throw error;
        
        // Obtener URL pública
        const { data: publicUrlData } = supabase.storage
            .from('midrive-files')
            .getPublicUrl(filePath);
        
        // Actualizar perfil con nueva URL
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
                avatar_url: publicUrlData.publicUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);
        
        if (updateError) throw updateError;
        
        userProfile.avatar_url = publicUrlData.publicUrl;
        actualizarInterfazPerfil();
        
        // Actualizar avatar en modal
        document.getElementById('profileAvatar').src = publicUrlData.publicUrl;
        
        mostrarMensaje('✅ Foto de perfil actualizada', 'success');
        
    } catch (error) {
        console.error('🔴 Error al subir avatar:', error);
        mostrarMensaje(`❌ Error al subir foto: ${error.message}`, 'error');
    }
}

// ===== SISTEMA DE HISTORIAL DE ARCHIVOS =====

// Registrar actividad en el historial
async function registrarActividad(fileName, originalName, filePath, fileSize, fileType, action, folderPath = currentPath) {
    if (!currentUser) return;
    
    try {
        const { error } = await supabase
            .from('file_history')
            .insert([{
                user_id: currentUser.id,
                file_name: fileName,
                original_name: originalName,
                file_path: filePath,
                file_size: fileSize,
                file_type: fileType,
                mime_type: getFileType(originalName),
                action: action,
                folder_path: folderPath,
                metadata: {
                    user_agent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                }
            }]);
        
        if (error) {
            console.warn('Error al registrar actividad:', error);
        } else {
            console.log(`📊 Actividad registrada: ${action} - ${originalName}`);
        }
    } catch (error) {
        console.warn('Error al registrar actividad:', error);
    }
}

// Obtener tipo de archivo
function getFileType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const types = {
        // Imágenes
        'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'bmp': 'image', 'webp': 'image', 'svg': 'image',
        // Videos
        'mp4': 'video', 'avi': 'video', 'mov': 'video', 'wmv': 'video', 'flv': 'video', 'webm': 'video',
        // Audio
        'mp3': 'audio', 'wav': 'audio', 'flac': 'audio', 'aac': 'audio', 'ogg': 'audio',
        // Documentos
        'pdf': 'document', 'doc': 'document', 'docx': 'document', 'txt': 'document', 'rtf': 'document',
        // Hojas de cálculo
        'xls': 'spreadsheet', 'xlsx': 'spreadsheet', 'csv': 'spreadsheet',
        // Presentaciones
        'ppt': 'presentation', 'pptx': 'presentation',
        // Archivos comprimidos
        'zip': 'archive', 'rar': 'archive', '7z': 'archive', 'tar': 'archive', 'gz': 'archive',
        // Código
        'js': 'code', 'html': 'code', 'css': 'code', 'php': 'code', 'py': 'code', 'java': 'code', 'cpp': 'code'
    };
    
    return types[extension] || 'other';
}

// Mostrar modal de historial
async function mostrarHistorial() {
    document.getElementById('historyModal').style.display = 'flex';
    await cargarHistorial();
}

// Cargar historial de archivos
async function cargarHistorial() {
    if (!currentUser) return;
    
    try {
        console.log('📊 Cargando historial de archivos...');
        
        const { data, error } = await supabase
            .from('file_history')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        fileHistory = data || [];
        console.log(`✅ Historial cargado: ${fileHistory.length} registros`);
        
        actualizarEstadisticasHistorial();
        actualizarFiltrosHistorial();
        mostrarHistorialItems();
        
    } catch (error) {
        console.error('🔴 Error al cargar historial:', error);
        document.getElementById('historyItems').innerHTML = '<p class="error-text">❌ Error al cargar historial</p>';
    }
}

// Actualizar estadísticas del historial
function actualizarEstadisticasHistorial() {
    const uploads = fileHistory.filter(item => item.action === 'upload');
    const deletes = fileHistory.filter(item => item.action === 'delete');
    
    // Total de subidas
    document.getElementById('totalUploads').textContent = uploads.length;
    
    // Total de eliminaciones
    document.getElementById('totalDeletes').textContent = deletes.length;
    
    // Espacio total usado (solo archivos existentes)
    const totalSize = uploads.reduce((sum, item) => sum + (item.file_size || 0), 0);
    document.getElementById('totalSize').textContent = formatFileSize(totalSize);
    
    // Tipos de archivo únicos
    const uniqueTypes = [...new Set(fileHistory.map(item => item.file_type))];
    document.getElementById('totalTypes').textContent = uniqueTypes.length;
}

// Actualizar filtros de historial
function actualizarFiltrosHistorial() {
    const typeFilter = document.getElementById('typeFilter');
    const uniqueTypes = [...new Set(fileHistory.map(item => item.file_type))];
    
    // Limpiar opciones existentes (excepto "Todos")
    typeFilter.innerHTML = '<option value="">Todos</option>';
    
    // Agregar tipos únicos
    uniqueTypes.forEach(type => {
        if (type) {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            typeFilter.appendChild(option);
        }
    });
}

// Mostrar items del historial
function mostrarHistorialItems(filteredHistory = fileHistory) {
    const container = document.getElementById('historyItems');
    
    if (filteredHistory.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay actividad registrada</p>';
        return;
    }
    
    container.innerHTML = '';
    
    filteredHistory.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        
        const actionIcon = item.action === 'upload' ? '📤' : '🗑️';
        const actionText = item.action === 'upload' ? 'Subido' : 'Eliminado';
        const date = new Date(item.created_at).toLocaleString();
        
        itemDiv.innerHTML = `
            <div class="history-action ${item.action}">
                ${actionIcon}
            </div>
            <div class="history-details">
                <div class="history-file-name">${item.original_name}</div>
                <div class="history-meta">
                    <span>📁 ${item.folder_path || 'Inicio'}</span>
                    <span>📊 ${formatFileSize(item.file_size)}</span>
                    <span>🏷️ ${item.file_type}</span>
                    <span>⚡ ${actionText}</span>
                </div>
            </div>
            <div class="history-date">
                ${date}
            </div>
        `;
        
        container.appendChild(itemDiv);
    });
}

// Filtrar historial
function filtrarHistorial() {
    const actionFilter = document.getElementById('actionFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    let filtered = [...fileHistory];
    
    // Filtrar por acción
    if (actionFilter) {
        filtered = filtered.filter(item => item.action === actionFilter);
    }
    
    // Filtrar por tipo
    if (typeFilter) {
        filtered = filtered.filter(item => item.file_type === typeFilter);
    }
    
    // Filtrar por fecha
    if (dateFilter) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.created_at);
            
            switch (dateFilter) {
                case 'today':
                    return itemDate >= today;
                case 'week':
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return itemDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                    return itemDate >= monthAgo;
                default:
                    return true;
            }
        });
    }
    
    mostrarHistorialItems(filtered);
}

// ===== GESTIÓN DE CARPETAS =====

// Mostrar modal para crear carpeta
function mostrarCrearCarpeta() {
    document.getElementById('createFolderModal').style.display = 'flex';
    document.getElementById('folderName').focus();
}

// Cerrar modal
function cerrarModal(modalId = 'createFolderModal') {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'createFolderModal') {
        document.getElementById('folderName').value = '';
    }
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
        
        // Verificar si la carpeta ya existe
        const { data: existingFiles } = await supabase.storage
            .from('midrive-files')
            .list(obtenerRutaCompleta(), { limit: 1000 });
        
        const folderExists = existingFiles?.some(file => file.name === `${folderName}.folder`);
        
        if (folderExists) {
            throw new Error(`La carpeta "${folderName}" ya existe`);
        }
        
        // Crear archivo marcador JUNTO a la carpeta (no dentro)
        const currentFolder = obtenerRutaCompleta();
        const folderMarkerPath = `${currentFolder}/${folderName}.folder`;
        
        // Crear un archivo marcador para la carpeta
        const folderData = new Blob([JSON.stringify({
            name: folderName,
            created: new Date().toISOString(),
            type: 'folder',
            path: currentPath ? `${currentPath}/${folderName}` : folderName
        })], { type: 'application/json' });
        
        console.log(`📁 Creando marcador en: ${folderMarkerPath}`);
        
        const { data, error } = await supabase.storage
            .from('midrive-files')
            .upload(folderMarkerPath, folderData, {
                contentType: 'application/json',
                upsert: false
            });
        
        if (error) {
            console.error('Error de Supabase:', error);
            if (error.message.includes('already exists')) {
                throw new Error(`La carpeta "${folderName}" ya existe`);
            }
            throw new Error(`Error al crear carpeta: ${error.message}`);
        }
        
        console.log(`✅ Carpeta creada: ${folderName}`);
        mostrarMensaje(`✅ Carpeta "${folderName}" creada exitosamente`, 'success');
        
        // Cerrar modal y limpiar
        cerrarModal('createFolderModal');
        document.getElementById('folderName').value = '';
        
        // Actualizar lista inmediatamente
        setTimeout(() => {
            cargarArchivos();
        }, 300);
        
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

// Función eliminarCarpeta removida - ahora se usa eliminarArchivo con isFolder=true

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
            
            // Registrar actividad en el historial
            await registrarActividad(
                fileName,
                file.name,
                filePath,
                file.size,
                getFileType(file.name),
                'upload',
                currentPath
            );
            
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

// ===== LIMPIAR ARCHIVOS HUÉRFANOS =====
async function limpiarArchivosHuerfanos() {
    if (!currentUser) return;
    
    try {
        const currentFolder = obtenerRutaCompleta();
        const { data, error } = await supabase.storage
            .from('midrive-files')
            .list(currentFolder, { limit: 1000 });
        
        if (error || !data) return;
        
        // Buscar archivos que no deberían estar ahí
        const archivosAEliminar = [];
        
        data.forEach(item => {
            // Eliminar archivos sin extensión que no sean .folder
            if (!item.name.includes('.') && !item.name.endsWith('.folder')) {
                archivosAEliminar.push(`${currentFolder}/${item.name}`);
                console.log(`🧹 Marcando para eliminar archivo huérfano: ${item.name}`);
            }
        });
        
        // Eliminar archivos huérfanos
        if (archivosAEliminar.length > 0) {
            console.log(`🧹 Eliminando ${archivosAEliminar.length} archivos huérfanos...`);
            const { data, error } = await supabase.storage
                .from('midrive-files')
                .remove(archivosAEliminar);
            
            if (error) {
                console.error('🔴 Error al eliminar archivos huérfanos:', error);
                // Intentar eliminar uno por uno
                for (const archivo of archivosAEliminar) {
                    try {
                        console.log(`🧹 Intentando eliminar individualmente: ${archivo}`);
                        const { error: deleteError } = await supabase.storage
                            .from('midrive-files')
                            .remove([archivo]);
                        
                        if (deleteError) {
                            console.error(`❌ Error eliminando ${archivo}:`, deleteError);
                        } else {
                            console.log(`✅ Eliminado: ${archivo}`);
                        }
                    } catch (e) {
                        console.error(`❌ Excepción eliminando ${archivo}:`, e);
                    }
                }
            } else {
                console.log(`✅ Archivos huérfanos eliminados exitosamente`);
            }
        }
        
    } catch (error) {
        console.warn('Error al limpiar archivos huérfanos:', error);
    }
}

// ===== FUNCIÓN DE LIMPIEZA MANUAL =====
async function limpiarTodo() {
    if (!currentUser) {
        console.log('❌ No hay usuario autenticado');
        return;
    }
    
    console.log('🧹 Iniciando limpieza manual completa...');
    
    try {
        const currentFolder = obtenerRutaCompleta();
        console.log(`📁 Limpiando carpeta: ${currentFolder}`);
        
        const { data, error } = await supabase.storage
            .from('midrive-files')
            .list(currentFolder, { limit: 1000 });
        
        if (error) {
            console.error('Error al listar archivos:', error);
            return;
        }
        
        console.log('📂 Archivos encontrados:', data);
        
        // Eliminar archivos problemáticos específicos
        const archivosProblematicos = ['Emile bb', 'emile', 'Archivos'];
        
        for (const nombreArchivo of archivosProblematicos) {
            const archivo = data.find(item => item.name === nombreArchivo);
            if (archivo) {
                const rutaCompleta = `${currentFolder}/${nombreArchivo}`;
                console.log(`🗑️ Eliminando archivo problemático: ${rutaCompleta}`);
                
                try {
                    const { error: deleteError } = await supabase.storage
                        .from('midrive-files')
                        .remove([rutaCompleta]);
                    
                    if (deleteError) {
                        console.error(`❌ Error eliminando ${nombreArchivo}:`, deleteError);
                        
                        // Intentar con diferentes variaciones de la ruta
                        const variaciones = [
                            `${currentFolder}/${nombreArchivo}`,
                            `users/${currentUser.id}/${nombreArchivo}`,
                            nombreArchivo
                        ];
                        
                        for (const variacion of variaciones) {
                            console.log(`🔄 Intentando eliminar con ruta: ${variacion}`);
                            const { error: varError } = await supabase.storage
                                .from('midrive-files')
                                .remove([variacion]);
                            
                            if (!varError) {
                                console.log(`✅ Eliminado con ruta: ${variacion}`);
                                break;
                            } else {
                                console.log(`❌ Falló con ruta: ${variacion}`, varError);
                            }
                        }
                    } else {
                        console.log(`✅ ${nombreArchivo} eliminado exitosamente`);
                    }
                } catch (e) {
                    console.error(`❌ Excepción eliminando ${nombreArchivo}:`, e);
                }
            }
        }
        
        console.log('🔄 Recargando lista de archivos...');
        setTimeout(() => {
            cargarArchivos();
        }, 1000);
        
    } catch (error) {
        console.error('🔴 Error en limpieza manual:', error);
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
    
    // Limpiar archivos huérfanos primero
    await limpiarArchivosHuerfanos();
    
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
                console.log(`🔍 Procesando item: ${item.name}`);
                
                if (item.name.endsWith('.folder')) {
                    // Es un marcador de carpeta
                    const folderName = item.name.replace('.folder', '');
                    const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
                    console.log(`📁 Carpeta detectada: ${folderName}`);
                    folders.push({
                        name: folderName,
                        path: folderPath,
                        type: 'folder',
                        markerFile: item.name
                    });
                } else if (!item.name.startsWith('.') && 
                          !item.name.includes('_avatar.') && 
                          !item.name.endsWith('.folder') &&
                          item.name !== '.emptyFolderPlaceholder') {
                    // Es un archivo regular (excluir avatares, marcadores y placeholders)
                    console.log(`📄 Archivo detectado: ${item.name}`);
                    files.push(item);
                } else {
                    console.log(`⚠️ Item ignorado: ${item.name}`);
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
                        <button class="btn btn-danger" onclick="eliminarArchivo('${folder.markerFile}', '${folder.name}', true)">
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
async function eliminarArchivo(fileName, originalName, isFolder = false) {
    if (!currentUser) {
        mostrarMensaje('❌ Debes iniciar sesión para eliminar archivos', 'error');
        return;
    }

    const itemType = isFolder ? 'carpeta' : 'archivo';
    const confirmacion = confirm(`¿Estás seguro de que quieres eliminar ${itemType} "${originalName}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmacion) {
        return;
    }

    try {
        mostrarMensaje(`🗑️ Eliminando ${itemType}: ${originalName}`, 'info');
        console.log(`🗑️ Eliminando ${itemType}: ${fileName}`);
        console.log(`📁 Carpeta actual: ${currentPath}`);
        
        let filePath;
        
        if (isFolder) {
            // Es una carpeta - eliminar el marcador .folder
            filePath = `${obtenerRutaCompleta()}/${originalName}.folder`;
        } else {
            // Es un archivo regular
            filePath = `${obtenerRutaCompleta()}/${fileName}`;
        }
        
        console.log(`🗂️ Ruta completa: ${filePath}`);
        
        const { data, error } = await supabase.storage
            .from('midrive-files')
            .remove([filePath]);
        
        if (error) {
            console.error('Error de Supabase:', error);
            throw new Error(`Error al eliminar ${originalName}: ${error.message}`);
        }
        
        console.log(`✅ ${itemType} eliminado: ${originalName}`);
        mostrarMensaje(`✅ ${originalName} eliminado exitosamente`, 'success');
        
        // Registrar actividad en el historial
        await registrarActividad(
            fileName,
            originalName,
            filePath,
            0,
            isFolder ? 'folder' : getFileType(originalName),
            'delete',
            currentPath
        );
        
        // Actualizar lista de archivos inmediatamente
        setTimeout(() => {
            cargarArchivos();
        }, 200);
        
    } catch (error) {
        mostrarMensaje(`❌ Error: ${error.message}`, 'error');
        console.error('🔴 Error al eliminar:', error);
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
// Funciones del sistema de perfiles
window.mostrarPerfil = mostrarPerfil;
window.guardarPerfil = guardarPerfil;
window.cambiarAvatar = cambiarAvatar;
// Funciones del sistema de historial
window.mostrarHistorial = mostrarHistorial;
window.filtrarHistorial = filtrarHistorial;
// Función de limpieza manual
window.limpiarTodo = limpiarTodo;
