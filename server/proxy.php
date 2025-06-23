<?php

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  die("Method Not Allowed");
}

if (!(isset($_POST["url"]) && isset($_POST["method"]) && isset($_POST["SSL-Verification"]))) {
  http_response_code(400);
  die("Bad Request");
}

header("Content-Type: application/json");

$ssl_verification = $_POST["SSL-Verification"];
$url = $_POST["url"];
$method = $_POST["method"];
$body = $_POST["body"] ?? [];
$headers = $_POST["headers"] ?? [];

$cookie_key = "set-cookie: ";
$php_headers = [];
$export = [];
$response_cookies = [];
$http_status = require "HttpStatus.php";
$rhttp = "/HTTP\/\d.*?\s(\d{3})/";
$statusText = "";

// JSON headers to PHP headers Convertation
foreach($headers as $key => $value) array_push($php_headers, "{$key}: {$value}");

// $_FILES to CURLFILE Convertation
foreach($_FILES as $name => $file) {
  foreach($file["name"] as $key => $filename) {
    $curl_file = new CURLFile($file["tmp_name"][$key], $file["type"][$key], $filename);
    $body[$name."[{$key}]"] = $curl_file;
  }
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, $ssl_verification);
curl_setopt($ch, CURLOPT_HEADER, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
curl_setopt($ch, CURLOPT_HTTPHEADER, $php_headers);
curl_setopt($ch, CURLOPT_USERAGENT, $_SERVER["HTTP_USER_AGENT"]);
curl_setopt($ch, CURLOPT_REFERER, $url);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);

if(curl_errno($ch)) {
  $export["error"] = curl_error($ch);
  die(json_encode($export));
}

curl_close($ch);

$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = preg_split("/\r?\n/", substr($response, 0, $header_size));
$export["response"] = substr($response, $header_size);
$export["bytes"] = strlen($response);
$export["time"] = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
$export["ct"] = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$effectiveUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
$export["domain"] = parse_url($effectiveUrl, PHP_URL_HOST);

foreach($headers as $i => $header) {
  if (preg_match($rhttp, $header, $matches)) {
    if (!isset($http_status[$status])) $statusText = $matches[2];
    unset($headers[$i]);
  } else if (($cookie = substr($header, 0, strlen($cookie_key))) && strtolower($cookie) === $cookie_key) {
    array_push($response_cookies, substr($header, strlen($cookie)));
  } else if (empty($header)) unset($headers[$i]);
}

$export["cookies"] = $response_cookies;
$export["headers"] = implode("\r\n", $headers);

if (empty($statusText)) ($statusText = $http_status[$status] ?? "Unknown");
$export["statusText"] = $statusText;
$export["status"] = $status;

die(json_encode($export));
?>