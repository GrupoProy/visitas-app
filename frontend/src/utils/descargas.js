// utils/descargas.js
export const descargarBlob = (blob, nombreArchivo) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};



export const descargarArchivo = async (urlCompleta, params, nombreArchivo) => {
  // Obtener el token actual
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No hay sesión activa');
  }

  // Construir query string
  const queryString = new URLSearchParams(
    Object.entries(params || {}).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    )
  ).toString();

  const url = `${urlCompleta}${queryString ? `?${queryString}` : ''}`;

  // Hacer la request
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  // Verificar status
  if (!response.ok) {
    // Intentar leer el mensaje de error
    let mensaje = `Error ${response.status}`;
    try {
      const data = await response.json();
      mensaje = data.message || mensaje;
    } catch {
      // No era JSON, dejamos el mensaje genérico
    }
    throw new Error(mensaje);
  }

  // Obtener el blob
  const blob = await response.blob();

  // Verificar que no esté vacío
  if (blob.size === 0) {
    throw new Error('El archivo recibido está vacío');
  }

  // Descargar
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);

  return { tamaño: blob.size, tipo: blob.type };
};