const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Buscar productos por término (inteligente)
  buscarProducto: (termino) => ipcRenderer.invoke('buscar-producto', { termino }),

  // Generar etiqueta para un producto
  generarEtiqueta: (producto) => ipcRenderer.invoke('generar-etiqueta', producto),

  guardarLogo: (fileData) => ipcRenderer.invoke('guardar-logo', fileData),
  obtenerConfiguracion: () => ipcRenderer.invoke('obtener-configuracion'),
  guardarConfiguracion: (config) => ipcRenderer.invoke('guardar-configuracion', config),
  seleccionarImpresora: () => ipcRenderer.invoke('seleccionar-impresora'),
  guardarEstanteria: ({ nombre, etiquetas }) => ipcRenderer.invoke('guardar-estanteria', { nombre, etiquetas }),
  cargarEstanterias: () => ipcRenderer.invoke('cargar-estanterias'),
  actualizarPreciosEstanteria: (etiquetas) => ipcRenderer.invoke('actualizar-precios-estanteria', etiquetas),
  eliminarEstanteria: (nombre) => ipcRenderer.invoke('eliminar-estanteria', nombre),
  renombrarEstanteria: ({ nombreViejo, nombreNuevo }) => ipcRenderer.invoke('renombrar-estanteria', { nombreViejo, nombreNuevo }),
  obtenerLogoPath: (logoPath) => ipcRenderer.invoke('obtener-logo-path', logoPath),
});