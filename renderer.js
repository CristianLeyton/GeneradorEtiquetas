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
  // Eliminar función cargarImpresoras y cualquier referencia a window.api.obtenerImpresoras o selectImpresora

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
    tarjeta.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors';
    // Obtener fecha actual en formato dd/mm/yyyy
    const hoy = new Date();
    const fechaHoy = hoy.toLocaleDateString('es-AR');
    tarjeta.innerHTML = `
      <div class="flex flex-col justify-center items-start gap-0">
        <div class="flex-1">
          <h4 contenteditable="plaintext-only" class="font-semibold text-gray-800 mb-1 text-sm editable-nombre">${producto.NOMBRE}</h4>
          <p contenteditable="plaintext-only" class="text-sm text-gray-600 mb-2 block editable-presentacion">${producto.PRESENTACION.trim()}</p>
          <div class="text-xs text-gray-500 mb-2">${producto.LABORATORIO_NOMBRE || ''}</div>
          <div class="flex gap-4 text-sm">
            <span class="text-blue-600 editable-codigo">
              <i class="fas fa-barcode mr-1"></i>
              ${producto.CODIGO || 'Sin código'}
            </span>
            <span class="text-gray-600 editable-fecha">
              <i class="fas fa-calendar-alt mr-1"></i>
              <span contenteditable="plaintext-only" class="editable-fecha-inner">${fechaHoy}</span>
            </span>
          </div>
        </div>
        <div class="flex justify-between items-center w-full">
        <div contenteditable="plaintext-only" class="text-xl font-bold text-green-600 editable-precio">${formatearPrecio(producto.PRECIO)}</div>
          <button class="mt-2 bg-blue-600 text-white px-3 py-1 cursor-pointer rounded text-sm hover:bg-blue-700 transition-colors agregar-etiqueta-btn">
            <i class="fas fa-plus text-sm"></i>
          </button>
        </div>
      </div>
    `;

    // Evento para agregar producto a la lista de etiquetas a imprimir
    tarjeta.querySelector('.agregar-etiqueta-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      // Tomar los datos editados de la card
      const nombre = tarjeta.querySelector('.editable-nombre').innerText.trim();
      const presentacion = tarjeta.querySelector('.editable-presentacion').innerText.trim();
      const codigo = tarjeta.querySelector('.editable-codigo').innerText.trim();
      const fecha = tarjeta.querySelector('.editable-fecha-inner').innerText.trim();
      let precioTexto = tarjeta.querySelector('.editable-precio').innerText.trim();
      let precio = producto.PRECIO;
      // Eliminar puntos de miles y reemplazar la coma decimal por punto
      let match = precioTexto.replace(/\./g, '').replace(',', '.').replace(/[^\d\.]/g, '');
      if (!isNaN(parseFloat(match))) precio = parseFloat(match);
      agregarAImprimir({
        ...producto,
        NOMBRE: nombre,
        PRESENTACION: presentacion,
        CODIGO: codigo === 'Sin código' ? '' : codigo,
        TROQUEL: '', // Ya no se usa
        FECHA: fecha,
        PRECIO: precio,
        LABORATORIO: producto.LABORATORIO, // <--- Asegúrate de incluir esto
        //LABORATORIO_NOMBRE: producto.LABORATORIO_NOMBRE // <--- Opcional, para mostrar
      });
    });

    return tarjeta;
  }


  // Función para agregar producto a la lista de etiquetas a imprimir
  function agregarAImprimir(producto) {
    etiquetasAImprimir.push(producto);
    mostrarListaEtiquetas();
    mostrarVistaPreviaEtiquetas();
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

  }

  // Función para eliminar producto de la lista de etiquetas a imprimir
  function eliminarDeImprimir(idx) {
    etiquetasAImprimir.splice(idx, 1);
    mostrarListaEtiquetas();
    mostrarVistaPreviaEtiquetas();
  }

  // Función para imprimir todas las etiquetas (usando el botón 'Generar Etiqueta')
  async function imprimirTodasEtiquetas() {
    if (etiquetasAImprimir.length === 0) {
      mostrarError('No hay etiquetas para imprimir');
      return;
    }
    try {
      // Pedir impresora al usuario
      const seleccion = await window.api.seleccionarImpresora();
      if (!seleccion || !seleccion.printerName) {
        mostrarError('No se seleccionó ninguna impresora');
        return;
      }
      // Dividir etiquetas en páginas de máximo 21 por hoja
      const etiquetasPorHoja = 21;
      const etiquetasArr = Array.from(etiquetasAImprimir);
      const paginas = [];
      for (let i = 0; i < etiquetasArr.length; i += etiquetasPorHoja) {
        paginas.push(etiquetasArr.slice(i, i + etiquetasPorHoja));
      }
      let paginasHTML = '';
      paginas.forEach(etis => {
        const html = etis.map((_, idx) => {
          // Usar el HTML ya generado en la vista previa
          return etiquetaPreview.children[idx + paginasHTML.split('a4-sheet').length * etiquetasPorHoja]?.outerHTML || '';
        }).join('');
        paginasHTML += `<div class="a4-sheet">${html}</div>`;
      });

      const printWindow = window.open('', '_blank', 'width=900,height=1300');
      printWindow.setMenu(null);
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir etiquetas</title>
            <link rel="stylesheet" href="src/output.css">
            <link rel="stylesheet" href="src/fontawesome/css/all.min.css">
            <style>
              body { background: white; margin: 0; padding: 0; }
              .a4-sheet {
                width: 210mm; height: 297mm; margin: 0 auto 24px auto; background: white; box-shadow: 0 0 4px #ccc; padding: 24px 12px; box-sizing: border-box;
                display: flex; flex-wrap: wrap; align-items: flex-start; align-content: flex-start; justify-content: flex-start; gap: 0;
                page-break-after: always;
                overflow: visible;
              }
              .a4-sheet > * {
                margin: 0 !important;
                break-inside: avoid;
                page-break-inside: avoid;
              }
              #btnPrint { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; }
              @media print {
                body, html { width: 210mm; height: 297mm; margin: 0; padding: 0; background: white; }
                .a4-sheet { box-shadow: none; margin: 0; }
                #btnPrint { display: none !important; }
                .a4-sheet { page-break-after: always; }
              }
            </style>
          </head>
          <body>
            <button id="btnPrint" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors print:hidden" style="display:block;margin-bottom:24px;">Imprimir</button>
            ${paginasHTML}
            <script>
              document.getElementById('btnPrint').onclick = () => {
                window.print();
              };
              window.onafterprint = () => { window.close(); };
              if (window.require) {
                try {
                  const { remote } = window.require('electron');
                  if (remote && remote.getCurrentWindow) {
                    remote.getCurrentWindow().setMenuBarVisibility(false);
                  }
                } catch (e) {}
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      mostrarError(`Error al imprimir etiquetas: ${error.message}`);
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
        <div class="text-center py-8 text-gray-500 col-span-full">
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

  // Modal de confirmación de limpiar etiquetas
  const modalConfirmarLimpiar = document.getElementById('modalConfirmarLimpiar');
  const btnConfirmarLimpiar = document.getElementById('btnConfirmarLimpiar');
  const btnCancelarLimpiar = document.getElementById('btnCancelarLimpiar');

  function mostrarModalLimpiar() {
    modalConfirmarLimpiar.classList.remove('hidden');
    modalConfirmarLimpiar.classList.add('flex');
  }
  function ocultarModalLimpiar() {
    modalConfirmarLimpiar.classList.add('hidden');
    modalConfirmarLimpiar.classList.remove('flex');
  }
  btnCancelarLimpiar.addEventListener('click', ocultarModalLimpiar);
  modalConfirmarLimpiar.addEventListener('click', (e) => {
    if (e.target === modalConfirmarLimpiar) ocultarModalLimpiar();
  });
  // Modificar función limpiar para mostrar el modal
  function limpiar() {
    mostrarModalLimpiar();
    // No limpiar nada aquí, solo mostrar el modal
  }

  // Mover el reseteo de input y selección al confirmar
  btnConfirmarLimpiar.addEventListener('click', () => {
    etiquetasAImprimir = [];
    mostrarListaEtiquetas();
    mostrarVistaPreviaEtiquetas();
    ocultarModalLimpiar();
    terminoBusqueda.value = '';
    productoSeleccionado = null;
    resultadosBusqueda.classList.add('hidden');
    vistaPrevia.classList.add('hidden');
  });

  // Event Listeners
  btnBuscar.addEventListener('click', buscarProductos);

  terminoBusqueda.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      buscarProductos();
    }
  });

  // Cambiar el texto y funcionalidad del botón 'Generar Etiqueta' a 'Imprimir etiquetas'
  btnGenerarEtiqueta.innerHTML = '<i class="fas fa-print mr-2"></i>Imprimir';
  btnGenerarEtiqueta.onclick = () => {
    if (etiquetasAImprimir.length === 0) {
      mostrarError('No hay etiquetas para imprimir');
      return;
    }
    // Obtener solo el HTML de la vista previa de etiquetas, ocultando los botones de eliminar
    const etiquetasHTML = etiquetaPreview.innerHTML.replace(/<i class=\"fas fa-trash[\s\S]*?<\/i>/gi, '');
    const printWindow = window.open('', '_blank', 'width=900,height=1300');
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir etiquetas</title>
          <link rel="stylesheet" href="src/output.css">
          <link rel="stylesheet" href="src/fontawesome/css/all.min.css">
          <style>
            body { background: white; margin: 0; padding: 0; }
            .a4-sheet {
              margin: 0 auto; background: white; box-shadow: 0 0 4px #ccc; padding: 12px 12px; box-sizing: border-box;
              display: flex; flex-wrap: wrap; align-items: flex-start; align-content: flex-start; justify-content: flex-start; gap: 0px;
              page-break-after: always;
            }
            .a4-sheet > * {
              margin: 0 !important;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            @media print {
              body, html { width: 210mm; height: 297mm; margin: 0; padding: 0; background: white; }
              .a4-sheet { box-shadow: none; margin: 0; }
              #btnPrint { display: none !important; }
              .a4-sheet { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          <button id="btnPrint" class="mt-4 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors print:hidden" style="display:block;margin:24px auto;">Imprimir</button>
          <div class"a4-sheet">${etiquetasHTML}</div>
          <script>
            document.getElementById('btnPrint').onclick = () => {
              window.print();
            };
            window.onafterprint = () => { window.close(); };
            if (window.require) {
              try {
                const { remote } = window.require('electron');
                if (remote && remote.getCurrentWindow) {
                  remote.getCurrentWindow().setMenuBarVisibility(false);
                }
              } catch (e) {}
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
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

  // Eliminar función cargarImpresoras y cualquier referencia a window.api.obtenerImpresoras o selectImpresora

  // Lógica para cargar y previsualizar el logo
  const logoInput = document.getElementById('logoInput');
  const logoPreview = document.getElementById('logoPreview');

  let logoTemp = null; // base64 temporal
  let logoTempName = null;
  let eliminarLogo = false;

  // Actualizar previsualización y mostrar/eliminar icono basurero
  async function mostrarLogoPreview(src) {
    logoPreview.innerHTML = '';
    if (src && typeof src === 'string' && src.trim() !== '') {
      const img = document.createElement('img');
      if (src.startsWith('data:image/')) {
        img.src = src;
      } else {
        img.src = await window.api.obtenerLogoPath(src) + '?v=' + Date.now();
      }
      img.alt = 'Logo';
      img.className = 'block mx-auto rounded shadow object-contain max-h-16 max-w-[120px] bg-white border border-gray-200 p-1';
      logoPreview.appendChild(img);
      // Botón basurero solo si hay logo
      const trash = document.createElement('i');
      trash.className = 'fas fa-trash text-red-500 cursor-pointer hover:text-red-700 ml-2';
      trash.title = 'Eliminar logo';
      trash.onclick = () => {
        logoTemp = null;
        logoTempName = null;
        eliminarLogo = true;
        mostrarLogoPreview(null);
      };
      logoPreview.appendChild(trash);
    }
  }

  logoInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      logoTemp = e.target.result;
      logoTempName = file.name;
      eliminarLogo = false;
      mostrarLogoPreview(logoTemp);
      // Forzar refresco de input para permitir cargar el mismo archivo dos veces seguidas
      logoInput.value = '';
    };
    reader.readAsDataURL(file);
  });

  // Modificar cargarConfiguracion para seleccionar la impresora guardada si existe
  async function cargarConfiguracion() {
    try {
      const resultado = await window.api.obtenerConfiguracionImpresora();
      if (resultado.success && resultado.data) {
        // Aplicar configuracion guardada
        if (resultado.data.tamanoEtiqueta) {
          document.getElementById('tamanoEtiqueta').value = resultado.data.tamanoEtiqueta;
        }
        // Eliminar función cargarImpresoras y cualquier referencia a window.api.obtenerImpresoras o selectImpresora
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

  // Mostrar logo guardado si existe y setear tamaño de etiqueta guardado
  const config = await window.api.obtenerConfiguracion();
  if (config) {
    if (config.logoPath) {
      logoTemp = null;
      logoTempName = null;
      eliminarLogo = false;
      mostrarLogoPreview(config.logoPath);
    }
    if (config.tamanoEtiqueta) {
      const selectTamano = document.getElementById('tamanoEtiqueta');
      selectTamano.value = config.tamanoEtiqueta;
    }
  }

  // Modal de confirmación
  const modalConfirmacion = document.getElementById('modalConfirmacion');
  const mensajeConfirmacion = document.getElementById('mensajeConfirmacion');
  const btnCerrarConfirmacion = document.getElementById('btnCerrarConfirmacion');

  function mostrarConfirmacion(mensaje, exito = true) {
    mensajeConfirmacion.textContent = mensaje;
    mensajeConfirmacion.className = exito
      ? 'text-green-700 text-lg font-semibold mb-4 text-center'
      : 'text-red-700 text-lg font-semibold mb-4 text-center';
    modalConfirmacion.classList.remove('hidden');
    modalConfirmacion.classList.add('flex');
  }

  function ocultarConfirmacion() {
    modalConfirmacion.classList.add('hidden');
    modalConfirmacion.classList.remove('flex');
  }

  btnCerrarConfirmacion.addEventListener('click', ocultarConfirmacion);
  modalConfirmacion.addEventListener('click', (e) => {
    if (e.target === modalConfirmacion) ocultarConfirmacion();
  });

  // Guardar configuración
  const btnGuardarConfig = document.getElementById('btnGuardarConfig');
  btnGuardarConfig.addEventListener('click', async () => {
    const tamanoEtiqueta = document.getElementById('tamanoEtiqueta').value;
    let logoPath = null;
    let resultado;
    if (eliminarLogo) {
      // Eliminar logo
      resultado = await window.api.guardarConfiguracion({ tamanoEtiqueta, eliminarLogo: true });
    } else if (logoTemp && logoTempName) {
      // Guardar logo nuevo
      resultado = await window.api.guardarConfiguracion({ tamanoEtiqueta, logo: { name: logoTempName, dataUrl: logoTemp } });
    } else {
      // Mantener logo actual
      const config = await window.api.obtenerConfiguracion();
      if (config && config.logoPath) {
        logoPath = config.logoPath;
      }
      resultado = await window.api.guardarConfiguracion({ tamanoEtiqueta, logoPath });
    }
    if (resultado && resultado.success) {
      mostrarToast('¡Configuración guardada correctamente!');
      // Reset flags
      eliminarLogo = false;
      logoTemp = null;
      logoTempName = null;
    } else {
      mostrarError('Error al guardar la configuración', false);
    }
  });

  // --- Vista previa de etiquetas a imprimir ---
  async function mostrarVistaPreviaEtiquetas() {
    const config = window._configCache || {};
    const logoPath = config.logoPath || null;
    const tamanoEtiqueta = document.getElementById('tamanoEtiqueta').value;
    const mostrarSinImp = typeof config.mostrarPrecioSinImpuestos === 'boolean' ? config.mostrarPrecioSinImpuestos : false;
    etiquetaPreview.innerHTML = '';
    if (etiquetasAImprimir.length === 0) {
      vistaPrevia.classList.add('hidden');
      return;
    }
    vistaPrevia.classList.remove('hidden');
    let sizeClass = '';
    let customClass = '';
    if (tamanoEtiqueta === 'pequena') {
      sizeClass = 'w-[189px] h-[113px]';
      customClass = 'etiqueta-pequena';
    } else if (tamanoEtiqueta === 'mediana') {
      sizeClass = 'w-[220px] h-[151px]';
      customClass = 'etiqueta-mediana';
    } else {
      sizeClass = 'w-[227px] h-[113px]';
      customClass = 'etiqueta-grande';
    }
    etiquetasAImprimir.forEach(async (producto, idx) => {
      const div = document.createElement('div');
      div.className = `relative overflow-hidden border border-gray-300 rounded p-0 flex flex-col  items-center justify-center bg-white m-[0.25mm] inline-flex ${sizeClass} ${customClass}`;
      // Logo centrado arriba
      if (logoPath) {
        const logo = document.createElement('img');
        logo.src = await window.api.obtenerLogoPath(logoPath) + '?v=' + Date.now();
        logo.className = 'block mx-auto h-8 w-auto max-w-[60%] object-contain etiqueta-logo';
        logo.alt = 'Logo';
        div.appendChild(logo);
      }
      // Nombre
      const nombre = document.createElement('div');
      nombre.className = 'text-xs font-bold text-center text-gray-800 line-clamp-1 overflow-hidden text-ellipsis etiqueta-nombre';
      nombre.textContent = producto.NOMBRE;
      div.appendChild(nombre);
      // Presentación
      const presentacion = document.createElement('div');
      presentacion.className = 'text-[10px] text-center text-gray-600 break-words etiqueta-presentacion';
      presentacion.textContent = `${producto.PRESENTACION || "-"}`;
      div.appendChild(presentacion);
      // Código y Fecha
      const codetroq = document.createElement('div');
      codetroq.className = 'flex justify-center items-center gap-4 text-[10px] mt-0 etiqueta-codetroq';
      codetroq.innerHTML = `
        <span class="text-blue-600 inline-block"><i class="fas fa-barcode mr-1"></i>${producto.CODIGO || 'Sin código'}</span>
        <span class="text-gray-600 inline-block"><i class="fas fa-calendar-alt mr-1"></i>${producto.FECHA || fechaActual()}</span>
      `;
      div.appendChild(codetroq);
      // Precios
      if (mostrarSinImp) {
        const preciosRow = document.createElement('div');
        preciosRow.className = 'flex flex-row justify-center items-end gap-5';
        // Precio sin impuestos
        const precioSinImp = document.createElement('div');
        precioSinImp.className = 'text-base font-bold text-blue-700 text-center etiqueta-precio';
        const valorSinImp = producto.PRECIO * 0.79;
        precioSinImp.innerHTML = `<div>${formatearPrecio(valorSinImp)}</div><div style="font-size:8px;">Precio sin imp. nac.</div>`;
        preciosRow.appendChild(precioSinImp);
        div.appendChild(preciosRow);
        // Precio normal
        const precio = document.createElement('div');
        precio.className = 'text-base font-bold text-green-700 text-center etiqueta-precio';
        precio.innerHTML = `<div>${formatearPrecio(producto.PRECIO)}</div><div style="font-size:8px;">Precio</div>`;
        preciosRow.appendChild(precio);
      } else {
        // Solo precio normal
        const precio = document.createElement('div');
        precio.className = 'text-base font-bold text-green-700 text-center etiqueta-precio';
        precio.innerHTML = `<div>${formatearPrecio(producto.PRECIO)}</div><div style="font-size:8px;">Precio</div>`;
        div.appendChild(precio);
      }
      // Botón basurero para eliminar etiqueta
      const trash = document.createElement('i');
      trash.className = 'fas fa-trash text-red-500 cursor-pointer hover:text-red-700 absolute top-2 right-2 print:hidden';
      trash.title = 'Eliminar esta etiqueta';
      trash.onclick = () => {
        eliminarDeImprimir(idx);
      };
      div.appendChild(trash);
      etiquetaPreview.appendChild(div);
    });
  }

  // --- Actualizar config cache y vista previa al cargar config o cambiar tamaño ---
  window._configCache = await window.api.obtenerConfiguracion();
  document.getElementById('tamanoEtiqueta').addEventListener('change', () => {
    window._configCache = window._configCache || {};
    window._configCache.tamanoEtiqueta = document.getElementById('tamanoEtiqueta').value;
    mostrarVistaPreviaEtiquetas();
  });

  // Modificar agregarAImprimir y eliminarDeImprimir para actualizar la vista previa
  function agregarAImprimir(producto) {
    etiquetasAImprimir.push(producto);
    mostrarListaEtiquetas();
    mostrarVistaPreviaEtiquetas();
  }
  function eliminarDeImprimir(idx) {
    etiquetasAImprimir.splice(idx, 1);
    mostrarListaEtiquetas();
    mostrarVistaPreviaEtiquetas();
  }
  // Llamar a mostrarVistaPreviaEtiquetas al inicio por si hay etiquetas
  mostrarVistaPreviaEtiquetas();

  // Al cargar la config, setear el checkbox
  if (config) {
    if (config.logoPath) {
      logoTemp = null;
      logoTempName = null;
      eliminarLogo = false;
      mostrarLogoPreview(config.logoPath);
    }
    if (config.tamanoEtiqueta) {
      const selectTamano = document.getElementById('tamanoEtiqueta');
      selectTamano.value = config.tamanoEtiqueta;
    }
  }

  // Al guardar configuración, guardar el valor del checkbox
  btnGuardarConfig.addEventListener('click', async () => {
    const tamanoEtiqueta = document.getElementById('tamanoEtiqueta').value;
    const mostrarPrecioSinImpuestos = document.getElementById('mostrarPrecioSinImpuestos').checked;
    let logoPath = null;
    let resultado;
    if (eliminarLogo) {
      resultado = await window.api.guardarConfiguracion({ tamanoEtiqueta, mostrarPrecioSinImpuestos, eliminarLogo: true });
    } else if (logoTemp && logoTempName) {
      resultado = await window.api.guardarConfiguracion({ tamanoEtiqueta, mostrarPrecioSinImpuestos, logo: { name: logoTempName, dataUrl: logoTemp } });
    } else {
      const config = await window.api.obtenerConfiguracion();
      if (config && config.logoPath) {
        logoPath = config.logoPath;
      }
      resultado = await window.api.guardarConfiguracion({ tamanoEtiqueta, mostrarPrecioSinImpuestos, logoPath });
    }
    if (resultado && resultado.success) {
      mostrarToast('¡Configuración guardada correctamente!');
      eliminarLogo = false;
      logoTemp = null;
      logoTempName = null;
      // Actualizar cache y vista previa
      window._configCache = await window.api.obtenerConfiguracion();
      mostrarLogoPreview(window._configCache.logoPath || null);
      mostrarVistaPreviaEtiquetas();
    } else {
      mostrarError('Error al guardar la configuración', false);
    }
  });

  // Actualizar vista previa si se cambia el checkbox
  document.getElementById('mostrarPrecioSinImpuestos').addEventListener('change', () => {
    window._configCache = window._configCache || {};
    window._configCache.mostrarPrecioSinImpuestos = document.getElementById('mostrarPrecioSinImpuestos').checked;
    mostrarVistaPreviaEtiquetas();
  });

  // Al cargar la config, setear el checkbox y actualizar la vista previa
  async function cargarConfigYActualizarUI() {
    const config = await window.api.obtenerConfiguracion();
    window._configCache = config || {};
    if (config) {
      if (config.logoPath) {
        logoTemp = null;
        logoTempName = null;
        eliminarLogo = false;
        mostrarLogoPreview(config.logoPath);
      }
      if (config.tamanoEtiqueta) {
        const selectTamano = document.getElementById('tamanoEtiqueta');
        selectTamano.value = config.tamanoEtiqueta;
      }
      if (typeof config.mostrarPrecioSinImpuestos === 'boolean') {
        document.getElementById('mostrarPrecioSinImpuestos').checked = config.mostrarPrecioSinImpuestos;
      } else {
        document.getElementById('mostrarPrecioSinImpuestos').checked = false;
      }
      mostrarVistaPreviaEtiquetas();
    }
  }

  // Llamar al cargar la app
  await cargarConfigYActualizarUI();

  // --- ESTANTERÍAS ---
  let estanteriaActual = null; // { nombre, etiquetas }

  // Elementos
  const btnGuardarEstanteria = document.getElementById('btnGuardarEstanteria');
  const btnCargarEstanteria = document.getElementById('btnCargarEstanteria');
  const btnActualizarPrecios = document.getElementById('btnActualizarPrecios');
  const modalGuardarEstanteria = document.getElementById('modalGuardarEstanteria');
  const inputNombreEstanteria = document.getElementById('inputNombreEstanteria');
  const btnCancelarGuardarEstanteria = document.getElementById('btnCancelarGuardarEstanteria');
  const btnConfirmarGuardarEstanteria = document.getElementById('btnConfirmarGuardarEstanteria');
  const modalCargarEstanteria = document.getElementById('modalCargarEstanteria');
  const selectEstanteria = document.getElementById('selectEstanteria');
  const btnCancelarCargarEstanteria = document.getElementById('btnCancelarCargarEstanteria');
  const btnConfirmarCargarEstanteria = document.getElementById('btnConfirmarCargarEstanteria');
  const btnNuevaEstanteria = document.getElementById('btnNuevaEstanteria');

  // Mostrar/ocultar modales
  function mostrarModalGuardarEstanteria() {
    inputNombreEstanteria.value = '';
    modalGuardarEstanteria.classList.remove('hidden');
    modalGuardarEstanteria.classList.add('flex');
    inputNombreEstanteria.focus();
  }
  function ocultarModalGuardarEstanteria() {
    modalGuardarEstanteria.classList.add('hidden');
    modalGuardarEstanteria.classList.remove('flex');
  }
  function mostrarModalCargarEstanteria() {
    modalCargarEstanteria.classList.remove('hidden');
    modalCargarEstanteria.classList.add('flex');
  }
  function ocultarModalCargarEstanteria() {
    modalCargarEstanteria.classList.add('hidden');
    modalCargarEstanteria.classList.remove('flex');
  }

  // Guardar estantería
  btnGuardarEstanteria.addEventListener('click', async () => {
    if (etiquetasAImprimir.length === 0) {
      mostrarError('No hay etiquetas para guardar');
      return;
    }
    if (estanteriaActual && estanteriaActual.nombre) {
      // Guardar directo
      const etiquetas = etiquetasAImprimir.map(e => ({ ...e }));
      const res = await window.api.guardarEstanteria({ nombre: estanteriaActual.nombre, etiquetas });
      if (res && res.success) {
        mostrarToast('¡Estantería actualizada correctamente!');
        estanteriaActual.etiquetas = etiquetas;
        btnActualizarPrecios.classList.remove('hidden');
      } else {
        mostrarError('Error al guardar la estantería');
      }
    } else {
      mostrarModalGuardarEstanteria();
    }
  });
  btnCancelarGuardarEstanteria.addEventListener('click', ocultarModalGuardarEstanteria);
  btnConfirmarGuardarEstanteria.addEventListener('click', async () => {
    const nombre = inputNombreEstanteria.value.trim();
    if (!nombre) {
      inputNombreEstanteria.focus();
      return;
    }
    const etiquetas = etiquetasAImprimir.map(e => ({ ...e }));
    const res = await window.api.guardarEstanteria({ nombre, etiquetas });
    if (res && res.success) {
      mostrarToast('¡Estantería guardada correctamente!');
      estanteriaActual = { nombre, etiquetas };
      btnActualizarPrecios.classList.remove('hidden');
    } else {
      mostrarError('Error al guardar la estantería');
    }
    ocultarModalGuardarEstanteria();
  });

  // Cargar estantería
  btnCargarEstanteria.addEventListener('click', async () => {
    const estanterias = await window.api.cargarEstanterias();
    selectEstanteria.innerHTML = '';
    if (!estanterias || estanterias.length === 0) {
      mostrarError('No hay estanterías guardadas');
      return;
    }
    estanterias.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.nombre;
      opt.textContent = e.nombre;
      selectEstanteria.appendChild(opt);
    });
    // Seleccionar por defecto la estantería actual si existe
    if (estanteriaActual && estanteriaActual.nombre) {
      selectEstanteria.value = estanteriaActual.nombre;
    }
    mostrarModalCargarEstanteria();
  });
  btnCancelarCargarEstanteria.addEventListener('click', ocultarModalCargarEstanteria);
  btnConfirmarCargarEstanteria.addEventListener('click', async () => {
    const nombre = selectEstanteria.value;
    const estanterias = await window.api.cargarEstanterias();
    const est = estanterias.find(e => e.nombre === nombre);
    if (est) {
      etiquetasAImprimir = est.etiquetas.map(e => ({ ...e }));
      estanteriaActual = { nombre: est.nombre, etiquetas: etiquetasAImprimir };
      mostrarListaEtiquetas();
      mostrarVistaPreviaEtiquetas();
      btnActualizarPrecios.classList.remove('hidden');
      mostrarToast('Estantería cargada');
    } else {
      mostrarError('No se encontró la estantería seleccionada');
    }
    ocultarModalCargarEstanteria();
  });

  // Actualizar precios
  btnActualizarPrecios.addEventListener('click', async () => {
    if (!etiquetasAImprimir.length) return;
    btnActualizarPrecios.disabled = true;
    btnActualizarPrecios.innerHTML = '<i class="fas fa-sync-alt fa-spin mr-2"></i>Cargando...';
    try {
      const actualizadas = await window.api.actualizarPreciosEstanteria(etiquetasAImprimir);
      etiquetasAImprimir = actualizadas;
      if (estanteriaActual) estanteriaActual.etiquetas = actualizadas;
      mostrarListaEtiquetas();
      mostrarVistaPreviaEtiquetas();
      mostrarToast('Precios actualizados');
    } catch (e) {
      mostrarError('Error al actualizar precios');
    }
    btnActualizarPrecios.disabled = false;
    btnActualizarPrecios.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Act. precios';
  });

  // Ocultar botón actualizar precios si no hay estantería cargada
  function actualizarBotonActualizarPrecios() {
    if (etiquetasAImprimir.length > 0 && estanteriaActual) {
      btnActualizarPrecios.classList.remove('hidden');
    } else {
      btnActualizarPrecios.classList.add('hidden');
    }
  }
  // --- Habilitar/deshabilitar botón Guardar Estantería según la cantidad de etiquetas ---
  function actualizarBotonGuardarEstanteria() {
    if (etiquetasAImprimir.length > 0) {
      btnGuardarEstanteria.disabled = false;
    } else {
      btnGuardarEstanteria.disabled = true;
    }
  }
  // Llamar cada vez que cambia la lista
  const _oldMostrarListaEtiquetas2 = mostrarListaEtiquetas;
  mostrarListaEtiquetas = function () {
    _oldMostrarListaEtiquetas2();
    actualizarBotonActualizarPrecios();
    actualizarBotonGuardarEstanteria();
  };
  // Llamar al inicio
  actualizarBotonGuardarEstanteria();

  // --- Editar y eliminar estantería en el modal ---
  const btnEditarNombreEstanteria = document.getElementById('btnEditarNombreEstanteria');
  const btnEliminarEstanteria = document.getElementById('btnEliminarEstanteria');
  const editarNombreEstanteriaContainer = document.getElementById('editarNombreEstanteriaContainer');
  const inputNuevoNombreEstanteria = document.getElementById('inputNuevoNombreEstanteria');
  const btnCancelarEditarNombreEstanteria = document.getElementById('btnCancelarEditarNombreEstanteria');
  const btnConfirmarEditarNombreEstanteria = document.getElementById('btnConfirmarEditarNombreEstanteria');

  let nombreEstanteriaAEditar = null;

  btnEditarNombreEstanteria.addEventListener('click', () => {
    nombreEstanteriaAEditar = selectEstanteria.value;
    inputNuevoNombreEstanteria.value = nombreEstanteriaAEditar;
    editarNombreEstanteriaContainer.classList.remove('hidden');
    inputNuevoNombreEstanteria.focus();
  });
  btnCancelarEditarNombreEstanteria.addEventListener('click', () => {
    editarNombreEstanteriaContainer.classList.add('hidden');
    nombreEstanteriaAEditar = null;
  });
  btnConfirmarEditarNombreEstanteria.addEventListener('click', async () => {
    const nombreNuevo = inputNuevoNombreEstanteria.value.trim();
    if (!nombreNuevo || nombreNuevo === nombreEstanteriaAEditar) return;
    const res = await window.api.renombrarEstanteria({ nombreViejo: nombreEstanteriaAEditar, nombreNuevo });
    if (res && res.success) {
      mostrarToast('Nombre actualizado');
      // Actualizar selector
      const estanterias = await window.api.cargarEstanterias();
      selectEstanteria.innerHTML = '';
      estanterias.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.nombre;
        opt.textContent = e.nombre;
        selectEstanteria.appendChild(opt);
      });
      selectEstanteria.value = nombreNuevo;
    } else {
      mostrarError(res.error || 'Error al renombrar');
    }
    editarNombreEstanteriaContainer.classList.add('hidden');
    nombreEstanteriaAEditar = null;
  });

  // --- Modal de confirmación para eliminar estantería ---
  const modalConfirmarEliminarEstanteria = document.getElementById('modalConfirmarEliminarEstanteria');
  const mensajeEliminarEstanteria = document.getElementById('mensajeEliminarEstanteria');
  const btnCancelarEliminarEstanteria = document.getElementById('btnCancelarEliminarEstanteria');
  const btnConfirmarEliminarEstanteria = document.getElementById('btnConfirmarEliminarEstanteria');
  let nombreEstanteriaAEliminar = null;
  let modalAnteriorActivo = null;

  function mostrarModalConfirmarEliminar(nombre) {
    nombreEstanteriaAEliminar = nombre;
    mensajeEliminarEstanteria.textContent = `¿Seguro que deseas eliminar la estantería "${nombre}"?`;
    // Guardar cuál modal estaba activo
    if (!modalConfirmarEliminarEstanteria.classList.contains('flex')) {
      if (editarNombreEstanteriaContainer && !editarNombreEstanteriaContainer.classList.contains('hidden')) {
        modalAnteriorActivo = editarNombreEstanteriaContainer;
        editarNombreEstanteriaContainer.classList.add('hidden');
      } else if (modalCargarEstanteria && modalCargarEstanteria.classList.contains('flex')) {
        modalAnteriorActivo = modalCargarEstanteria;
        modalCargarEstanteria.classList.remove('flex');
        modalCargarEstanteria.classList.add('hidden');
      } else {
        modalAnteriorActivo = null;
      }
    }
    modalConfirmarEliminarEstanteria.classList.remove('hidden');
    modalConfirmarEliminarEstanteria.classList.add('flex');
    modalConfirmarEliminarEstanteria.style.zIndex = 1000;
  }
  function ocultarModalConfirmarEliminar() {
    modalConfirmarEliminarEstanteria.classList.add('hidden');
    modalConfirmarEliminarEstanteria.classList.remove('flex');
    modalConfirmarEliminarEstanteria.style.zIndex = 60;
    // Restaurar el modal anterior si corresponde
    if (modalAnteriorActivo) {
      modalAnteriorActivo.classList.remove('hidden');
      if (modalAnteriorActivo !== editarNombreEstanteriaContainer) {
        modalAnteriorActivo.classList.add('flex');
      }
      modalAnteriorActivo = null;
    }
  }
  btnCancelarEliminarEstanteria.addEventListener('click', ocultarModalConfirmarEliminar);
  btnConfirmarEliminarEstanteria.addEventListener('click', async () => {
    if (!nombreEstanteriaAEliminar) return;
    const res = await window.api.eliminarEstanteria(nombreEstanteriaAEliminar);
    if (res && res.success) {
      mostrarToast('Estantería eliminada');
      // Actualizar selector
      const estanterias = await window.api.cargarEstanterias();
      selectEstanteria.innerHTML = '';
      estanterias.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.nombre;
        opt.textContent = e.nombre;
        selectEstanteria.appendChild(opt);
      });
      if (estanterias.length === 0) ocultarModalCargarEstanteria();
    } else {
      mostrarError('Error al eliminar la estantería');
    }
    ocultarModalConfirmarEliminar();
  });

  // Modificar el botón Eliminar para usar el modal
  btnEliminarEstanteria.addEventListener('click', () => {
    const nombre = selectEstanteria.value;
    mostrarModalConfirmarEliminar(nombre);
  });

  // Eliminar listeners duplicados para btnGuardarEstanteria
  // Primero, quitar todos los listeners previos (si los hay)
  // (No se puede quitar listeners anónimos, así que asegúrate de tener solo uno aquí)
  // Deja solo el siguiente listener:
  btnGuardarEstanteria.addEventListener('click', async () => {
    if (etiquetasAImprimir.length === 0) {
      mostrarError('No hay etiquetas para guardar');
      return;
    }
    if (estanteriaActual && estanteriaActual.nombre) {
      // Guardar directo
      const etiquetas = etiquetasAImprimir.map(e => ({ ...e }));
      const res = await window.api.guardarEstanteria({ nombre: estanteriaActual.nombre, etiquetas });
      if (res && res.success) {
        mostrarToast('¡Estantería actualizada correctamente!');
        estanteriaActual.etiquetas = etiquetas;
        btnActualizarPrecios.classList.remove('hidden');
      } else {
        mostrarError('Error al guardar la estantería');
      }
    } else {
      mostrarModalGuardarEstanteria();
    }
  });

  // Event Listener para el botón 'Nueva estantería'
  btnNuevaEstanteria.addEventListener('click', () => {
    estanteriaActual = null;
    mostrarToast('Ahora puedes guardar una nueva estantería con las etiquetas actuales.');
    actualizarBotonActualizarPrecios();
  });
});

// Helper para fecha actual
function fechaActual() {
  const hoy = new Date();
  return hoy.toLocaleDateString('es-AR');
}

// --- Toast de notificación ---
const toastNotificacion = document.getElementById('toastNotificacion');
let toastTimeout = null;
function mostrarToast(mensaje, color = 'bg-green-600') {
  toastNotificacion.textContent = mensaje;
  toastNotificacion.className = `fixed top-6 right-6 z-[2000] text-white px-6 py-3 rounded shadow-lg opacity-75 pointer-events-auto transition-opacity duration-300 ${color}`;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastNotificacion.classList.add('opacity-0');
    toastNotificacion.classList.remove('opacity-75');
  }, 2000);
}
