window.addEventListener('DOMContentLoaded', async () => {
  // Elementos del DOM
  const terminoBusqueda = document.getElementById('terminoBusqueda');
  const btnBuscar = document.getElementById('btnBuscar');
  const loading = document.getElementById('loading');
  const resultadosBusqueda = document.getElementById('resultadosBusqueda');
  const listaProductos = document.getElementById('listaProductos');
  const vistaPrevia = document.getElementById('vistaPrevia');
  const etiquetaPreview = document.getElementById('etiquetaPreview');
  const btnGenerarEtiqueta = document.getElementById('btnGenerarEtiqueta');
  const btnLimpiar = document.getElementById('btnLimpiar');
  const modalError = document.getElementById('modalError');
  const mensajeError = document.getElementById('mensajeError');
  const btnCerrarError = document.getElementById('btnCerrarError');
  const listaEtiquetasContainer = document.getElementById('listaEtiquetasContainer');
  const listaEtiquetas = document.getElementById('listaEtiquetas');
  const btnImprimirTodas = document.getElementById('btnImprimirTodas');
  const selectImpresora = document.getElementById('impresora');

  let productoSeleccionado = null;
  let etiquetasAImprimir = [];

  // Función para mostrar error
  function mostrarError(mensaje) {
    mensajeError.textContent = mensaje;
    modalError.classList.remove('hidden');
    modalError.classList.add('flex');
  }

  // Función para ocultar error
  function ocultarError() {
    modalError.classList.add('hidden');
    modalError.classList.remove('flex');
  }

  // Función para formatear precio
  function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(precio);
  }

  // Función para crear tarjeta de producto
  function crearTarjetaProducto(producto) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer';
    tarjeta.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-semibold text-gray-800 mb-1">${producto.NOMBRE}</h4>
          <p class="text-sm text-gray-600 mb-2">${producto.PRESENTACION}</p>
          <div class="flex gap-4 text-sm">
            <span class="text-blue-600">
              <i class="fas fa-barcode mr-1"></i>
              ${producto.CODIGO || 'Sin código'}
            </span>
            <span class="text-green-600">
              <i class="fas fa-tag mr-1"></i>
              ${producto.TROQUEL || 'Sin troquel'}
            </span>
          </div>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-green-600">${formatearPrecio(producto.PRECIO)}</div>
          <button class="mt-2 bg-blue-600 text-white px-3 py-1 cursor-pointer rounded text-sm hover:bg-blue-700 transition-colors agregar-etiqueta-btn">
            <i class="fas fa-plus mr-1"></i>
            Agregar
          </button>
        </div>
      </div>
    `;

    // Evento para agregar producto a la lista de etiquetas a imprimir
    tarjeta.querySelector('.agregar-etiqueta-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      agregarAImprimir(producto);
    });

    // Evento para seleccionar producto y mostrar vista previa
    tarjeta.addEventListener('click', () => {
      seleccionarProducto(producto);
    });

    return tarjeta;
  }

  // Función para seleccionar producto
  function seleccionarProducto(producto) {
    productoSeleccionado = producto;
    mostrarVistaPrevia(producto);
  }

  // Función para mostrar vista previa
  function mostrarVistaPrevia(producto) {
    const tamanoEtiqueta = document.getElementById('tamanoEtiqueta').value;

    let tamanoClase = '';
    switch (tamanoEtiqueta) {
      case 'pequena':
        tamanoClase = 'w-32 h-16';
        break;
      case 'mediana':
        tamanoClase = 'w-48 h-24';
        break;
      case 'grande':
        tamanoClase = 'w-64 h-32';
        break;
    }

    etiquetaPreview.innerHTML = `
      <div class="${tamanoClase} bg-white border-2 border-gray-300 rounded p-2 mx-auto">
        <div class="text-center">
          <div class="text-xs font-bold text-gray-800 truncate">${producto.NOMBRE}</div>
          <div class="text-xs text-gray-600 truncate">${producto.PRESENTACION}</div>
          <div class="text-lg font-bold text-green-600">${formatearPrecio(producto.PRECIO)}</div>
          ${producto.CODIGO ? `<div class="text-xs text-blue-600">${producto.CODIGO}</div>` : ''}
        </div>
      </div>
    `;

    vistaPrevia.classList.remove('hidden');
    vistaPrevia.scrollIntoView({ behavior: 'smooth' });
  }

  // Función para agregar producto a la lista de etiquetas a imprimir
  function agregarAImprimir(producto) {
    etiquetasAImprimir.push(producto);
    mostrarListaEtiquetas();
  }

  // Función para mostrar la lista de etiquetas a imprimir
  function mostrarListaEtiquetas() {
    listaEtiquetas.innerHTML = '';
    if (etiquetasAImprimir.length === 0) {
      listaEtiquetasContainer.classList.add('hidden');
      return;
    }
    etiquetasAImprimir.forEach((producto, idx) => {
      const item = document.createElement('div');
      item.className = 'flex justify-between items-center bg-gray-100 rounded p-2';
      item.innerHTML = `
        <div>
          <span class="font-semibold text-gray-800">${producto.NOMBRE}</span>
          <span class="text-sm text-gray-600 ml-2">${producto.PRESENTACION}</span>
        </div>
        <button class="text-red-600 hover:text-red-800 eliminar-etiqueta-btn" data-idx="${idx}">
          <i class="fas fa-trash"></i>
        </button>
      `;
      // Evento para eliminar producto de la lista
      item.querySelector('.eliminar-etiqueta-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        eliminarDeImprimir(idx);
      });
      listaEtiquetas.appendChild(item);
    });
    listaEtiquetasContainer.classList.remove('hidden');
  }

  // Función para eliminar producto de la lista de etiquetas a imprimir
  function eliminarDeImprimir(idx) {
    etiquetasAImprimir.splice(idx, 1);
    mostrarListaEtiquetas();
  }

  // Función para imprimir todas las etiquetas
  async function imprimirTodasEtiquetas() {
    if (etiquetasAImprimir.length === 0) {
      mostrarError('No hay etiquetas para imprimir');
      return;
    }
    try {
      const resultado = await window.api.generarEtiqueta(etiquetasAImprimir);
      if (resultado.success) {
        alert('Etiquetas generadas correctamente');
        etiquetasAImprimir = [];
        mostrarListaEtiquetas();
      } else {
        mostrarError(`Error al generar etiquetas: ${resultado.error}`);
      }
    } catch (error) {
      mostrarError(`Error al generar etiquetas: ${error.message}`);
    }
  }

  // Función para buscar productos
  async function buscarProductos() {
    const termino = terminoBusqueda.value.trim();
    if (!termino) {
      mostrarError('Por favor ingrese un término de búsqueda');
      return;
    }
    // Mostrar loading
    loading.classList.remove('hidden');
    resultadosBusqueda.classList.add('hidden');
    vistaPrevia.classList.add('hidden');
    try {
      const resultado = await window.api.buscarProducto(termino);
      if (resultado.success) {
        mostrarResultados(resultado.data);
      } else {
        mostrarError(`Error al buscar productos: ${resultado.error}`);
      }
    } catch (error) {
      mostrarError(`Error de conexión: ${error.message}`);
    } finally {
      loading.classList.add('hidden');
    }
  }

  // Función para mostrar resultados
  function mostrarResultados(productos) {
    if (productos.length === 0) {
      listaProductos.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-search text-4xl mb-4"></i>
          <p>No se encontraron productos</p>
        </div>
      `;
    } else {
      listaProductos.innerHTML = '';
      productos.forEach(producto => {
        listaProductos.appendChild(crearTarjetaProducto(producto));
      });
    }

    resultadosBusqueda.classList.remove('hidden');
  }

  // Función para generar etiqueta
  async function generarEtiqueta() {
    if (!productoSeleccionado) {
      mostrarError('No hay ningún producto seleccionado');
      return;
    }

    try {
      const resultado = await window.api.generarEtiqueta(productoSeleccionado);

      if (resultado.success) {
        // Aquí implementaremos la impresión real
        alert('Etiqueta generada correctamente');
      } else {
        mostrarError(`Error al generar etiqueta: ${resultado.error}`);
      }
    } catch (error) {
      mostrarError(`Error al generar etiqueta: ${error.message}`);
    }
  }

  // Función para limpiar
  function limpiar() {
    terminoBusqueda.value = '';
    productoSeleccionado = null;
    resultadosBusqueda.classList.add('hidden');
    vistaPrevia.classList.add('hidden');
  }

  // Event Listeners
  btnBuscar.addEventListener('click', buscarProductos);

  terminoBusqueda.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      buscarProductos();
    }
  });

  btnGenerarEtiqueta.addEventListener('click', generarEtiqueta);
  btnLimpiar.addEventListener('click', limpiar);
  btnCerrarError.addEventListener('click', ocultarError);
  btnImprimirTodas.addEventListener('click', imprimirTodasEtiquetas);

  // Cerrar modal con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ocultarError();
    }
  });

  // Cerrar modal haciendo clic fuera
  modalError.addEventListener('click', (e) => {
    if (e.target === modalError) {
      ocultarError();
    }
  });

  // Actualizar vista previa cuando cambie el tamaño
  document.getElementById('tamanoEtiqueta').addEventListener('change', () => {
    if (productoSeleccionado) {
      mostrarVistaPrevia(productoSeleccionado);
    }
  });

  // Función para poblar el select de impresoras
  async function cargarImpresoras() {
    try {
      const resultado = await window.api.obtenerImpresoras();
      if (resultado.success && Array.isArray(resultado.data)) {
        selectImpresora.innerHTML = '';
        resultado.data.forEach(impresora => {
          const option = document.createElement('option');
          option.value = impresora.name;
          option.textContent = impresora.name + (impresora.isDefault ? ' (Por defecto)' : '');
          selectImpresora.appendChild(option);
        });
      } else {
        // Si falla, dejar la opción por defecto
        selectImpresora.innerHTML = '<option value="default">Impresora por defecto</option>';
      }
    } catch (error) {
      selectImpresora.innerHTML = '<option value="default">Impresora por defecto</option>';
    }
  }

  // Llamar a cargarImpresoras al iniciar
  await cargarImpresoras();

  // Modificar cargarConfiguracion para seleccionar la impresora guardada si existe
  async function cargarConfiguracion() {
    try {
      const resultado = await window.api.obtenerConfiguracionImpresora();
      if (resultado.success && resultado.data) {
        // Aplicar configuracion guardada
        if (resultado.data.tamanoEtiqueta) {
          document.getElementById('tamanoEtiqueta').value = resultado.data.tamanoEtiqueta;
        }
        if (resultado.data.impresora) {
          selectImpresora.value = resultado.data.impresora;
        }
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  }

  // Guardar configuración
  async function guardarConfiguracion() {
    const config = {
      tamanoEtiqueta: document.getElementById('tamanoEtiqueta').value
    };

    try {
      await window.api.guardarConfiguracionImpresora(config);
    } catch (error) {
      console.error('Error al guardar configuración:', error);
    }
  }

  // Guardar configuración cuando cambie
  document.getElementById('tamanoEtiqueta').addEventListener('change', guardarConfiguracion);

  // Inicializar
  cargarConfiguracion();
});
