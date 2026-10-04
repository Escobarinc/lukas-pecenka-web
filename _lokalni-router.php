<?php
/* Jen pro lokální náhled (server.py): vypne ukládání do mezipaměti a nevypisuje obsah složek.
   Na WEDOS se nepoužívá (Apache + .htaccess). */
$cesta = __DIR__ . urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
header('Cache-Control: no-store, must-revalidate');
if (is_dir($cesta) && !is_file(rtrim($cesta, '/') . '/index.php') && !is_file(rtrim($cesta, '/') . '/index.html')) { http_response_code(404); echo 'Nenalezeno'; return true; }
return false;
