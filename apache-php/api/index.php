<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const DATA_FILE = __DIR__ . '/data/app-data.json';
const STATE_FILE = __DIR__ . '/data/user-state.json';

function json_response($payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_file(string $path, array $fallback = []): array
{
    if (!file_exists($path)) {
        return $fallback;
    }
    $raw = file_get_contents($path);
    if ($raw === false || trim($raw) === '') {
        return $fallback;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $fallback;
}

function write_json_file(string $path, array $data): void
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    file_put_contents(
        $path,
        json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
        LOCK_EX
    );
}

function app_data(): array
{
    $data = read_json_file(DATA_FILE);
    if (!$data) {
        json_response(['detail' => 'Apache/PHP data file is missing. Run scripts/build_apache_php.bat first.'], 500);
    }
    return $data;
}

function user_state(array $data): array
{
    $state = read_json_file(STATE_FILE);
    if (!$state) {
        $state = [
            'watchlists' => $data['watchlists'] ?? [],
            'scenario_runs' => [],
        ];
        write_json_file(STATE_FILE, $state);
    }
    return $state;
}

function save_state(array $state): void
{
    write_json_file(STATE_FILE, $state);
}

function request_path(): array
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $pos = strpos($path, '/api');
    if ($pos !== false) {
        $path = substr($path, $pos + 4);
    }
    $path = trim($path, '/');
    $parts = $path === '' ? [] : explode('/', $path);
    if (($parts[0] ?? '') === 'index.php') {
        array_shift($parts);
    }
    return $parts;
}

function body_json(): array
{
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '{}', true);
    return is_array($payload) ? $payload : [];
}

function ticker_filter(array $rows, string $ticker): array
{
    return array_values(array_filter($rows, fn($row) => strtoupper((string)($row['ticker'] ?? '')) === strtoupper($ticker)));
}

function date_key(?string $value): string
{
    return substr((string)$value, 0, 10);
}

function latest_by(array $rows, string $field): ?array
{
    usort($rows, fn($a, $b) => strcmp((string)($b[$field] ?? ''), (string)($a[$field] ?? '')));
    return $rows[0] ?? null;
}

function timeseries_tail(array $rows, int $days, string $field): array
{
    usort($rows, fn($a, $b) => strcmp((string)($a[$field] ?? ''), (string)($b[$field] ?? '')));
    return array_slice($rows, max(0, count($rows) - $days));
}

function as_float($value): ?float
{
    return $value === null ? null : (float)$value;
}

function as_int($value): ?int
{
    return $value === null ? null : (int)$value;
}

function market_summary(array $data, string $ticker): array
{
    $ticks = ticker_filter($data['market_ticks'] ?? [], $ticker);
    $signals = ticker_filter($data['aggregated_signals'] ?? [], $ticker);
    $alerts = ticker_filter($data['alerts'] ?? [], $ticker);
    $tick = latest_by($ticks, 'timestamp');
    $signal = latest_by($signals, 'window_start');
    $alert = latest_by($alerts, 'alert_time');

    return [
        'ticker' => strtoupper($ticker),
        'current_price' => $tick ? as_float($tick['close_price']) : null,
        'price_change_pct' => $signal ? ((float)$signal['price_return']) * 100 : null,
        'volume' => $tick ? as_int($tick['volume']) : null,
        'social_volume' => $signal ? (int)$signal['post_count'] : 0,
        'risk_score' => $signal ? (float)$signal['risk_score_pre_ml'] : 0.0,
        'risk_level' => $alert['risk_level'] ?? 'Normal',
        'bullish_ratio' => $signal ? (float)$signal['bullish_ratio'] : 0.0,
        'bearish_ratio' => $signal ? (float)$signal['bearish_ratio'] : 0.0,
        'avg_hype_score' => $signal ? (float)$signal['avg_hype_score'] : 0.0,
        'mention_growth_rate' => $signal ? (float)$signal['mention_growth_rate'] : 0.0,
    ];
}

