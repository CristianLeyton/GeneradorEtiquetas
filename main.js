const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const Firebird = require('node-firebird');
const XLSX = require('xlsx');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
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

ipcMain.handle('obtener-configuracion-impresora', async () => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return { success: true, data: config };
        }
        return { success: true, data: {} };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('guardar-configuracion-impresora', async (event, config) => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Handler para obtener la lista de impresoras del sistema
ipcMain.handle('obtener-impresoras', async () => {
    try {
        if (!mainWindow) throw new Error('Ventana principal no disponible');
        const impresoras = mainWindow.webContents.getPrinters();
        return { success: true, data: impresoras };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

