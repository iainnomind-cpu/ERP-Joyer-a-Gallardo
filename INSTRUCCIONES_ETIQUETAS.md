# Sistema de Impresión de Etiquetas - Brother QL-800

## Características Implementadas

El módulo de inventario ahora incluye un sistema completo de generación e impresión de etiquetas optimizado para la impresora Brother QL-800.

### Especificaciones Técnicas

- **Impresora**: Brother QL-800
- **Ancho máximo**: 58mm (área imprimible real)
- **Resolución**: 300x600 dpi
- **Formato**: Etiquetas de rollo continuo Brother DK
- **Tamaños disponibles**:
  - 62mm x 29mm (Pequeña)
  - 62mm x 39mm (Mediana)
  - 62mm x 50mm (Grande)

## Cómo Usar

### 1. Acceder al Sistema de Etiquetas

1. Ve al módulo de **Inventario**
2. Localiza el producto deseado en la tabla
3. Haz clic en el icono de impresora (verde) en la columna de Acciones

### 2. Configurar la Etiqueta

En el modal que aparece podrás configurar:

#### Tamaño de Etiqueta
- Selecciona el tamaño de etiqueta que estás usando (62x29mm, 62x39mm o 62x50mm)

#### Cantidad de Copias
- Define cuántas etiquetas idénticas deseas imprimir (1-100)

#### Elementos a Mostrar
Activa o desactiva cada elemento según necesites:
- **Nombre del Producto**: Texto grande y en negrita
- **Código SKU**: Código único del producto
- **Material**: Plata Pura o Baño de Oro
- **Precio**: Puedes mostrar:
  - Solo precio de menudeo
  - Solo precio de mayoreo
  - Ambos precios lado a lado
- **Código de Barras**: Representación visual del SKU

### 3. Vista Previa

- El panel derecho muestra una vista previa en tiempo real
- Los cambios en la configuración se reflejan inmediatamente
- La vista previa muestra el tamaño aproximado de la etiqueta

### 4. Imprimir

1. Una vez configurada la etiqueta, haz clic en **"Imprimir"**
2. Se abrirá una nueva ventana con todas las etiquetas generadas
3. El diálogo de impresión del navegador se abrirá automáticamente
4. Selecciona tu impresora Brother QL-800
5. Verifica que los ajustes de página coincidan con el tamaño seleccionado
6. Haz clic en Imprimir

## Características Avanzadas

### Impresión por Lotes
- Si seleccionas múltiples copias (ej: 10), todas las etiquetas se generarán en una sola página
- Esto permite imprimir todas las etiquetas de una vez sin interrupciones

### Diseño Adaptativo
- El diseño se ajusta automáticamente según los elementos activos
- Si desactivas elementos, el espacio se redistribuye automáticamente
- El código de barras siempre se posiciona al final de la etiqueta

### Historial de Impresión
- Cada impresión se registra automáticamente en la base de datos
- Se guarda: producto, SKU, cantidad, tamaño y fecha de impresión
- Útil para auditorías y control de inventario

## Estilos CSS Implementados

El sistema usa estilos CSS optimizados para impresión:

```css
@page {
  size: 62mm 29mm;  /* Tamaño exacto de la etiqueta */
  margin: 0;         /* Sin márgenes */
}

body {
  margin: 0;
  padding: 2mm;      /* Padding interno de 2mm */
  font-family: Arial;
}
```

### Tamaños de Fuente
- **Nombre del producto**: 11pt bold
- **Precio principal**: 13pt bold
- **Precio secundario**: 10pt
- **SKU**: 8pt
- **Material**: 8pt italic
- **Código de barras texto**: 7pt Courier New

## Código de Barras

El sistema genera códigos de barras simulados usando líneas verticales basadas en el SKU:
- Altura variable según el carácter (20-30px)
- Ancho de barra: 2-3px alternado
- Incluye texto legible debajo del código de barras

## Solución de Problemas

### La etiqueta no se imprime del tamaño correcto
- Verifica que el tamaño seleccionado coincida con las etiquetas en el rollo
- Asegúrate de que los ajustes de escala en el diálogo de impresión estén en 100%

### El código de barras no se ve bien
- Los códigos de barras son simulados para visualización
- Para códigos de barras escaneables, se recomienda usar una librería como JsBarcode

### La vista previa no coincide con la impresión
- La vista previa es aproximada debido a diferencias de renderizado
- Los tamaños reales serán correctos al imprimir

### Múltiples copias no se imprimen
- Verifica que tu navegador permita ventanas emergentes
- Algunas configuraciones de seguridad pueden bloquear window.open()

## Recomendaciones

1. **Usa etiquetas continuas**: El diseño está optimizado para rollos continuos DK
2. **Prueba primero**: Imprime una etiqueta de prueba antes de hacer múltiples copias
3. **Mantén actualizado**: El sistema registra cada impresión para control de inventario
4. **Personaliza según necesites**: Los checkboxes permiten adaptarse a diferentes escenarios

## Próximas Mejoras (Opcionales)

- Integración con librería JsBarcode para códigos de barras reales escaneables
- Plantillas predefinidas guardables
- Impresión directa sin diálogo (requiere drivers especiales)
- Soporte para etiquetas con imágenes de productos
