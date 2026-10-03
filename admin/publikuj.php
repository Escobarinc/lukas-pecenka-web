<?php
/* Z příkazové řádky: php admin/publikuj.php  → znovu vytvoří stránky článků, Pomoc a rady, reference, sitemap a llms.txt z dat v _soukrome/data */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/jadro.php';
print_r(publikujClanky());
print_r(publikujReference());