function market_timeseries(array $data, string $ticker, int $days): array
{
    $ticks = timeseries_tail(ticker_filter($data['market_ticks'] ?? [], $ticker), $days, 'timestamp');
    $signals = ticker_filter($data['aggregated_signals'] ?? [], $ticker);
    $signal_map = [];
    foreach ($signals as $signal) {
        $signal_map[date_key($signal['window_start'] ?? '')] = $signal;
    }

    return array_map(function ($tick) use ($signal_map) {
        $date = date_key($tick['timestamp'] ?? '');
        $sig = $signal_map[$date] ?? null;
        return [
            'date' => $tick['timestamp'],
            'open' => as_float($tick['open_price']),
            'high' => as_float($tick['high_price']),
            'low' => as_float($tick['low_price']),
            'close' => as_float($tick['close_price']),
            'volume' => as_int($tick['volume']),
            'post_count' => $sig ? (int)$sig['post_count'] : 0,
            'bullish_ratio' => $sig ? (float)$sig['bullish_ratio'] : 0.0,
            'avg_hype_score' => $sig ? (float)$sig['avg_hype_score'] : 0.0,
            'risk_score' => $sig ? (float)$sig['risk_score_pre_ml'] : 0.0,
            'mention_growth_rate' => $sig ? (float)$sig['mention_growth_rate'] : 0.0,
        ];
    }, $ticks);
}

function market_drivers(array $data, string $ticker): array
{
    $signal = latest_by(ticker_filter($data['aggregated_signals'] ?? [], $ticker), 'window_start');
    if (!$signal) {
        return ['drivers' => [], 'ticker' => strtoupper($ticker), 'risk_score' => 0.0];
    }
    $drivers = [];
    if ((float)$signal['mention_growth_rate'] > 1.0) {
        $drivers[] = ['factor' => 'Social mention surge', 'value' => sprintf('+%.1fx', $signal['mention_growth_rate']), 'impact' => 'high'];
    }
    if ((float)$signal['avg_hype_score'] > 0.6) {
        $drivers[] = ['factor' => 'High average hype score', 'value' => sprintf('%.2f', $signal['avg_hype_score']), 'impact' => 'high'];
    }
    if ((float)$signal['bullish_ratio'] > 0.65) {
        $drivers[] = ['factor' => 'Bullish sentiment dominant', 'value' => sprintf('%.0f%%', ((float)$signal['bullish_ratio']) * 100), 'impact' => 'medium'];
    }
    if ((float)$signal['abnormal_volume_score'] > 1.5) {
        $drivers[] = ['factor' => 'Abnormal trading volume', 'value' => sprintf('%.1fσ', $signal['abnormal_volume_score']), 'impact' => 'high'];
    }
    if ((float)$signal['volatility_score'] > 1.5) {
        $drivers[] = ['factor' => 'High price volatility', 'value' => sprintf('%.1fσ', $signal['volatility_score']), 'impact' => 'medium'];
    }
    if ((float)$signal['coordination_ratio'] > 0.1) {
        $drivers[] = ['factor' => 'Coordinated post ratio rising', 'value' => sprintf('%.0f%%', ((float)$signal['coordination_ratio']) * 100), 'impact' => 'medium'];
    }
    if ((int)$signal['influencer_post_count'] > 3) {
        $drivers[] = ['factor' => 'Influencer activity spike', 'value' => $signal['influencer_post_count'] . ' posts', 'impact' => 'high'];
    }
    return ['drivers' => $drivers, 'ticker' => strtoupper($ticker), 'risk_score' => (float)$signal['risk_score_pre_ml']];
}

function recent_posts(array $data, string $ticker, int $limit): array
{
    $posts = ticker_filter($data['posts'] ?? [], $ticker);
    usort($posts, fn($a, $b) => strcmp((string)$b['post_time'], (string)$a['post_time']));
    $posts = array_slice($posts, 0, $limit);
    return array_map(fn($post) => [
        'post_id' => $post['post_id'],
        'platform' => $post['platform'],
        'author_id' => $post['author_id'],
        'author_type' => $post['author_type'],
        'content' => substr((string)$post['content'], 0, 300),
        'post_time' => $post['post_time'],
        'likes' => (int)$post['likes'],
        'stance' => $post['stance'] ?? 'neutral',
        'hype_score' => (float)($post['hype_score'] ?? 0),
        'post_type' => $post['post_type'] ?? 'opinion',
    ], $posts);
}

