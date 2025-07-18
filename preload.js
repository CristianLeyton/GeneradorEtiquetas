const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Buscar productos por término (inteligente)
  buscarProducto: (termino) => ipcRenderer.invoke('buscar-producto', { termino }),

  // Generar etiqueta para un producto
  generarEtiqueta: (producto) => ipcRenderer.invoke('generar-etiqueta', producto),

  // Obtener configuración de impresora
  obtenerConfiguracionImpresora: () => ipcRenderer.invoke('obtener-configuracion-impresora'),

  // Guardar configuración de impresora
  guardarConfiguracionImpresora: (config) => ipcRenderer.invoke('guardar-configuracion-impresora', config),

  // Obtener lista de impresoras reales
  obtenerImpresoras: () => ipcRenderer.invoke('obtener-impresoras')
});