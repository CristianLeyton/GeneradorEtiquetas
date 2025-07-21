const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const Firebird = require('node-firebird');
const XLSX = require('xlsx');
const fs = require('fs');

// --- Manejo de rutas de archivos editables ---
const userDataPath = app.getPath('userData');

function getEditableJsonPath(filename) {
    return path.join(userDataPath, filename);
}

function ensureEditableJson(filename, defaultContent) {
    const editablePath = getEditableJsonPath(filename);
    if (!fs.existsSync(editablePath)) {
        // Copiar desde el directorio original (asar o desarrollo)
        const originalPath = path.join(__dirname, filename);
        if (fs.existsSync(originalPath)) {
            fs.copyFileSync(originalPath, editablePath);
        } else {
            fs.writeFileSync(editablePath, JSON.stringify(defaultContent, null, 2));
        }
    }
    return editablePath;
}

// --- Configuración de Firebird desde dbconfig.json ---
const dbConfigDefaults = {
    host: '127.0.0.1',
    port: 3050,
    database: 'C:/winfarma/data/winfarma',
    user: 'SYSDBA',
    password: '.',
    lowercase_keys: false,
    role: null,
    pageSize: 4096
};
const dbConfigPath = ensureEditableJson('dbconfig.json', dbConfigDefaults);
let dbOptions;
try {
    dbOptions = JSON.parse(fs.readFileSync(dbConfigPath, 'utf8'));
    // Validar que sea un objeto y tenga los campos mínimos
    if (!dbOptions || typeof dbOptions !== 'object' || !dbOptions.host) {
        dbOptions = dbConfigDefaults;
    }
} catch (e) {
    dbOptions = dbConfigDefaults;
}

// --- Rutas para otros JSON editables ---
const configPath = ensureEditableJson('config.json', {});
const estanteriasPath = ensureEditableJson('estanterias.json', []);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Crear el menú personalizado
    const menu = Menu.buildFromTemplate([
        {
            label: 'Archivo',
            submenu: [
                {
                    label: 'Editar conexión a base de datos',
                    click: () => {
                        const dbConfigPath = getEditableJsonPath('dbconfig.json');
                        if (fs.existsSync(dbConfigPath)) {
                            shell.openPath(dbConfigPath);
                        } else {
                            dialog.showErrorBox('Error', 'No existe dbconfig.json');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    },
                },
                /*                 {
                                    label: 'DevTools',
                                    accelerator: 'F12',
                                    click: () => {
                                        mainWindow.webContents.openDevTools();
                                    },
                                }, */
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    },
                },
            ],
        },
    ]);

    // Cambiar el menú superior
    mainWindow.setMenu(menu);

    mainWindow.loadFile('index.html');
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Función para conectar a la base de datos
function conectarDB() {
    return new Promise((resolve, reject) => {
        Firebird.attach(dbOptions, (err, db) => {
            if (err) {
                reject(err);
            } else {
                resolve(db);
            }
        });
    });
}