function replay_payload(array $data, string $ticker): array
{
    $signals = timeseries_tail(ticker_filter($data['aggregated_signals'] ?? [], $ticker), 120, 'window_start');
    $ticks = ticker_filter($data['market_ticks'] ?? [], $ticker);
    $tick_map = [];
    foreach ($ticks as $tick) {
        $tick_map[date_key($tick['timestamp'] ?? '')] = $tick;
    }

    $timeline = array_map(function ($signal) use ($tick_map) {
        $date = date_key($signal['window_start'] ?? '');
        $tick = $tick_map[$date] ?? null;
        return [
            'date' => $signal['window_start'],
            'post_count' => (int)$signal['post_count'],
            'bullish_ratio' => (float)$signal['bullish_ratio'],
            'avg_hype_score' => (float)$signal['avg_hype_score'],
            'mention_growth_rate' => (float)$signal['mention_growth_rate'],
            'risk_score' => (float)$signal['risk_score_pre_ml'],
            'close_price' => $tick ? as_float($tick['close_price']) : null,
            'volume' => $tick ? as_int($tick['volume']) : null,
            'volatility' => $tick ? as_float($tick['volatility']) : null,
        ];
    }, $signals);

    return [
        'ticker' => strtoupper($ticker),
        'timeline' => $timeline,
        'events' => replay_events($data, $ticker),
    ];
}

function replay_events(array $data, string $ticker): array
{
    $events = ticker_filter($data['replay_events'] ?? [], $ticker);
    usort($events, fn($a, $b) => strcmp((string)$a['event_time'], (string)$b['event_time']));
    return array_map(fn($event) => [
        'event_id' => $event['event_id'],
        'event_time' => $event['event_time'],
        'event_type' => $event['event_type'],
        'title' => $event['title'],
        'description' => $event['description'],
        'source_type' => $event['source_type'],
    ], $events);
}

function posts_by_date(array $data, string $ticker, string $date): array
{
    $posts = array_values(array_filter(ticker_filter($data['posts'] ?? [], $ticker), fn($post) => date_key($post['post_time'] ?? '') === $date));
    return array_map(fn($post) => [
        'post_id' => $post['post_id'],
        'platform' => $post['platform'],
        'author_id' => $post['author_id'],
        'author_type' => $post['author_type'] ?? 'retail',
        'content' => substr((string)$post['content'], 0, 400),
        'post_time' => $post['post_time'],
        'likes' => (int)$post['likes'],
        'stance' => $post['stance'] ?? 'neutral',
        'hype_score' => (float)($post['hype_score'] ?? 0),
        'post_type' => $post['post_type'] ?? 'opinion',
    ], $posts);
}

function alerts_payload(array $data, array $state, string $user_id): array
{
    $watchlists = array_values(array_filter($state['watchlists'] ?? [], fn($w) => ($w['user_id'] ?? '') === $user_id));
    $tickers = array_map(fn($w) => strtoupper((string)$w['ticker']), $watchlists);
    $alerts = array_values(array_filter($data['alerts'] ?? [], fn($a) => in_array(strtoupper((string)$a['ticker']), $tickers, true)));
    usort($alerts, fn($a, $b) => strcmp((string)$b['alert_time'], (string)$a['alert_time']));

    return [
        'alerts' => array_map(fn($a) => [
            'alert_id' => $a['alert_id'],
            'ticker' => $a['ticker'],
            'alert_time' => $a['alert_time'],
            'risk_level' => $a['risk_level'],
            'rule_score' => (float)$a['rule_score'],
            'ml_score' => (float)$a['ml_score'],
            'final_score' => (float)$a['final_score'],
            'trigger_summary' => $a['trigger_summary'],
            'explanation' => $a['explanation'],
            'status' => $a['status'],
        ], $alerts),
        'watchlist' => array_map(fn($w) => [
            'watchlist_id' => $w['watchlist_id'],
            'ticker' => $w['ticker'],
            'created_at' => $w['created_at'],
        ], $watchlists),
    ];
}

