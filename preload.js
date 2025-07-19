const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Buscar productos por término (inteligente)
  buscarProducto: (termino) => ipcRenderer.invoke('buscar-producto', { termino }),

  // Generar etiqueta para un producto
  generarEtiqueta: (producto) => ipcRenderer.invoke('generar-etiqueta', producto),

  guardarLogo: (fileData) => ipcRenderer.invoke('guardar-logo', fileData),
  obtenerConfiguracion: () => ipcRenderer.invoke('obtener-configuracion'),
  guardarConfiguracion: (config) => ipcRenderer.invoke('guardar-configuracion', config),
});