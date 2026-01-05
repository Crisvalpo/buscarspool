// ID del archivo en Google Drive
const GOOGLE_DRIVE_FILE_ID = '15aaP6oO3MnEcJohJ3ENIpVoqzroYxlhy';

// Múltiples estrategias de URLs de Google Drive (se probarán en orden)
const GOOGLE_DRIVE_URLS = [
    `https://docs.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}`,
    `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}&confirm=t`,
    `https://www.googleapis.com/drive/v3/files/${GOOGLE_DRIVE_FILE_ID}?alt=media&key=AIzaSyDummy`, // Fallback
    `https://drive.usercontent.google.com/download?id=${GOOGLE_DRIVE_FILE_ID}&export=download&confirm=t`
];

// Proxies CORS como fallback (se usarán con cada URL de Google Drive)
const CORS_PROXIES = [
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
];

document.addEventListener('DOMContentLoaded', () => {
    const idInput = document.getElementById('id-input');
    const spoolInput = document.getElementById('spool-input');
    const idSuggestions = document.getElementById('id-suggestions');
    const spoolSuggestions = document.getElementById('spool-suggestions');
    const resultsContainer = document.getElementById('results-container');
    const loader = document.getElementById('loader');
    const clearButton = document.getElementById('clear-search');

    let spoolsData = [];
    let filteredIds = [];
    let filteredSpools = [];

    /**
     * Convierte URLs de Google Drive a diferentes formatos según el tipo
     */
    function processGoogleDriveUrl(url, type = 'image') {
        if (!url) return { viewUrl: '', downloadUrl: '', isValid: false };

        // Extraer el ID del archivo
        let fileId = null;

        // Diferentes patrones de URL de Google Drive
        const patterns = [
            /\/file\/d\/([a-zA-Z0-9_-]+)/,
            /[?&]id=([a-zA-Z0-9_-]+)/,
            /\/d\/([a-zA-Z0-9_-]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                fileId = match[1];
                break;
            }
        }

        if (!fileId) {
            return { viewUrl: url, downloadUrl: url, isValid: false };
        }

        // URLs para diferentes propósitos
        const viewUrl = `https://lh3.googleusercontent.com/d/${fileId}=s1000`; // Para imágenes
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`; // Para descargar
        const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`; // Para preview

        return {
            viewUrl,
            downloadUrl,
            embedUrl,
            fileId,
            isValid: true
        };
    }

    /**
     * Abre imagen en modal/nueva ventana
     */
    function openImageModal(imageUrl, title) {
        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="this.closest('.image-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <img src="${imageUrl}" alt="${title}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Prevenir scroll del body cuando el modal está abierto
        document.body.style.overflow = 'hidden';

        // Remover modal al hacer click fuera o ESC
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.className === 'modal-backdrop') {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });

        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.body.style.overflow = 'auto';
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    /**
     * Carga los datos usando múltiples estrategias de Google Drive
     */
    async function fetchData() {
        loader.style.display = 'block';
        resultsContainer.style.display = 'none';

        const timestamp = new Date().getTime();
        let attemptNumber = 0;
        const allErrors = [];

        // ESTRATEGIA 1: Probar todas las URLs de Google Drive SIN proxy
        console.log('� ESTRATEGIA 1: Intentando acceso directo a Google Drive...');
        for (let i = 0; i < GOOGLE_DRIVE_URLS.length; i++) {
            try {
                attemptNumber++;
                const url = `${GOOGLE_DRIVE_URLS[i]}&t=${timestamp}`;
                console.log(`🔄 Intento ${attemptNumber} - URL directa ${i + 1}/${GOOGLE_DRIVE_URLS.length}`);

                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json',
                    },
                    signal: AbortSignal.timeout(10000)
                });

                if (response.ok) {
                    const data = await response.json();

                    if (Array.isArray(data) && data.length > 0) {
                        spoolsData = data;
                        initializeSearchInputs();
                        console.log(`✅ Éxito con URL directa ${i + 1}`);
                        console.log(`📊 ${spoolsData.length} registros cargados`);
                        return;
                    }
                }
            } catch (error) {
                allErrors.push(`URL ${i + 1} directo: ${error.message}`);
                console.warn(`❌ URL ${i + 1} directo falló:`, error.message);
            }
        }

        // ESTRATEGIA 2: Probar combinaciones de URLs de Google Drive CON proxies CORS
        console.log('🚀 ESTRATEGIA 2: Intentando con proxies CORS...');
        for (let urlIndex = 0; urlIndex < GOOGLE_DRIVE_URLS.length; urlIndex++) {
            for (let proxyIndex = 0; proxyIndex < CORS_PROXIES.length; proxyIndex++) {
                try {
                    attemptNumber++;
                    const baseUrl = `${GOOGLE_DRIVE_URLS[urlIndex]}&t=${timestamp}`;
                    const proxyUrl = CORS_PROXIES[proxyIndex] + encodeURIComponent(baseUrl);

                    console.log(`🔄 Intento ${attemptNumber} - URL ${urlIndex + 1} + Proxy ${proxyIndex + 1}`);

                    const response = await fetch(proxyUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        },
                        signal: AbortSignal.timeout(15000)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const responseText = await response.text();
                    let data;

                    try {
                        data = JSON.parse(responseText);
                    } catch (parseError) {
                        throw new Error('Respuesta no es JSON válido');
                    }

                    if (!Array.isArray(data) || data.length === 0) {
                        throw new Error('Datos vacíos o formato incorrecto');
                    }

                    spoolsData = data;
                    initializeSearchInputs();
                    console.log(`✅ Éxito con URL ${urlIndex + 1} + Proxy ${proxyIndex + 1}`);
                    console.log(`📊 ${spoolsData.length} registros cargados`);
                    return;

                } catch (error) {
                    allErrors.push(`URL ${urlIndex + 1} + Proxy ${proxyIndex + 1}: ${error.message}`);
                    console.warn(`❌ URL ${urlIndex + 1} + Proxy ${proxyIndex + 1} falló:`, error.message);
                }
            }
        }

        // Si llegamos aquí, todos los intentos fallaron
        console.error('❌ TODOS LOS INTENTOS FALLARON');
        console.error('Errores:', allErrors);
        showError(`Todos los métodos fallaron después de ${attemptNumber} intentos. 
                    El archivo de Google Drive puede estar privado o Google está bloqueando el acceso.
                    <br><br><strong>Último error:</strong> ${allErrors[allErrors.length - 1]}`);
    }

    /**
     * Inicializa los inputs de búsqueda
     */
    function initializeSearchInputs() {
        if (!Array.isArray(spoolsData) || spoolsData.length === 0) {
            showError('No hay datos disponibles');
            return;
        }

        console.log('🔍 Inicializando búsqueda con', spoolsData.length, 'registros');

        // Limpiar los inputs
        clearInputs();

        // Mostrar mensaje de éxito temporal
        showSuccessMessage(`✅ ${spoolsData.length} registros cargados. ¡Puedes empezar a buscar!`);
    }

    /**
     * Muestra mensaje de éxito temporal
     */
    function showSuccessMessage(message) {
        resultsContainer.innerHTML = `
            <div style="color: green; text-align: center; padding: 1rem; margin: 1rem 0; border: 2px solid green; border-radius: 6px; background: linear-gradient(135deg, #d4edda, #c3e6cb); animation: fadeIn 0.5s;">
                <strong>${message}</strong>
            </div>
        `;
        resultsContainer.style.display = 'block';

        setTimeout(() => {
            resultsContainer.style.display = 'none';
        }, 3000);
    }

    /**
     * Limpia todos los inputs y sugerencias
     */
    function clearInputs() {
        idInput.value = '';
        spoolInput.value = '';
        idSuggestions.style.display = 'none';
        spoolSuggestions.style.display = 'none';
        resultsContainer.style.display = 'none';
    }

    /**
     * Filtra y muestra sugerencias para IDs
     */
    function filterIds(query) {
        if (!query || query.length < 1) {
            idSuggestions.style.display = 'none';
            return;
        }

        filteredIds = spoolsData.filter(item =>
            item.ID_Item && item.ID_Item.toString().toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8); // Menos sugerencias en móvil

        if (filteredIds.length > 0) {
            idSuggestions.innerHTML = filteredIds.map(item =>
                `<div class="suggestion-item" data-id="${item.ID_Item}">
                    <div>
                        <strong>${item.ID_Item}</strong><br>
                        <small>${item.Spool || 'Sin spool'}</small>
                    </div>
                </div>`
            ).join('');
            idSuggestions.style.display = 'block';
        } else {
            idSuggestions.innerHTML = '<div class="suggestion-item no-results">❌ No hay coincidencias</div>';
            idSuggestions.style.display = 'block';
        }
    }

    /**
     * Filtra y muestra sugerencias para Spools
     */
    function filterSpools(query) {
        if (!query || query.length < 1) {
            spoolSuggestions.style.display = 'none';
            return;
        }

        filteredSpools = spoolsData.filter(item =>
            item.Spool && item.Spool.toString().toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8); // Menos sugerencias en móvil

        if (filteredSpools.length > 0) {
            spoolSuggestions.innerHTML = filteredSpools.map(item =>
                `<div class="suggestion-item" data-id="${item.ID_Item}">
                    <div>
                        <strong>${item.Spool}</strong><br>
                        <small>ID: ${item.ID_Item}</small>
                    </div>
                </div>`
            ).join('');
            spoolSuggestions.style.display = 'block';
        } else {
            spoolSuggestions.innerHTML = '<div class="suggestion-item no-results">❌ No hay coincidencias</div>';
            spoolSuggestions.style.display = 'block';
        }
    }

    /**
     * Muestra el resultado seleccionado
     */
    function displayResult(selectedId) {
        if (!selectedId) {
            resultsContainer.style.display = 'none';
            return;
        }

        const selectedItem = spoolsData.find(item => item.ID_Item.toString() === selectedId.toString());

        if (selectedItem) {
            console.log('📋 Mostrando item:', selectedItem);

            // Procesar URLs para imagen principal y imagen origen
            const fotoInfo = processGoogleDriveUrl(selectedItem.Foto_URL, 'image');
            const fotoOrigenInfo = processGoogleDriveUrl(selectedItem.Foto_URL_Origen, 'image');
            const planoInfo = processGoogleDriveUrl(selectedItem.Plano_URL, 'pdf');

            console.log('🖼️ Info foto:', fotoInfo);
            console.log('🖼️ Info foto origen:', fotoOrigenInfo);
            console.log('📄 Info plano:', planoInfo);

            // HTML para la foto principal (clickable si hay imagen origen)
            let fotoHtml = '';
            if (fotoInfo.isValid) {
                const clickableClass = fotoOrigenInfo.isValid ? 'clickable-image' : '';
                const clickHandler = fotoOrigenInfo.isValid ?
                    `onclick="openImageModal('${fotoOrigenInfo.viewUrl}', 'Imagen Original - ${selectedItem.Spool || 'Spool'}')"` : '';
                const clickHint = fotoOrigenInfo.isValid ?
                    '<div class="click-hint">🔍 Click para ver imagen original</div>' : '';

                fotoHtml = `
                    <div class="image-wrapper">
                        <img src="${fotoInfo.viewUrl}" 
                             alt="Foto del Spool ${selectedItem.Spool}" 
                             class="${clickableClass}"
                             ${clickHandler}
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div class="error-message" style="display: none;">
                            📷 Imagen no disponible<br>
                            <small>Puede que el archivo no sea público</small>
                        </div>
                        ${clickHint}
                    </div>
                `;
            } else {
                fotoHtml = `<div class="error-message">📷 URL de imagen no válida</div>`;
            }

            // HTML para el plano (botón de descarga)
            const planoHtml = planoInfo.isValid ?
                `<div class="plan-actions">
                     <a href="${planoInfo.downloadUrl}" class="btn-download" target="_blank" rel="noopener">
                         📥 Descargar PDF
                     </a>
                     <small style="color: var(--secondary-color); text-align: center; margin-top: 0.5rem;">
                         Se abrirá en una nueva ventana
                     </small>
                 </div>` :
                `<div class="error-message">📄 No hay plano disponible</div>`;

            // Procesar status - mostrar exactamente lo que viene en el JSON sin estilos
            const rawStatus = selectedItem.Status || 'Sin estado';
            const displayStatus = rawStatus.toString().trim();

            resultsContainer.innerHTML = `
                <div class="result-card">
                    <div class="result-photo">
                        ${fotoHtml}
                    </div>
                    <div class="result-details">
                        <h2>${selectedItem.Spool || 'Sin identificar'}</h2>
                        <div class="detail-item">
                            <strong>📊 Status:</strong>
                            <span class="status-text">${displayStatus}</span>
                        </div>
                        <div class="detail-item">
                            <strong>📍 Ubicación:</strong>
                            <span>${selectedItem.Ubicacion || 'No especificada'}</span>
                        </div>
                        <div class="detail-item">
                            <strong>🔢 TAG GESTION:</strong>
                            <span>${selectedItem.ID_Item}</span>
                        </div>
                    </div>
                </div>
                <div class="plan-viewer">
                    <h3>📋 Revisión Actual - ${selectedItem['REVISION ACTUAL'] || 'No especificada'}</h3>
                    ${planoHtml}
                </div>
            `;

            resultsContainer.style.display = 'block';

            // Hacer disponible la función openImageModal globalmente para este contexto
            window.openImageModal = openImageModal;

            // Scroll suave al resultado en móviles
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    resultsContainer.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 100);
            }

        } else {
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <h3>❌ Item no encontrado</h3>
                    <p>No se pudo encontrar el item con ID: ${selectedId}</p>
                </div>
            `;
            resultsContainer.style.display = 'block';
        }
    }

    /**
     * Muestra mensaje de error
     */
    function showError(errorMessage) {
        resultsContainer.innerHTML = `
            <div style="color: red; padding: 1rem; border: 2px solid red; border-radius: 6px; background-color: #fff5f5; margin: 1rem 0;">
                <h3>❌ Error</h3>
                <p><strong>Mensaje:</strong> ${errorMessage}</p>
                
                <details style="margin-top: 1rem;">
                    <summary style="cursor: pointer; font-weight: bold;">🔍 Información técnica</summary>
                    <div style="margin-top: 0.5rem; font-size: 0.9em;">
                        <p><strong>URL original:</strong> ${JSON_URL_ORIGINAL}</p>
                        <p><strong>Proxies probados:</strong></p>
                        <ul>
                            ${CORS_PROXIES.map((proxy, i) => `<li>Proxy ${i + 1}: ${proxy}</li>`).join('')}
                        </ul>
                    </div>
                </details>
                
                <div style="margin-top: 1rem; text-align: center;">
                    <button onclick="location.reload()" 
                            style="margin: 0.5rem; padding: 0.8rem 1.5rem; background: #007BFF; color: white; border: none; border-radius: 4px; cursor: pointer; min-height: 44px;">
                        🔄 Intentar de nuevo
                    </button>
                    <br>
                    <a href="${JSON_URL_ORIGINAL}" target="_blank"
                       style="display: inline-block; margin: 0.5rem; padding: 0.8rem 1.5rem; background: #6c757d; color: white; text-decoration: none; border-radius: 4px; min-height: 44px;">
                        🔗 Ver archivo JSON
                    </a>
                </div>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }

    // Event Listeners optimizados para móvil
    let searchTimeout;

    idInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        spoolInput.value = '';
        spoolSuggestions.style.display = 'none';

        searchTimeout = setTimeout(() => {
            filterIds(e.target.value);
        }, 300); // Debounce para mejor performance

        if (!e.target.value) {
            resultsContainer.style.display = 'none';
        }
    });

    spoolInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        idInput.value = '';
        idSuggestions.style.display = 'none';

        searchTimeout = setTimeout(() => {
            filterSpools(e.target.value);
        }, 300); // Debounce para mejor performance

        if (!e.target.value) {
            resultsContainer.style.display = 'none';
        }
    });

    // Prevenir zoom en iOS cuando se hace focus en input
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        idInput.addEventListener('focus', preventZoom);
        spoolInput.addEventListener('focus', preventZoom);

        function preventZoom() {
            document.querySelector('meta[name=viewport]').setAttribute(
                'content',
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
            );
        }
    }

    // Click en sugerencias con mejor manejo táctil
    document.addEventListener('click', (e) => {
        if (e.target.closest('.suggestion-item') && e.target.closest('.suggestion-item').dataset.id) {
            const selectedId = e.target.closest('.suggestion-item').dataset.id;
            displayResult(selectedId);

            // Ocultar sugerencias
            idSuggestions.style.display = 'none';
            spoolSuggestions.style.display = 'none';

            // Actualizar el input correspondiente
            if (e.target.closest('#id-suggestions')) {
                idInput.value = selectedId;
            } else if (e.target.closest('#spool-suggestions')) {
                const item = spoolsData.find(item => item.ID_Item.toString() === selectedId);
                spoolInput.value = item ? item.Spool : selectedId;
            }
        } else if (!e.target.closest('.search-controls')) {
            // Ocultar sugerencias si se hace click fuera
            idSuggestions.style.display = 'none';
            spoolSuggestions.style.display = 'none';
        }
    });

    // Botón limpiar
    clearButton.addEventListener('click', () => {
        clearInputs();
        showSuccessMessage('🗑️ Búsqueda limpiada. Puedes buscar de nuevo.');
    });

    // Manejo de teclado virtual en móviles
    let initialViewportHeight = window.innerHeight;

    window.addEventListener('resize', () => {
        // Detectar si el teclado virtual está abierto
        const currentHeight = window.innerHeight;
        const keyboardOpen = currentHeight < initialViewportHeight * 0.8;

        if (keyboardOpen) {
            document.body.style.height = `${currentHeight}px`;
            // Reducir altura de sugerencias cuando el teclado está abierto
            document.documentElement.style.setProperty('--suggestion-max-height', '30vh');
        } else {
            document.body.style.height = 'auto';
            document.documentElement.style.setProperty('--suggestion-max-height', '60vh');
        }
    });

    // Prevenir scroll del body cuando se scrollea en sugerencias
    idSuggestions.addEventListener('touchmove', (e) => {
        e.stopPropagation();
    }, { passive: true });

    spoolSuggestions.addEventListener('touchmove', (e) => {
        e.stopPropagation();
    }, { passive: true });

    // Carga inicial de datos
    fetchData().finally(() => {
        loader.style.display = 'none';
    });
});