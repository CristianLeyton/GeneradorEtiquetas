const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const Firebird = require('node-firebird');
const XLSX = require('xlsx');
const fs = require('fs');

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
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    },
                },
                {
                    label: 'DevTools',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.openDevTools();
                    },
                },
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

// Configuración de Firebird
const dbOptions = {
    host: '127.0.0.1',
    port: 3050,
    database: 'C:/winfarma/data/winfarma',
    user: 'SYSDBA',
    password: '.',
    lowercase_keys: false,
    role: null,
    pageSize: 4096
};

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
        const logoDir = path.join(__dirname, 'src', 'logo');
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
        const configPath = path.join(__dirname, 'config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        config.logoPath = 'src/logo/logo.' + ext;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return { success: true, path: config.logoPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('obtener-configuracion', async () => {
    try {
        const configPath = path.join(__dirname, 'config.json');
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
        const configPath = path.join(__dirname, 'config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        // Eliminar logo si se solicita
        if (nuevaConfig.eliminarLogo) {
            if (config.logoPath) {
                const logoFullPath = path.join(__dirname, config.logoPath);
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
                const oldLogoFullPath = path.join(__dirname, config.logoPath);
                if (fs.existsSync(oldLogoFullPath)) {
                    fs.unlinkSync(oldLogoFullPath);
                }
            }
            const logoDir = path.join(__dirname, 'src', 'logo');
            if (!fs.existsSync(logoDir)) {
                fs.mkdirSync(logoDir, { recursive: true });
            }
            const matches = nuevaConfig.logo.dataUrl.match(/^data:(.+);base64,(.+)$/);
            if (!matches) throw new Error('Formato de imagen inválido');
            const ext = nuevaConfig.logo.name.split('.').pop();
            const destPath = path.join(logoDir, 'logo.' + ext);
            const buffer = Buffer.from(matches[2], 'base64');
            fs.writeFileSync(destPath, buffer);
            nuevaConfig.logoPath = 'src/logo/logo.' + ext;
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

