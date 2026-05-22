<?php
declare(strict_types=1);

$_SERVER['REQUEST_METHOD'] = $argv[1] ?? 'GET';
$_SERVER['REQUEST_URI'] = $argv[2] ?? '/api/market/GME/summary';

$query = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
if ($query) {
    parse_str($query, $_GET);
}

include __DIR__ . '/../apache-php/api/index.php';