// Función para buscar productos
async function buscarProductos(termino) {
    const db = await conectarDB();

    return new Promise((resolve, reject) => {
        let query = '';
        let params = [];

        // Verifica si el término es numérico
        const isNumeric = !isNaN(termino);

        if (isNumeric) {
            query = `
                SELECT ID, NOMBRE, PRESENTACION, PRECIO, TROQUEL, CODIGO 
                FROM PRODUCTO 
                WHERE UPPER(NOMBRE) LIKE UPPER(?) 
                OR CODIGO = ?
                OR TROQUEL = ?
                ORDER BY NOMBRE 
                ROWS 50
            `;
            params = [`${termino}%`, Number(termino), Number(termino)];
        } else {
            query = `
                SELECT ID, NOMBRE, PRESENTACION, PRECIO, TROQUEL, CODIGO 
                FROM PRODUCTO 
                WHERE UPPER(NOMBRE) LIKE UPPER(?)
                ORDER BY NOMBRE 
                ROWS 50
            `;
            params = [`${termino}%`];
        }

        db.query(query, params, (err, result) => {
            db.detach();
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Función para buscar producto por ID Y CODIGO
async function buscarProductoPorIdYCodigo({ ID, CODIGO }) {
    const db = await conectarDB();
    return new Promise((resolve, reject) => {
        let query = `
            SELECT ID, NOMBRE, PRESENTACION, PRECIO, TROQUEL, CODIGO 
            FROM PRODUCTO 
            WHERE ID = ? AND CODIGO = ?
            ROWS 1
        `;
        db.query(query, [ID, CODIGO], (err, result) => {
            db.detach();
            if (err) {
                reject(err);
            } else {
                resolve(result && result[0] ? result[0] : null);
            }
        });
    });
}

// Handlers de IPC
ipcMain.handle('buscar-producto', async (event, { termino }) => {
    try {
        const productos = await buscarProductos(termino);
        return { success: true, data: productos };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('generar-etiqueta', async (event, productos) => {
    try {
        // Permitir tanto un solo producto como un array de productos
        const lista = Array.isArray(productos) ? productos : [productos];
        // Aquí implementa la lógica para generar varias etiquetas
        // Por ahora solo retorna la lista
        return { success: true, data: lista };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('guardar-logo', async (event, fileData) => {
    try {
        const logoDir = path.join(app.getPath('userData'), 'logo');
        if (!fs.existsSync(logoDir)) {
            fs.mkdirSync(logoDir, { recursive: true });
        }
        // Extraer base64 y tipo de archivo
        const matches = fileData.dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error('Formato de imagen inválido');
        const ext = fileData.name.split('.').pop();
        const destPath = path.join(logoDir, 'logo.' + ext);
        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(destPath, buffer);
        // Guardar la ruta en config.json
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        config.logoPath = path.join('logo', 'logo.' + ext);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return { success: true, path: config.logoPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('obtener-configuracion', async () => {
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config;
        }
        return {};
    } catch (error) {
        return {};
    }
});

ipcMain.handle('guardar-configuracion', async (event, nuevaConfig) => {
    try {
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        // Eliminar logo si se solicita
        if (nuevaConfig.eliminarLogo) {
            if (config.logoPath) {
                const logoFullPath = path.join(app.getPath('userData'), config.logoPath);
                if (fs.existsSync(logoFullPath)) {
                    fs.unlinkSync(logoFullPath);
                }
            }
            delete nuevaConfig.logo;
            delete nuevaConfig.logoPath;
            config.logoPath = undefined;
        }
        // Guardar logo nuevo si se proporciona
        if (nuevaConfig.logo) {
            // Eliminar logo anterior si existe
            if (config.logoPath) {
                const oldLogoFullPath = path.join(app.getPath('userData'), config.logoPath);
                if (fs.existsSync(oldLogoFullPath)) {
                    fs.unlinkSync(oldLogoFullPath);
                }
            }
            const logoDir = path.join(app.getPath('userData'), 'logo');
            if (!fs.existsSync(logoDir)) {
                fs.mkdirSync(logoDir, { recursive: true });
            }
            const matches = nuevaConfig.logo.dataUrl.match(/^data:(.+);base64,(.+)$/);
            if (!matches) throw new Error('Formato de imagen inválido');
            const ext = nuevaConfig.logo.name.split('.').pop();
            const destPath = path.join(logoDir, 'logo.' + ext);
            const buffer = Buffer.from(matches[2], 'base64');
            fs.writeFileSync(destPath, buffer);
            nuevaConfig.logoPath = path.join('logo', 'logo.' + ext);
            config.logoPath = nuevaConfig.logoPath;
            delete nuevaConfig.logo;
        }
        // Mantener el logoPath si ya existe y no viene en la nueva config
        if (config.logoPath && !nuevaConfig.logoPath) {
            nuevaConfig.logoPath = config.logoPath;
        }
        // Mantener mostrarPrecioSinImpuestos si ya existe y no viene en la nueva config
        if (typeof config.mostrarPrecioSinImpuestos === 'boolean' && typeof nuevaConfig.mostrarPrecioSinImpuestos !== 'boolean') {
            nuevaConfig.mostrarPrecioSinImpuestos = config.mostrarPrecioSinImpuestos;
        }
        fs.writeFileSync(configPath, JSON.stringify(nuevaConfig, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('seleccionar-impresora', async () => {
    try {
        if (!mainWindow) throw new Error('Ventana principal no disponible');
        const printers = mainWindow.webContents.getPrinters();
        // Mostrar un cuadro de selección simple usando dialog.showMessageBox
        const printerNames = printers.map(p => p.name);
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            buttons: printerNames,
            title: 'Seleccionar impresora',
            message: '¿A qué impresora deseas enviar las etiquetas?'
        });
        if (typeof response === 'number' && printerNames[response]) {
            return { printerName: printerNames[response] };
        }
        return { printerName: null };
    } catch (error) {
        return { printerName: null, error: error.message };
    }
});

// Handler para guardar estantería
ipcMain.handle('guardar-estanteria', async (event, { nombre, etiquetas }) => {
    let data = [];
    if (fs.existsSync(estanteriasPath)) {
        data = JSON.parse(fs.readFileSync(estanteriasPath, 'utf8'));
    }
    // Si ya existe una estantería con ese nombre, la sobrescribe
    const idx = data.findIndex(e => e.nombre === nombre);
    if (idx !== -1) {
        data[idx].etiquetas = etiquetas;
    } else {
        data.push({ nombre, etiquetas });
    }
    fs.writeFileSync(estanteriasPath, JSON.stringify(data, null, 2));
    return { success: true };
});

// Handler para cargar todas las estanterías
ipcMain.handle('cargar-estanterias', async () => {
    if (!fs.existsSync(estanteriasPath)) return [];
    return JSON.parse(fs.readFileSync(estanteriasPath, 'utf8'));
});

// Handler para actualizar precios de una estantería
ipcMain.handle('actualizar-precios-estanteria', async (event, etiquetas) => {
    // Para cada etiqueta, busca el producto por ID Y CODIGO y actualiza el precio
    const actualizadas = await Promise.all(etiquetas.map(async (etiqueta) => {
        const productoBD = await buscarProductoPorIdYCodigo({ ID: etiqueta.ID, CODIGO: etiqueta.CODIGO });
        if (productoBD && productoBD.PRECIO != null) {
            return { ...etiqueta, PRECIO: productoBD.PRECIO };
        }
        return etiqueta;
    }));
    return actualizadas;
});

// Handler para eliminar estantería
ipcMain.handle('eliminar-estanteria', async (event, nombre) => {
    let data = [];
    if (fs.existsSync(estanteriasPath)) {
        data = JSON.parse(fs.readFileSync(estanteriasPath, 'utf8'));
    }
    const nuevaData = data.filter(e => e.nombre !== nombre);
    fs.writeFileSync(estanteriasPath, JSON.stringify(nuevaData, null, 2));
    return { success: true };
});

// Handler para renombrar estantería
ipcMain.handle('renombrar-estanteria', async (event, { nombreViejo, nombreNuevo }) => {
    let data = [];
    if (fs.existsSync(estanteriasPath)) {
        data = JSON.parse(fs.readFileSync(estanteriasPath, 'utf8'));
    }
    if (data.some(e => e.nombre === nombreNuevo)) {
        return { success: false, error: 'Ya existe una estantería con ese nombre' };
    }
    const idx = data.findIndex(e => e.nombre === nombreViejo);
    if (idx !== -1) {
        data[idx].nombre = nombreNuevo;
        fs.writeFileSync(estanteriasPath, JSON.stringify(data, null, 2));
        return { success: true };
    }
    return { success: false, error: 'No se encontró la estantería' };
});

ipcMain.handle('obtener-logo-path', async (event, logoPath) => {
    const fullPath = path.join(app.getPath('userData'), logoPath);
    return 'file://' + fullPath.replace(/\\/g, '/');
});