function evaluate_scenario(array $body): array
{
    $score = 0.0;
    $drivers = [];
    $mention_growth = (float)($body['mention_growth'] ?? 1);
    $bullish_ratio = (float)($body['bullish_ratio'] ?? 0.5);
    $hype_score = (float)($body['hype_score'] ?? 0.3);
    $short_interest = (float)($body['short_interest'] ?? 0.1);
    $influencer_posts = (int)($body['influencer_posts'] ?? 0);
    $trading_restricted = (bool)($body['trading_restricted'] ?? false);
    $options_high = (bool)($body['options_activity_high'] ?? false);

    if ($mention_growth > 3.0) {
        $score += 2;
        $drivers[] = ['factor' => 'Social mention surge', 'points' => 2, 'value' => sprintf('%.1fx', $mention_growth)];
    } elseif ($mention_growth > 1.5) {
        $score += 1;
        $drivers[] = ['factor' => 'Social mentions rising', 'points' => 1, 'value' => sprintf('%.1fx', $mention_growth)];
    }
    if ($hype_score > 0.75) {
        $score += 2;
        $drivers[] = ['factor' => 'High avg hype score', 'points' => 2, 'value' => sprintf('%.2f', $hype_score)];
    } elseif ($hype_score > 0.5) {
        $score += 1;
        $drivers[] = ['factor' => 'Moderate-high hype score', 'points' => 1, 'value' => sprintf('%.2f', $hype_score)];
    }
    if ($bullish_ratio > 0.70) {
        $score += 1;
        $drivers[] = ['factor' => 'Bullish sentiment dominant', 'points' => 1, 'value' => sprintf('%.0f%%', $bullish_ratio * 100)];
    }
    if ($short_interest * 5 > 2.0) {
        $score += 2;
        $drivers[] = ['factor' => 'Abnormal trading volume', 'points' => 2, 'value' => sprintf('%.1fσ', $short_interest * 5)];
    }
    if ($mention_growth * 0.5 > 2.0) {
        $score += 2;
        $drivers[] = ['factor' => 'Extreme price volatility', 'points' => 2, 'value' => sprintf('%.1fσ', $mention_growth * 0.5)];
    }
    if ($influencer_posts > 5) {
        $score += 1;
        $drivers[] = ['factor' => 'Heavy influencer activity', 'points' => 1, 'value' => $influencer_posts . ' posts'];
    }
    if ($trading_restricted) {
        $score += 1;
        $drivers[] = ['factor' => 'Trading restrictions activated (amplifying effect)', 'points' => 1, 'value' => 'Active'];
    }
    if ($options_high) {
        $score += 1;
        $drivers[] = ['factor' => 'Abnormal options activity', 'points' => 1, 'value' => 'High'];
    }
    if ($short_interest > 0.5) {
        $score += 1;
        $drivers[] = ['factor' => 'High short interest', 'points' => 1, 'value' => sprintf('%.0f%%', $short_interest * 100)];
    }

    $label = $score >= 7 ? 'ReversalRisk' : ($score >= 5 ? 'SqueezeRisk' : ($score >= 3 ? 'HeatingUp' : 'Normal'));
    $explanations = [
        'Normal' => 'Current social and market signals are within normal range. No significant anomalous trading behavior detected.',
        'HeatingUp' => 'Social activity is starting to heat up. Mentions and bullish sentiment are rising; continued monitoring recommended.',
        'SqueezeRisk' => 'WARNING: Social-driven squeeze risk elevated! Social mentions surging, hype scores high, and abnormal volume detected. Extreme short-term price swings possible.',
        'ReversalRisk' => 'CRITICAL RISK: Multiple indicators simultaneously at historic highs, closely resembling the GameStop January 2021 event. Extreme volatility followed by high-probability price reversal.',
    ];

    return ['score' => $score, 'label' => $label, 'drivers' => $drivers, 'explanation' => $explanations[$label]];
}

