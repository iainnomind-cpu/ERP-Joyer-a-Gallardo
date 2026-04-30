# Instrucciones para Configurar el Sistema POS

## Problema Detectado

El módulo de ventas muestra el error "No hay terminales disponibles" porque las tablas del sistema POS no están creadas en tu base de datos de Supabase.

## Solución

Necesitas ejecutar el script SQL que creará todas las tablas necesarias para el sistema POS.

## Pasos a Seguir

### 1. Abre tu Proyecto de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto

### 2. Accede al SQL Editor

1. En el menú lateral izquierdo, busca y haz clic en **"SQL Editor"**
2. Haz clic en el botón **"New query"** para crear una nueva consulta

### 3. Ejecuta el Script de Configuración

1. Abre el archivo `setup_pos_terminals.sql` que se encuentra en la raíz del proyecto
2. Copia **TODO** el contenido del archivo
3. Pégalo en el editor SQL de Supabase
4. Haz clic en el botón **"Run"** (o presiona Ctrl/Cmd + Enter)

### 4. Verifica que Todo Funcionó

Deberías ver mensajes de confirmación en la consola:

```
✓ Tablas del sistema POS creadas exitosamente
✓ 3 terminales agregadas: Almacén, Local GJ y Local 2
✓ 5 métodos de pago configurados
✓ Sistema POS listo para usar
```

### 5. Recarga tu Aplicación

1. Regresa a tu aplicación
2. Recarga la página (F5 o Ctrl/Cmd + R)
3. Ve al módulo de Ventas
4. Haz clic en **"POS Físico"**
5. Ahora deberías ver las opciones para seleccionar una terminal y abrir sesión

## Tablas Creadas

El script crea las siguientes tablas:

- **pos_terminals**: Terminales de punto de venta
- **pos_sessions**: Sesiones de caja (apertura/cierre)
- **pos_transactions**: Transacciones realizadas
- **payment_methods**: Métodos de pago disponibles
- **payment_links**: Enlaces de pago para ventas remotas

## Terminales Predeterminadas

El script agrega automáticamente tres terminales:

1. **CAJA-01** - Almacén (Almacén Principal)
2. **CAJA-02** - Local GJ (Local Gallardo Joyas)
3. **CAJA-03** - Local 2 (Local Secundario)

## Métodos de Pago Configurados

- Efectivo
- Tarjeta (2.5% comisión)
- Transferencia
- Mercado Pago (3.49% comisión)
- PayPal (4.2% comisión)

## ¿Necesitas Ayuda?

Si encuentras algún error durante la ejecución del script:

1. Verifica que estés usando la cuenta correcta de Supabase
2. Asegúrate de tener permisos de administrador en el proyecto
3. Revisa que las variables de entorno en `.env` sean correctas

## Próximos Pasos

Una vez configurado el sistema POS, podrás:

- Abrir sesiones de caja con efectivo de apertura
- Realizar ventas directas en POS
- Procesar pagos con diferentes métodos
- Cerrar caja con arqueo automático
- Ver reportes de transacciones por sesión
