// ------------------------------------------------------------------------------------------
// CONFIGURACIÓN ACTUALIZADA - ¡NUEVA URL DE IMPLEMENTACIÓN!
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznfAPDO0vy45qmDeD7od-3SOqnspC_dquWSwG_CfxXC-j0lZzSG-dxhB_5qZK2O_j5QQ/exec';
const ADMIN_PASSWORD = 'Narkis2025'; // Cambia esta contraseña si es necesario
// ------------------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const updateButton = document.getElementById('force-update-btn');
    const testButton = document.getElementById('test-connection-btn');
    const debugButton = document.getElementById('debug-btn');
    const passwordInput = document.getElementById('password');
    const feedbackMessage = document.getElementById('feedback-message');

    // Función para mostrar feedback
    function displayFeedback(message, type) {
        feedbackMessage.innerHTML = type === 'loading' ? 
            `<span style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #007BFF; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;"></span>${message}` : 
            message;
        
        feedbackMessage.style.display = 'block';
        feedbackMessage.style.padding = '15px';
        feedbackMessage.style.marginTop = '15px';
        feedbackMessage.style.borderRadius = '6px';
        feedbackMessage.style.border = '2px solid';
        feedbackMessage.style.fontWeight = '500';
        
        switch(type) {
            case 'success':
                feedbackMessage.style.backgroundColor = '#d4edda';
                feedbackMessage.style.borderColor = '#28a745';
                feedbackMessage.style.color = '#155724';
                break;
            case 'error':
                feedbackMessage.style.backgroundColor = '#f8d7da';
                feedbackMessage.style.borderColor = '#dc3545';
                feedbackMessage.style.color = '#721c24';
                break;
            case 'loading':
                feedbackMessage.style.backgroundColor = '#d1ecf1';
                feedbackMessage.style.borderColor = '#17a2b8';
                feedbackMessage.style.color = '#0c5460';
                break;
            case 'warning':
                feedbackMessage.style.backgroundColor = '#fff3cd';
                feedbackMessage.style.borderColor = '#ffc107';
                feedbackMessage.style.color = '#856404';
                break;
        }
        
        // Agregar animación de spin para loading
        if (type === 'loading') {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            if (!document.querySelector('style[data-spin]')) {
                style.setAttribute('data-spin', 'true');
                document.head.appendChild(style);
            }
        }
        
        if (type !== 'loading') {
            setTimeout(() => {
                feedbackMessage.style.display = 'none';
            }, 5000);
        }
    }

    // Verificar conexión
    async function testConnection() {
        if (passwordInput.value !== ADMIN_PASSWORD) {
            displayFeedback('❌ Contraseña incorrecta para prueba de conexión', 'error');
            return;
        }

        displayFeedback('🔍 Probando conexión con el script...', 'loading');
        testButton.disabled = true;

        try {
            const response = await fetch(APPS_SCRIPT_URL + '?action=ping&t=' + new Date().getTime(), {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                displayFeedback(`✅ Conexión exitosa - ${result.message || 'Script funcionando'}`, 'success');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            displayFeedback(`❌ Error de conexión: ${error.message}`, 'error');
        } finally {
            testButton.disabled = false;
        }
    }

    // Forzar actualización
    async function forceUpdate() {
        if (passwordInput.value !== ADMIN_PASSWORD) {
            displayFeedback('❌ Contraseña incorrecta', 'error');
            return;
        }

        displayFeedback('🔄 Actualizando datos, por favor espera...', 'loading');
        updateButton.disabled = true;

        try {
            const startTime = Date.now();
            
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'update',
                    password: ADMIN_PASSWORD,
                    timestamp: new Date().toISOString()
                })
            });

            const endTime = Date.now();

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseText = await response.text();

            try {
                const result = JSON.parse(responseText);
                
                if (result.status === 'success') {
                    displayFeedback(`✅ Actualización exitosa (${endTime - startTime}ms) - ${result.recordCount || 0} registros procesados`, 'success');
                } else {
                    throw new Error(result.message || 'Error desconocido en el script');
                }
            } catch (parseError) {
                // Si no es JSON válido pero la respuesta parece exitosa
                if (responseText.includes('success') || responseText.includes('actualizado')) {
                    displayFeedback(`✅ Actualización completada (${endTime - startTime}ms)`, 'success');
                } else {
                    displayFeedback(`⚠️ Respuesta inesperada: ${responseText.substring(0, 100)}...`, 'warning');
                }
            }

        } catch (error) {
            displayFeedback(`❌ Error en la actualización: ${error.message}`, 'error');
        } finally {
            updateButton.disabled = false;
        }
    }

    // Diagnóstico completo
    async function runDiagnostics() {
        displayFeedback('🐛 Ejecutando diagnóstico completo...', 'loading');
        debugButton.disabled = true;

        const diagnostics = [];

        try {
            // Información básica
            diagnostics.push(`🕒 Timestamp: ${new Date().toISOString()}`);
            diagnostics.push(`🔧 Script URL: ${APPS_SCRIPT_URL}`);
            diagnostics.push(`🌐 Navegador: ${navigator.userAgent}`);
            
            // Prueba de ping
            try {
                const pingResponse = await fetch(APPS_SCRIPT_URL + '?action=ping&t=' + new Date().getTime());
                diagnostics.push(`📡 Ping al script: ✅ OK (${pingResponse.status})`);
                
                if (pingResponse.ok) {
                    const pingResult = await pingResponse.json();
                    diagnostics.push(`📋 Respuesta ping: ${JSON.stringify(pingResult)}`);
                }
            } catch (pingError) {
                diagnostics.push(`📡 Ping al script: ❌ Error (${pingError.message})`);
            }
            
            // Prueba de datos
            try {
                const dataResponse = await fetch(APPS_SCRIPT_URL + '?action=getData&t=' + new Date().getTime());
                diagnostics.push(`📊 Obtener datos: ✅ OK (${dataResponse.status})`);
                
                if (dataResponse.ok) {
                    const dataResult = await dataResponse.json();
                    diagnostics.push(`📈 Registros disponibles: ${dataResult.recordCount || 0}`);
                    diagnostics.push(`📋 Headers: ${dataResult.headers ? dataResult.headers.join(', ') : 'No disponible'}`);
                }
            } catch (dataError) {
                diagnostics.push(`📊 Obtener datos: ❌ Error (${dataError.message})`);
            }

            displayFeedback('✅ Diagnóstico completado - Ver detalles arriba', 'success');

        } catch (error) {
            diagnostics.push(`❌ Error durante diagnóstico: ${error.message}`);
            displayFeedback(`❌ Error en diagnóstico: ${error.message}`, 'error');
        }

        // Mostrar resultados en un alert (para el admin.js independiente)
        alert(`🐛 DIAGNÓSTICO COMPLETO\n\n${diagnostics.join('\n')}`);

        debugButton.disabled = false;
    }

    // Event Listeners
    if (testButton) testButton.addEventListener('click', testConnection);
    if (updateButton) updateButton.addEventListener('click', forceUpdate);
    if (debugButton) debugButton.addEventListener('click', runDiagnostics);

    // Verificación inicial automática
    setTimeout(() => {
        fetch(APPS_SCRIPT_URL + '?action=ping&t=' + new Date().getTime())
            .then(response => {
                if (response.ok) {
                    console.log('✅ Script online al cargar la página');
                } else {
                    console.log('❌ Script no responde al cargar la página');
                }
            })
            .catch(error => {
                console.log('❌ Error de conexión al cargar:', error.message);
            });
    }, 1000);
});