$data = app_data();
$state = user_state($data);
$parts = request_path();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if (($parts[0] ?? '') === 'market' && count($parts) >= 3) {
        $ticker = $parts[1];
        if ($method === 'GET' && $parts[2] === 'summary') json_response(market_summary($data, $ticker));
        if ($method === 'GET' && $parts[2] === 'timeseries') json_response(market_timeseries($data, $ticker, max(1, (int)($_GET['days'] ?? 30))));
        if ($method === 'GET' && $parts[2] === 'drivers') json_response(market_drivers($data, $ticker));
        if ($method === 'GET' && $parts[2] === 'posts') json_response(recent_posts($data, $ticker, max(1, (int)($_GET['limit'] ?? 20))));
    }

    if (($parts[0] ?? '') === 'replay' && isset($parts[1])) {
        $ticker = $parts[1];
        if ($method === 'GET' && count($parts) === 2) json_response(replay_payload($data, $ticker));
        if ($method === 'GET' && ($parts[2] ?? '') === 'events') json_response(replay_events($data, $ticker));
        if ($method === 'GET' && ($parts[2] ?? '') === 'posts') json_response(posts_by_date($data, $ticker, (string)($_GET['date'] ?? '')));
    }

    if (($parts[0] ?? '') === 'alerts') {
        if ($method === 'GET' && count($parts) === 1) json_response(alerts_payload($data, $state, (string)($_GET['user_id'] ?? 'anonymous')));
        if ($method === 'GET' && ($parts[1] ?? '') === 'history') json_response(ticker_filter($data['alerts'] ?? [], (string)($_GET['ticker'] ?? 'GME')));
        if ($method === 'POST' && ($parts[1] ?? '') === 'watchlist') {
            $body = body_json();
            $item = [
                'watchlist_id' => bin2hex(random_bytes(16)),
                'user_id' => (string)($body['user_id'] ?? 'anonymous'),
                'ticker' => strtoupper((string)($body['ticker'] ?? 'GME')),
                'threshold_config_json' => $body['threshold_config'] ?? [],
                'created_at' => gmdate('c'),
            ];
            $state['watchlists'][] = $item;
            save_state($state);
            json_response(['watchlist_id' => $item['watchlist_id'], 'ticker' => $item['ticker'], 'message' => 'Added to watchlist']);
        }
        if ($method === 'DELETE' && ($parts[1] ?? '') === 'watchlist' && isset($parts[2])) {
            $before = count($state['watchlists'] ?? []);
            $state['watchlists'] = array_values(array_filter($state['watchlists'] ?? [], fn($w) => $w['watchlist_id'] !== $parts[2]));
            save_state($state);
            json_response(['message' => $before === count($state['watchlists']) ? 'Watchlist item not found' : 'Removed from watchlist']);
        }
    }

    if (($parts[0] ?? '') === 'scenario') {
        if ($method === 'POST' && ($parts[1] ?? '') === 'run') {
            $body = body_json();
            $result = evaluate_scenario($body);
            $run = [
                'run_id' => bin2hex(random_bytes(16)),
                'user_id' => (string)($body['user_id'] ?? 'anonymous'),
                'ticker' => strtoupper((string)($body['ticker'] ?? 'GME')),
                'input_params' => $body,
                'output_score' => $result['score'],
                'output_label' => $result['label'],
                'output_explanation' => $result['explanation'],
                'created_at' => gmdate('c'),
            ];
            array_unshift($state['scenario_runs'], $run);
            $state['scenario_runs'] = array_slice($state['scenario_runs'], 0, 50);
            save_state($state);
            json_response([
                'run_id' => $run['run_id'],
                'ticker' => $run['ticker'],
                'risk_score' => $result['score'],
                'label' => $result['label'],
                'explanation' => $result['explanation'],
                'drivers' => $result['drivers'],
                'rule_score' => $result['score'],
            ]);
        }
        if ($method === 'GET' && ($parts[1] ?? '') === 'history') {
            $user_id = (string)($_GET['user_id'] ?? 'anonymous');
            $runs = array_values(array_filter($state['scenario_runs'] ?? [], fn($r) => ($r['user_id'] ?? '') === $user_id));
            json_response($runs);
        }
    }

    json_response(['detail' => 'Not found', 'path' => implode('/', $parts)], 404);
} catch (Throwable $e) {
    json_response(['detail' => $e->getMessage()], 500);
}
