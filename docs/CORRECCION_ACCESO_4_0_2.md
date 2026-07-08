# Corrección 4.0.2 — acceso web de un solo uso

El código temporal ya no se transporta en una URL GET. Se entrega en el fragmento `#desktopCode=...`, que no se envía al servidor ni a escáneres de enlaces, y el navegador lo canjea mediante POST. Esto evita que SmartScreen, antivirus, prefetch o verificadores consuman el código antes de la navegación real.
